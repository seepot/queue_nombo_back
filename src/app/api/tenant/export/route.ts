import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { requireVerifiedEmailForBilling } from "@/lib/email-verification";

/**
 * GET /api/tenant/export            (TENANT_ADMIN)
 * GET /api/tenant/export?tenantId=  (SUPERADMIN)
 *
 * Eksport data organisasi dalam JSON untuk pematuhan PDPA (hak akses data).
 * Kata laluan dan token tidak termasuk. Dihadkan 3 kali sejam bagi setiap tenant.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ success: false, message: "Sila log masuk." }, { status: 401 });
    }
    if (user.role !== "TENANT_ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ success: false, message: "Hanya Pentadbir Organisasi boleh mengeksport data." }, { status: 403 });
    }

    const emailGate = await requireVerifiedEmailForBilling({ id: user.id, role: user.role });
    if (emailGate) return emailGate;

    const tenantId =
      user.role === "SUPERADMIN" ? req.nextUrl.searchParams.get("tenantId") || user.tenantId : user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ success: false, message: "Organisasi tidak dikenal pasti." }, { status: 400 });
    }

    const limited = await rateLimit({ key: `tenant-export:${tenantId}`, limit: 3, windowSec: 60 * 60 });
    if (!limited.allowed) {
      return rateLimitResponse(limited, "Eksport data dihadkan kepada 3 kali sejam. Sila cuba semula kemudian.");
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: { orderBy: { createdAt: "desc" } },
        branches: {
          include: {
            categories: true,
            counters: true,
            devices: true,
            schedules: true,
          },
        },
        users: {
          select: {
            id: true,
            branchId: true,
            username: true,
            email: true,
            name: true,
            role: true,
            phone: true,
            status: true,
            lastLogin: true,
            emailVerifiedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        transactions: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!tenant) {
      return NextResponse.json({ success: false, message: "Organisasi tidak ditemui." }, { status: 404 });
    }

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const [tickets, appointments, feedbacks, auditLogs] = await Promise.all([
      prisma.ticket.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
      prisma.appointment.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
      prisma.feedback.findMany({ where: { ticket: { tenantId } }, orderBy: { createdAt: "desc" } }),
      prisma.auditLog.findMany({
        where: { tenantId, createdAt: { gte: ninetyDaysAgo } },
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
    ]);

    const payload = {
      format: "quenombo-tenant-export",
      version: 1,
      exportedAt: new Date().toISOString(),
      exportedBy: { id: user.id, role: user.role },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email,
        phone: tenant.phone,
        planType: tenant.planType,
        status: tenant.status,
        settings: tenant.settings,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
      subscriptions: tenant.subscriptions,
      branches: tenant.branches,
      users: tenant.users,
      paymentTransactions: tenant.transactions,
      tickets,
      appointments,
      feedbacks,
      auditLogs,
      counts: {
        branches: tenant.branches.length,
        users: tenant.users.length,
        tickets: tickets.length,
        appointments: appointments.length,
        feedbacks: feedbacks.length,
        auditLogs: auditLogs.length,
      },
    };

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "TENANT_DATA_EXPORTED",
        details: { counts: payload.counts },
        status: "SUCCESS",
      },
    });

    const filename = `quenombo-${tenant.slug}-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[Tenant Export Error]:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Ralat semasa mengeksport data." },
      { status: 500 }
    );
  }
}
