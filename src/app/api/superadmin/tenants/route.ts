import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { auth } from "@/lib/auth";
import type { PlanType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readJsonObject, type TenantSettings } from "@/lib/settings";
import { invalidateSubscriptionCache } from "@/lib/subscription";
import { hashPassword } from "@/lib/password";
import { generateInvoiceNo } from "@/lib/payment-gateway";

export async function GET() {
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

    const tenants = await prisma.tenant.findMany({
      include: {
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
        branches: {
          include: {
            counters: true,
            categories: true,
          },
        },
        users: {
          select: { id: true, name: true, email: true, username: true, role: true, lastLogin: true },
        },
        _count: {
          select: {
            branches: true,
            users: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, tenants });
  } catch (error) {
    console.error("[Superadmin GET Tenants Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat semasa mengambil data tenant." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;

    if (user?.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, message: "Akses dinafikan." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, tenantId, planType, status, extraDays, quotas, newPassword, manualPayment, crmNotes } = body;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "tenantId diperlukan." },
        { status: 400 }
      );
    }

    // 1. EXTEND_TRIAL
    if (action === "EXTEND_TRIAL") {
      const days = Number(extraDays) || 14;
      const sub = await prisma.subscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });

      const currentEnd = sub?.endDate ? new Date(sub.endDate) : new Date();
      const newEndDate = new Date(Math.max(Date.now(), currentEnd.getTime()) + days * 24 * 60 * 60 * 1000);

      if (sub) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            endDate: newEndDate,
            status: "TRIAL",
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          tenantId,
          action: "TRIAL_EXTENDED_BY_SUPERADMIN",
          details: { daysAdded: days, newEndDate: newEndDate.toISOString() },
          status: "SUCCESS",
        },
      });

      await invalidateSubscriptionCache(tenantId);
      return NextResponse.json({
        success: true,
        message: `Tempoh percubaan berjaya dilanjutkan sebanyak +${days} hari sehingga ${newEndDate.toLocaleDateString("ms-MY")}.`,
      });
    }

    // 2. UPDATE_QUOTAS
    if (action === "UPDATE_QUOTAS") {
      const sub = await prisma.subscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });

      if (sub && quotas) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            ...(quotas.maxBranches !== undefined ? { maxBranches: Number(quotas.maxBranches) } : {}),
            ...(quotas.maxCounters !== undefined ? { maxCounters: Number(quotas.maxCounters) } : {}),
            ...(quotas.maxDisplays !== undefined ? { maxDisplays: Number(quotas.maxDisplays) } : {}),
            ...(quotas.whatsappQuota !== undefined ? { whatsappQuota: Number(quotas.whatsappQuota) } : {}),
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          tenantId,
          action: "TENANT_QUOTAS_UPDATED_BY_SUPERADMIN",
          details: quotas,
          status: "SUCCESS",
        },
      });

      await invalidateSubscriptionCache(tenantId);
      return NextResponse.json({
        success: true,
        message: "Kuota sumber organisasi berjaya dikemas kini!",
      });
    }

    // 3. RESET_ADMIN_PASSWORD
    if (action === "RESET_ADMIN_PASSWORD") {
      const adminUser = await prisma.user.findFirst({
        where: {
          tenantId,
          role: { in: ["TENANT_ADMIN", "SUPERADMIN"] },
        },
      });

      if (!adminUser) {
        return NextResponse.json(
          { success: false, message: "Akaun pentadbir bagi organisasi ini tidak ditemui." },
          { status: 404 }
        );
      }

      const generatedPassword = newPassword?.trim() || `QueNombo#${Math.floor(1000 + Math.random() * 9000)}!`;
      const hashed = await hashPassword(generatedPassword);

      await prisma.user.update({
        where: { id: adminUser.id },
        data: { passwordHash: hashed },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          action: "ADMIN_PASSWORD_RESET_BY_SUPERADMIN",
          details: { adminUsername: adminUser.username, adminEmail: adminUser.email },
          status: "SUCCESS",
        },
      });

      await invalidateSubscriptionCache(tenantId);
      return NextResponse.json({
        success: true,
        message: `Kata laluan pentadbir (${adminUser.username}) berjaya diset semula!`,
        generatedPassword,
      });
    }

    // 4. RECORD_MANUAL_PAYMENT
    if (action === "RECORD_MANUAL_PAYMENT") {
      if (!manualPayment || !manualPayment.amount) {
        return NextResponse.json(
          { success: false, message: "Maklumat bayaran manual tidak lengkap." },
          { status: 400 }
        );
      }

      const invoiceNo = generateInvoiceNo();
      const amount = Number(manualPayment.amount);
      const plan = (manualPayment.planType || "PRO").toUpperCase();
      const billingCycle = manualPayment.billingCycle || "YEARLY";
      const monthsToAdd = billingCycle === "YEARLY" ? 12 : 1;

      const sub = await prisma.subscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });

      const currentEnd = sub?.endDate ? new Date(sub.endDate) : new Date();
      const newEndDate = new Date(Math.max(Date.now(), currentEnd.getTime()) + monthsToAdd * 30 * 24 * 60 * 60 * 1000);

      // Cipta transaksi bayaran dengan status SUCCESS
      const transaction = await prisma.paymentTransaction.create({
        data: {
          tenantId,
          subscriptionId: sub?.id || null,
          invoiceNo,
          amount,
          currency: "MYR",
          planType: plan,
          billingCycle,
          paymentMethod: manualPayment.paymentMethod || "BANK_TRANSFER",
          status: "SUCCESS",
          gatewayProvider: "MANUAL",
          gatewayRef: manualPayment.referenceNo || "MANUAL_SUPERADMIN",
          paidAt: new Date(),
        },
      });

      if (sub) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: "ACTIVE",
            planType: plan as PlanType,
            billingCycle,
            endDate: newEndDate,
          },
        });
      }

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          status: "ACTIVE",
          planType: plan as PlanType,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          action: "MANUAL_PAYMENT_RECORDED_BY_SUPERADMIN",
          details: { invoiceNo, amount, planType: plan, paymentMethod: manualPayment.paymentMethod, ref: manualPayment.referenceNo },
          status: "SUCCESS",
        },
      });

      await invalidateSubscriptionCache(tenantId);
      return NextResponse.json({
        success: true,
        message: `Invois ${invoiceNo} berjaya direkodkan (RM ${amount.toFixed(2)}) & status langganan diaktifkan sehingga ${newEndDate.toLocaleDateString("ms-MY")}!`,
        transactionId: transaction.id,
      });
    }

    // 5. SAVE_CRM_NOTES
    if (action === "SAVE_CRM_NOTES") {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      const currentSettings = readJsonObject<TenantSettings>(tenant?.settings);
      const updatedSettings = { ...currentSettings, internalNotes: crmNotes || "" };

      await prisma.tenant.update({
        where: { id: tenantId },
        data: { settings: updatedSettings },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          action: "CRM_NOTES_UPDATED_BY_SUPERADMIN",
          details: { length: (crmNotes || "").length },
          status: "SUCCESS",
        },
      });

      await invalidateSubscriptionCache(tenantId);
      return NextResponse.json({
        success: true,
        message: "Nota CRM dalaman berjaya disimpan!",
      });
    }

    // 6. RESET_USER_PASSWORD (Individual staff password reset)
    if (action === "RESET_USER_PASSWORD") {
      const { userId } = body;
      const targetUser = await prisma.user.findFirst({
        where: { id: userId, tenantId },
      });

      if (!targetUser) {
        return NextResponse.json(
          { success: false, message: "Pengguna tidak ditemui." },
          { status: 404 }
        );
      }

      const generatedPassword = newPassword?.trim() || `QueNombo#${Math.floor(1000 + Math.random() * 9000)}!`;
      const hashed = await hashPassword(generatedPassword);

      await prisma.user.update({
        where: { id: targetUser.id },
        data: { passwordHash: hashed },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          action: "USER_PASSWORD_RESET_BY_SUPERADMIN",
          details: { targetUsername: targetUser.username, targetRole: targetUser.role },
          status: "SUCCESS",
        },
      });

      await invalidateSubscriptionCache(tenantId);
      return NextResponse.json({
        success: true,
        message: `Kata laluan bagi staf '${targetUser.name || targetUser.username}' berjaya diset semula!`,
        generatedPassword,
      });
    }

    // 7. UPDATE_USER_STATUS (Toggle active / inactive)
    if (action === "UPDATE_USER_STATUS") {
      const { userId, userStatus } = body;
      const targetUser = await prisma.user.findFirst({
        where: { id: userId, tenantId },
      });

      if (!targetUser) {
        return NextResponse.json(
          { success: false, message: "Pengguna tidak ditemui." },
          { status: 404 }
        );
      }

      const updatedUser = await prisma.user.update({
        where: { id: targetUser.id },
        data: { status: userStatus || "ACTIVE" },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          action: "USER_STATUS_UPDATED_BY_SUPERADMIN",
          details: { targetUsername: targetUser.username, newStatus: updatedUser.status },
          status: "SUCCESS",
        },
      });

      await invalidateSubscriptionCache(tenantId);
      return NextResponse.json({
        success: true,
        message: `Status akaun '${targetUser.username}' berjaya ditukar kepada ${updatedUser.status}!`,
      });
    }

    // 8. UPDATE_FEATURE_FLAGS (Custom module flags)
    if (action === "UPDATE_FEATURE_FLAGS") {
      const { featureFlags } = body;
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      const currentSettings = readJsonObject<TenantSettings>(tenant?.settings);
      const updatedSettings = { ...currentSettings, featureFlags: featureFlags || {} };

      await prisma.tenant.update({
        where: { id: tenantId },
        data: { settings: updatedSettings },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          action: "FEATURE_FLAGS_UPDATED_BY_SUPERADMIN",
          details: featureFlags,
          status: "SUCCESS",
        },
      });

      await invalidateSubscriptionCache(tenantId);
      return NextResponse.json({
        success: true,
        message: "Konfigurasi suis modul & ciri berjaya dikemas kini!",
      });
    }

    // 9. DEFAULT UPDATE (PLAN & STATUS)
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(planType ? { planType } : {}),
        ...(status ? { status } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "TENANT_STATUS_PLAN_MODIFIED",
        details: { planType, status },
        status: "SUCCESS",
      },
    });

    await invalidateSubscriptionCache(tenantId);
    return NextResponse.json({
      success: true,
      message: `Tenant '${updated.name}' berjaya dikemas kini.`,
      tenant: updated,
    });
  } catch (error) {
    console.error("[Superadmin PATCH Tenant Error]:", error);
    return NextResponse.json(
      { success: false, message: getErrorMessage(error, "Ralat semasa mengemas kini tenant.") },
      { status: 500 }
    );
  }
}
