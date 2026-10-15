import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

/**
 * Kitaran hayat langganan tenant.
 *
 * Status berkesan dikira daripada rekod Subscription terkini + status Tenant:
 *  - TRIAL      : percubaan masih sah
 *  - ACTIVE     : langganan berbayar masih sah
 *  - PAST_DUE   : tarikh tamat sudah lepas tetapi masih dalam tempoh ihsan (GRACE_DAYS)
 *  - EXPIRED    : tamat sepenuhnya, operasi disekat
 *  - CANCELED   : dibatalkan tetapi masih sah sehingga endDate
 *  - SUSPENDED  : tenant digantung oleh superadmin
 *  - NONE       : tiada langganan langsung
 *
 * Peralihan (TRIAL->EXPIRED, ACTIVE->PAST_DUE->EXPIRED) disimpan secara malas
 * apabila dibaca, dan juga oleh sapuan cron /api/cron/subscriptions.
 */
export const GRACE_DAYS = 7;
export const TRIAL_WARNING_DAYS = 3;
export const RENEWAL_WARNING_DAYS = 7;
const CACHE_TTL_SEC = 60;

export type EffectiveSubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "EXPIRED"
  | "CANCELED"
  | "SUSPENDED"
  | "NONE";

export interface SubscriptionLimits {
  maxBranches: number;
  maxCounters: number;
  maxDisplays: number;
  whatsappQuota: number;
}

export interface SubscriptionState {
  tenantId: string;
  status: EffectiveSubscriptionStatus;
  /** Benar jika tenant boleh beroperasi (jana tiket, panggil kaunter, dll.) */
  operational: boolean;
  /** Benar jika perlu paparkan amaran (percubaan hampir tamat, tempoh ihsan, dll.) */
  warning: boolean;
  planType: string;
  endDate: string | null;
  /** Hari berbaki sebelum endDate (negatif jika sudah lepas) */
  daysLeft: number | null;
  /** Hari ihsan berbaki semasa PAST_DUE */
  graceDaysLeft: number | null;
  limits: SubscriptionLimits;
  message: string | null;
}

const DEFAULT_LIMITS: SubscriptionLimits = {
  maxBranches: 0,
  maxCounters: 0,
  maxDisplays: 0,
  whatsappQuota: 0,
};

