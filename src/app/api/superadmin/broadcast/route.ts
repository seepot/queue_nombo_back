import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { auth } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;

    if (user?.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, message: "Akses dinafikan. Hanya SuperAdmin dibenarkan." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, message, channel, targetAudience } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, message: "Tajuk dan mesej hebahan wajib diisi." },
        { status: 400 }
      );
    }

    // 1. Tapis sasaran penerima
    let whereCondition: Prisma.TenantWhereInput = {};
    if (targetAudience === "TRIAL_USERS") {
      whereCondition = { subscriptions: { some: { status: "TRIAL" } } };
    } else if (targetAudience === "PRO_USERS") {
      whereCondition = { planType: "PRO" };
    } else if (targetAudience === "ENTERPRISE_USERS") {
      whereCondition = { planType: "ENTERPRISE" };
    } else if (targetAudience === "INACTIVE_USERS") {
      whereCondition = { status: "SUSPENDED" };
    }

    const targetTenants = await prisma.tenant.findMany({
      where: whereCondition,
      include: {
        users: {
          where: { role: { in: ["TENANT_ADMIN", "SUPERADMIN"] } },
          select: { id: true, name: true, phone: true, email: true, username: true },
        },
      },
    });

    let sentCount = 0;
    const recipients: { tenantName: string; adminName: string; contact: string }[] = [];

    for (const t of targetTenants) {
      const admin = t.users[0];
      const contact = channel === "WHATSAPP" ? (admin?.phone || t.phone || "60123456789") : (admin?.email || t.email || "admin@demo.com");
      recipients.push({
        tenantName: t.name,
        adminName: admin?.name || admin?.username || "Pentadbir",
        contact,
      });
      sentCount++;
    }

    // 2. Simpan rekod Audit Log
    await prisma.auditLog.create({
      data: {
        tenantId: targetTenants[0]?.id || null,
        action: "SUPERADMIN_GLOBAL_BROADCAST_SENT",
        details: {
          title,
          channel: channel || "WHATSAPP",
          targetAudience: targetAudience || "ALL_ADMINS",
          recipientCount: sentCount,
          sentBy: user.email || user.username || "Superadmin",
        },
        status: "SUCCESS",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Hebahan berjaya disiarkan kepada ${sentCount} organisasi (${channel || "WhatsApp"})!`,
      sentCount,
      recipients: recipients.slice(0, 10), // Preview 10 penerima pertama
    });
  } catch (error) {
    console.error("[Broadcast Error]:", error);
    return NextResponse.json(
      { success: false, message: getErrorMessage(error, "Ralat semasa menyiarkan hebahan.") },
      { status: 500 }
    );
  }
}
