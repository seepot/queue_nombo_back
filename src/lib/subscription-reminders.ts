import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { sendMail } from "@/lib/mailer";
import {
  GRACE_DAYS,
  RENEWAL_WARNING_DAYS,
  TRIAL_WARNING_DAYS,
  getSubscriptionState,
  type SubscriptionState,
} from "@/lib/subscription";

/**
 * Peringatan e-mel langganan (dipanggil oleh cron harian).
 *  - TRIAL_ENDING : percubaan tamat dalam <= 3 hari
 *  - RENEWAL_DUE  : langganan berbayar tamat dalam <= 7 hari
 *  - PAST_DUE     : dalam tempoh ihsan selepas tamat
 *  - EXPIRED      : perkhidmatan disekat
 * Setiap jenis dihantar sekali bagi setiap langganan dalam tempoh dedupe (Redis SET NX).
 */
export type ReminderKind = "TRIAL_ENDING" | "RENEWAL_DUE" | "PAST_DUE" | "EXPIRED";

const DEDUPE_TTL_SEC: Record<ReminderKind, number> = {
  TRIAL_ENDING: 7 * 24 * 3600,
  RENEWAL_DUE: 7 * 24 * 3600,
  PAST_DUE: 3 * 24 * 3600,
  EXPIRED: 30 * 24 * 3600,
};

export interface ReminderSummary {
  scanned: number;
  attempted: number;
  delivered: number;
  skipped: number;
  byKind: Record<ReminderKind, number>;
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function pickKind(state: SubscriptionState): ReminderKind | null {
  switch (state.status) {
    case "TRIAL":
      return state.daysLeft !== null && state.daysLeft <= TRIAL_WARNING_DAYS ? "TRIAL_ENDING" : null;
    case "ACTIVE":
      return state.daysLeft !== null && state.daysLeft <= RENEWAL_WARNING_DAYS ? "RENEWAL_DUE" : null;
    case "PAST_DUE":
      return "PAST_DUE";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return null;
  }
}

function buildMessage(kind: ReminderKind, tenantName: string, state: SubscriptionState) {
  const billingUrl = `${appUrl()}/langganan`;
  const days = Math.max(0, state.daysLeft ?? 0);
  const grace = Math.max(0, state.graceDaysLeft ?? 0);

  const copy: Record<ReminderKind, { subject: string; heading: string; body: string }> = {
    TRIAL_ENDING: {
      subject: `Percubaan QueNombo anda tamat dalam ${days} hari`,
      heading: "Percubaan percuma hampir tamat",
      body: `Tempoh percubaan percuma untuk ${tenantName} akan tamat dalam ${days} hari. Langgan pelan sekarang supaya kiosk, terminal kaunter dan paparan TV anda tidak terhenti.`,
    },
    RENEWAL_DUE: {
      subject: `Langganan QueNombo ${tenantName} perlu diperbaharui dalam ${days} hari`,
      heading: "Masa untuk memperbaharui langganan",
      body: `Langganan pelan ${state.planType} untuk ${tenantName} akan tamat dalam ${days} hari. Perbaharui sekarang untuk mengelakkan gangguan perkhidmatan.`,
    },
    PAST_DUE: {
      subject: `Tindakan diperlukan: langganan QueNombo ${tenantName} telah tamat`,
      heading: "Langganan anda telah tamat",
      body: `Pembayaran belum diterima. Perkhidmatan ${tenantName} masih berjalan dalam tempoh ihsan ${GRACE_DAYS} hari dan akan disekat dalam ${grace} hari lagi.`,
    },
    EXPIRED: {
      subject: `Perkhidmatan QueNombo ${tenantName} telah disekat`,
      heading: "Perkhidmatan disekat",
      body: `Langganan ${tenantName} telah tamat dan kiosk, terminal serta paparan TV kini tidak aktif. Langgan semula untuk mengaktifkan perkhidmatan serta-merta.`,
    },
  };

  const c = copy[kind];
  return {
    subject: c.subject,
    text: `${c.heading}\n\n${c.body}\n\nUrus langganan: ${billingUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
        <h2 style="color:#1e3a8a;margin-top:0">${c.heading}</h2>
        <p>${c.body}</p>
        <p style="margin:24px 0">
          <a href="${billingUrl}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Urus Langganan</a>
        </p>
        <p style="color:#94a3b8;font-size:12px">E-mel automatik daripada QueNombo.</p>
      </div>`,
  };
}

export async function sendSubscriptionReminders(): Promise<ReminderSummary> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - (GRACE_DAYS + 1) * 24 * 3600 * 1000);
  const windowEnd = new Date(now.getTime() + RENEWAL_WARNING_DAYS * 24 * 3600 * 1000);

  const candidates = await prisma.subscription.findMany({
    where: {
      status: { in: ["TRIAL", "ACTIVE", "PAST_DUE", "EXPIRED"] },
      endDate: { gte: windowStart, lte: windowEnd },
    },
    select: {
      id: true,
      tenantId: true,
      tenant: { select: { name: true, email: true, status: true } },
    },
  });

  const summary: ReminderSummary = {
    scanned: candidates.length,
    attempted: 0,
    delivered: 0,
    skipped: 0,
    byKind: { TRIAL_ENDING: 0, RENEWAL_DUE: 0, PAST_DUE: 0, EXPIRED: 0 },
  };

  for (const sub of candidates) {
    if (!sub.tenant?.email || sub.tenant.status !== "ACTIVE") {
      summary.skipped++;
      continue;
    }

    const state = await getSubscriptionState(sub.tenantId, { skipCache: true });
    const kind = pickKind(state);
    if (!kind) {
      summary.skipped++;
      continue;
    }

    // Dedupe: hantar sekali bagi setiap jenis dalam tempoh TTL
    let fresh = true;
    try {
      const set = await redis.set(`subreminder:${sub.id}:${kind}`, now.toISOString(), "EX", DEDUPE_TTL_SEC[kind], "NX");
      fresh = set === "OK";
    } catch {
      // Redis tiada: teruskan tanpa dedupe
    }
    if (!fresh) {
      summary.skipped++;
      continue;
    }

    const message = buildMessage(kind, sub.tenant.name, state);
    summary.attempted++;
    summary.byKind[kind]++;

    const result = await sendMail({ to: sub.tenant.email, ...message });
    if (result.delivered) summary.delivered++;

    try {
      await prisma.auditLog.create({
        data: {
          tenantId: sub.tenantId,
          action: "SUBSCRIPTION_REMINDER_SENT",
          details: { kind, to: sub.tenant.email, delivered: result.delivered, provider: result.provider },
          status: result.delivered || result.provider === "CONSOLE" ? "SUCCESS" : "FAILED",
        },
      });
    } catch (error) {
      console.error("[SubscriptionReminders] Gagal mencatat audit:", error);
    }
  }

  return summary;
}
