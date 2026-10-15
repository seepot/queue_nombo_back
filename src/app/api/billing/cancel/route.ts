import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionState, invalidateSubscriptionCache } from "@/lib/subscription";

/**
 * POST /api/billing/cancel
 * Body: { action: "CANCEL" | "RESUME", reason?: string, tenantId?: string (SUPERADMIN sahaja) }
 *
 * CANCEL : langganan ditanda CANCELED tetapi kekal aktif sehingga endDate (tiada pembaharuan).
 * RESUME : batalkan pembatalan selagi endDate belum lepas.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;
    if (!user) {
      return NextResponse.json({ success: false, message: "Sila log masuk." }, { status: 401 });
    }
    if (user.role !== "TENANT_ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, message: "Hanya Pentadbir Organisasi boleh menguruskan langganan." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action: string = body?.action;
    const tenantId: string | undefined = user.role === "SUPERADMIN" ? body?.tenantId || user.tenantId : user.tenantId;

    if (!tenantId) {
      return NextResponse.json({ success: false, message: "Organisasi tidak dikenal pasti." }, { status: 400 });
    }
    if (action !== "CANCEL" && action !== "RESUME") {
      return NextResponse.json({ success: false, message: "action mesti CANCEL atau RESUME." }, { status: 400 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    if (!subscription) {
      return NextResponse.json({ success: false, message: "Tiada langganan ditemui." }, { status: 404 });
    }

    const now = new Date();

    if (action === "CANCEL") {
      if (!["ACTIVE", "TRIAL", "PAST_DUE"].includes(subscription.status)) {
        return NextResponse.json(
          { success: false, message: `Langganan berstatus ${subscription.status} tidak boleh dibatalkan.` },
          { status: 400 }
        );
      }

      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: "CANCELED" },
        }),
        prisma.auditLog.create({
          data: {
            tenantId,
            userId: user.id,
            action: "SUBSCRIPTION_CANCELED",
            details: {
              subscriptionId: subscription.id,
              previousStatus: subscription.status,
              planType: subscription.planType,
              endDate: subscription.endDate?.toISOString() || null,
              reason: typeof body?.reason === "string" ? body.reason.slice(0, 500) : null,
            },
            status: "SUCCESS",
          },
        }),
      ]);
      await invalidateSubscriptionCache(tenantId);
      const state = await getSubscriptionState(tenantId, { skipCache: true });

      return NextResponse.json({
        success: true,
        message: subscription.endDate
          ? `Langganan dibatalkan. Perkhidmatan kekal aktif sehingga ${subscription.endDate.toLocaleDateString("ms-MY")} dan tidak akan diperbaharui.`
          : "Langganan dibatalkan.",
        state,
      });
    }

    // RESUME
    if (subscription.status !== "CANCELED") {
      return NextResponse.json(
        { success: false, message: "Hanya langganan yang dibatalkan boleh diaktifkan semula." },
        { status: 400 }
      );
    }
    if (!subscription.endDate || subscription.endDate <= now) {
      return NextResponse.json(
        { success: false, message: "Tempoh langganan sudah berakhir. Sila langgan pelan baharu." },
        { status: 400 }
      );
    }

    const restoredStatus = subscription.planType === "FREE" ? "TRIAL" : "ACTIVE";
    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: restoredStatus },
      }),
      prisma.auditLog.create({
        data: {
          tenantId,
          userId: user.id,
          action: "SUBSCRIPTION_RESUMED",
          details: { subscriptionId: subscription.id, restoredStatus, planType: subscription.planType },
          status: "SUCCESS",
        },
      }),
    ]);
    await invalidateSubscriptionCache(tenantId);
    const state = await getSubscriptionState(tenantId, { skipCache: true });

    return NextResponse.json({
      success: true,
      message: "Pembatalan ditarik balik. Langganan anda aktif semula.",
      state,
    });
  } catch (error) {
    console.error("[Billing Cancel Error]:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Ralat semasa mengemas kini langganan." },
      { status: 500 }
    );
  }
}
