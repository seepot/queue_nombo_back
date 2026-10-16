import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readJsonObject,
  TENANT_DELETION_GRACE_DAYS as DELETION_GRACE_DAYS,
  type TenantDeletionRequest,
  type TenantSettings,
} from "@/lib/settings";
import { requireVerifiedEmailForBilling } from "@/lib/email-verification";
import { sendMail } from "@/lib/mailer";

type SessionUser = { id: string; role?: string | null; tenantId?: string | null; name?: string | null };

async function resolveTenantForUser(user: SessionUser, requestedTenantId?: string | null) {
  const tenantId = user.role === "SUPERADMIN" ? requestedTenantId || user.tenantId : user.tenantId;
  if (!tenantId) return null;
  return prisma.tenant.findUnique({ where: { id: tenantId } });
}

function deny(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

/** GET /api/tenant/deletion-request -> status permohonan semasa */
export async function GET(req: NextRequest) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user) return deny("Sila log masuk.", 401);
  if (user.role !== "TENANT_ADMIN" && user.role !== "SUPERADMIN") return deny("Akses dinafikan.", 403);

  const tenant = await resolveTenantForUser(user, req.nextUrl.searchParams.get("tenantId"));
  if (!tenant) return deny("Organisasi tidak dikenal pasti.", 400);

  const settings = readJsonObject<TenantSettings>(tenant.settings);
  const deletionRequest = settings.deletionRequest || null;
  return NextResponse.json({
    success: true,
    deletionRequest,
    scheduledFor: deletionRequest?.scheduledFor || null,
    gracePeriodDays: DELETION_GRACE_DAYS,
  });
}

/**
 * POST /api/tenant/deletion-request
 * Body: { action: "REQUEST", confirmSlug: string, reason?: string } | { action: "CANCEL" }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as SessionUser | undefined;
    if (!user) return deny("Sila log masuk.", 401);
    if (user.role !== "TENANT_ADMIN" && user.role !== "SUPERADMIN") {
      return deny("Hanya Pentadbir Organisasi boleh memohon pemadaman akaun.", 403);
    }

    const emailGate = await requireVerifiedEmailForBilling({ id: user.id, role: user.role });
    if (emailGate) return emailGate;

    const body = await req.json().catch(() => ({}));
    const action: string = body?.action;
    const tenant = await resolveTenantForUser(user, body?.tenantId);
    if (!tenant) return deny("Organisasi tidak dikenal pasti.", 400);

    const settings = readJsonObject<TenantSettings>(tenant.settings);
    const current = settings.deletionRequest || null;

    if (action === "REQUEST") {
      const confirmSlug = String(body?.confirmSlug || "").trim().toLowerCase();
      if (confirmSlug !== tenant.slug) {
        return deny(`Sila taip slug organisasi '${tenant.slug}' untuk mengesahkan permohonan.`, 400);
      }
      if (current) {
        return deny("Permohonan pemadaman sudah direkodkan dan sedang menunggu.", 400);
      }

      const now = new Date();
      const scheduledFor = new Date(now.getTime() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
      const deletionRequest: TenantDeletionRequest = {
        status: "PENDING",
        requestedAt: now.toISOString(),
        requestedBy: user.id,
        requestedByName: user.name || undefined,
        reason: typeof body?.reason === "string" ? body.reason.slice(0, 500) : null,
        scheduledFor: scheduledFor.toISOString(),
      };

      const nextSettings = { ...settings, deletionRequest } as Prisma.InputJsonObject;
      await prisma.$transaction([
        prisma.tenant.update({ where: { id: tenant.id }, data: { settings: nextSettings } }),
        prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            action: "TENANT_DELETION_REQUESTED",
            details: { reason: deletionRequest.reason, scheduledFor: deletionRequest.scheduledFor },
            status: "SUCCESS",
          },
        }),
      ]);

      if (tenant.email) {
        await sendMail({
          to: tenant.email,
          subject: `Permohonan pemadaman akaun QueNombo (${tenant.name})`,
          text: `Kami menerima permohonan pemadaman akaun organisasi ${tenant.name} pada ${now.toLocaleString("ms-MY")}.\nAkaun dan semua data akan dipadam selepas ${scheduledFor.toLocaleDateString("ms-MY")}.\nJika ini bukan permohonan anda, log masuk ke QueNombo dan batalkan permohonan di halaman Langganan sebelum tarikh tersebut.`,
          html: `<p>Kami menerima permohonan pemadaman akaun organisasi <strong>${tenant.name}</strong>.</p><p>Akaun dan semua data akan dipadam selepas <strong>${scheduledFor.toLocaleDateString("ms-MY")}</strong> (${DELETION_GRACE_DAYS} hari tempoh ihsan).</p><p>Jika ini bukan permohonan anda, log masuk ke QueNombo dan batalkan permohonan di halaman Langganan sebelum tarikh tersebut.</p>`,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Permohonan direkodkan. Akaun akan dipadam selepas ${scheduledFor.toLocaleDateString("ms-MY")} melainkan dibatalkan.`,
        deletionRequest,
        scheduledFor: deletionRequest.scheduledFor,
        gracePeriodDays: DELETION_GRACE_DAYS,
      });
    }

    if (action === "CANCEL") {
      if (!current) return deny("Tiada permohonan pemadaman untuk dibatalkan.", 400);

      const rest: TenantSettings = { ...settings };
      delete rest.deletionRequest;
      await prisma.$transaction([
        prisma.tenant.update({ where: { id: tenant.id }, data: { settings: rest as Prisma.InputJsonObject } }),
        prisma.auditLog.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            action: "TENANT_DELETION_REQUEST_CANCELED",
            details: { requestedAt: current.requestedAt },
            status: "SUCCESS",
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: "Permohonan pemadaman dibatalkan. Akaun anda kekal aktif.",
        deletionRequest: null,
      });
    }

    return deny("action mesti REQUEST atau CANCEL.", 400);
  } catch (error) {
    console.error("[Tenant Deletion Request Error]:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Ralat semasa memproses permohonan." },
      { status: 500 }
    );
  }
}