function cacheKey(tenantId: string) {
  return `tenant:subscription:state:${tenantId}`;
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

export async function invalidateSubscriptionCache(tenantId: string): Promise<void> {
  try {
    await redis.del(cacheKey(tenantId));
  } catch {
    // abaikan
  }
}

async function persistStatus(
  subscriptionId: string,
  tenantId: string,
  from: string,
  to: "PAST_DUE" | "EXPIRED"
) {
  try {
    await prisma.$transaction([
      prisma.subscription.update({ where: { id: subscriptionId }, data: { status: to } }),
      prisma.auditLog.create({
        data: {
          tenantId,
          action: "SUBSCRIPTION_STATUS_AUTO_UPDATED",
          details: { from, to, subscriptionId },
          status: "SUCCESS",
        },
      }),
    ]);
  } catch (error) {
    console.error("[Subscription] Gagal menyimpan peralihan status:", error);
  }
}

/**
 * Kira keadaan langganan berkesan untuk tenant. Dicache 60 saat dalam Redis.
 */
export async function getSubscriptionState(
  tenantId: string,
  opts: { skipCache?: boolean } = {}
): Promise<SubscriptionState> {
  if (!opts.skipCache) {
    try {
      const cached = await redis.get(cacheKey(tenantId));
      if (cached) return JSON.parse(cached) as SubscriptionState;
    } catch {
      // abaikan, teruskan ke DB
    }
  }

  const state = await computeSubscriptionState(tenantId);

  try {
    await redis.set(cacheKey(tenantId), JSON.stringify(state), "EX", CACHE_TTL_SEC);
  } catch {
    // abaikan
  }

  return state;
}

async function computeSubscriptionState(tenantId: string): Promise<SubscriptionState> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, status: true, planType: true },
  });

  if (!tenant || tenant.status === "DELETED") {
    return {
      tenantId,
      status: "NONE",
      operational: false,
      warning: false,
      planType: "FREE",
      endDate: null,
      daysLeft: null,
      graceDaysLeft: null,
      limits: DEFAULT_LIMITS,
      message: "Akaun organisasi tidak ditemui.",
    };
  }

  const subscription = await prisma.subscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  const limits: SubscriptionLimits = subscription
    ? {
        maxBranches: subscription.maxBranches,
        maxCounters: subscription.maxCounters,
        maxDisplays: subscription.maxDisplays,
        whatsappQuota: subscription.whatsappQuota,
      }
    : DEFAULT_LIMITS;

  if (tenant.status === "SUSPENDED") {
    return {
      tenantId,
      status: "SUSPENDED",
      operational: false,
      warning: true,
      planType: tenant.planType,
      endDate: subscription?.endDate?.toISOString() || null,
      daysLeft: null,
      graceDaysLeft: null,
      limits,
      message: "Akaun organisasi anda telah digantung. Sila hubungi sokongan QueNombo.",
    };
  }

  if (!subscription) {
    return {
      tenantId,
      status: "NONE",
      operational: false,
      warning: true,
      planType: tenant.planType,
      endDate: null,
      daysLeft: null,
      graceDaysLeft: null,
      limits,
      message: "Tiada langganan aktif. Sila langgan pelan untuk mengaktifkan perkhidmatan.",
    };
  }

  const now = new Date();
  const endDate = subscription.endDate;
  const daysLeft = endDate ? daysBetween(now, endDate) : null;
  const expiredByDate = !!endDate && now > endDate;
  const base = {
    tenantId,
    planType: subscription.planType,
    endDate: endDate ? endDate.toISOString() : null,
    daysLeft,
    limits,
  };

  switch (subscription.status) {
    case "TRIAL": {
      if (expiredByDate) {
        await persistStatus(subscription.id, tenantId, "TRIAL", "EXPIRED");
        return {
          ...base,
          status: "EXPIRED",
          operational: false,
          warning: true,
          graceDaysLeft: null,
          message: "Tempoh percubaan percuma anda telah tamat. Sila langgan pelan untuk meneruskan perkhidmatan.",
        };
      }
      const warn = daysLeft !== null && daysLeft <= TRIAL_WARNING_DAYS;
      return {
        ...base,
        status: "TRIAL",
        operational: true,
        warning: warn,
        graceDaysLeft: null,
        message: warn
          ? `Tempoh percubaan anda akan tamat dalam ${Math.max(0, daysLeft ?? 0)} hari. Langgan sekarang untuk mengelakkan gangguan.`
          : null,
      };
    }

    case "ACTIVE":
    case "PAST_DUE":
    case "CANCELED": {
      if (!expiredByDate) {
        const warn =
          subscription.status !== "CANCELED" &&
          daysLeft !== null &&
          daysLeft <= RENEWAL_WARNING_DAYS;
        return {
          ...base,
          status: subscription.status === "PAST_DUE" ? "ACTIVE" : subscription.status,
          operational: true,
          warning: warn || subscription.status === "CANCELED",
          graceDaysLeft: null,
          message:
            subscription.status === "CANCELED"
              ? `Langganan anda dibatalkan dan akan berakhir dalam ${Math.max(0, daysLeft ?? 0)} hari.`
              : warn
              ? `Langganan anda akan tamat dalam ${Math.max(0, daysLeft ?? 0)} hari. Sila perbaharui untuk mengelakkan gangguan.`
              : null,
        };
      }

      // Tarikh tamat sudah lepas
      if (subscription.status === "CANCELED") {
        await persistStatus(subscription.id, tenantId, "CANCELED", "EXPIRED");
        return {
          ...base,
          status: "EXPIRED",
          operational: false,
          warning: true,
          graceDaysLeft: null,
          message: "Langganan anda telah berakhir. Sila langgan semula untuk mengaktifkan perkhidmatan.",
        };
      }

      const graceEnd = new Date(endDate!.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
      if (now <= graceEnd) {
        if (subscription.status !== "PAST_DUE") {
          await persistStatus(subscription.id, tenantId, subscription.status, "PAST_DUE");
        }
        const graceDaysLeft = daysBetween(now, graceEnd);
        return {
          ...base,
          status: "PAST_DUE",
          operational: true,
          warning: true,
          graceDaysLeft,
          message: `Langganan anda telah tamat. Perkhidmatan akan disekat dalam ${graceDaysLeft} hari jika pembayaran tidak diterima.`,
        };
      }

      await persistStatus(subscription.id, tenantId, subscription.status, "EXPIRED");
      return {
        ...base,
        status: "EXPIRED",
        operational: false,
        warning: true,
        graceDaysLeft: null,
        message: "Langganan anda telah tamat tempoh. Sila perbaharui pelan untuk meneruskan perkhidmatan.",
      };
    }

    case "EXPIRED":
    default:
      return {
        ...base,
        status: "EXPIRED",
        operational: false,
        warning: true,
        graceDaysLeft: null,
        message: "Langganan anda telah tamat tempoh. Sila perbaharui pelan untuk meneruskan perkhidmatan.",
      };
  }
}

export type OperationalCheck =
  | { ok: true; state: SubscriptionState }
  | { ok: false; state: SubscriptionState; httpStatus: 402 | 403; message: string };

/**
 * Semak sama ada tenant dibenarkan menjalankan operasi harian
 * (jana tiket, panggil kaunter, pasang peranti, dsb.).
 */
export async function assertTenantOperational(tenantId: string): Promise<OperationalCheck> {
  const state = await getSubscriptionState(tenantId);
  if (state.operational) {
    return { ok: true, state };
  }
  const httpStatus = state.status === "SUSPENDED" ? 403 : 402;
  return {
    ok: false,
    state,
    httpStatus,
    message: state.message || "Perkhidmatan tidak tersedia buat masa ini.",
  };
}

/** Respons JSON seragam apabila operasi disekat kerana langganan. */
export function subscriptionBlockedResponse(check: Extract<OperationalCheck, { ok: false }>): NextResponse {
  return NextResponse.json(
    {
      success: false,
      code: check.state.status === "SUSPENDED" ? "TENANT_SUSPENDED" : "SUBSCRIPTION_INACTIVE",
      message: check.message,
      subscriptionStatus: check.state.status,
    },
    { status: check.httpStatus }
  );
}

/**
 * Sapuan berkala: kemas kini status semua langganan yang tarikh tamatnya sudah lepas.
 * Dipanggil oleh /api/cron/subscriptions.
 */
export async function sweepExpiredSubscriptions(): Promise<{
  checked: number;
  pastDue: number;
  expired: number;
}> {
  const now = new Date();
  const candidates = await prisma.subscription.findMany({
    where: {
      status: { in: ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"] },
      endDate: { lt: now },
    },
    select: { tenantId: true },
    distinct: ["tenantId"],
  });

  let pastDue = 0;
  let expired = 0;

  for (const { tenantId } of candidates) {
    const state = await getSubscriptionState(tenantId, { skipCache: true });
    if (state.status === "PAST_DUE") pastDue++;
    if (state.status === "EXPIRED") expired++;
  }

  return { checked: candidates.length, pastDue, expired };
}
