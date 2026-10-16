import type { PlanType } from "@prisma/client";
import { prisma } from "./prisma";
import { invalidateSubscriptionCache } from "./subscription";
import { isToyyibPayConfigured, verifyToyyibPayPayment } from "./payments/toyyibpay";

export interface PlanPricing {
  name: string;
  monthlyPrice: number;
  yearlyMonthlyRate: number;
  yearlyTotalPrice: number;
  maxBranches: number;
  maxCounters: number;
  maxDisplays: number;
  whatsappQuota: number;
  description: string;
}

export const SAAS_PLANS: Record<string, PlanPricing> = {
  STARTER: {
    name: "STARTER",
    monthlyPrice: 99.0,
    yearlyMonthlyRate: 79.0,
    yearlyTotalPrice: 948.0, // 79 * 12
    maxBranches: 1,
    maxCounters: 4,
    maxDisplays: 2,
    whatsappQuota: 200,
    description: "Pelan untuk cawangan tunggal, klinik, dan farmasi.",
  },
  PRO: {
    name: "PRO",
    monthlyPrice: 249.0,
    yearlyMonthlyRate: 199.0,
    yearlyTotalPrice: 2388.0, // 199 * 12
    maxBranches: 5,
    maxCounters: 20,
    maxDisplays: 99,
    whatsappQuota: 1000,
    description: "Pelan paling popular untuk syarikat berbilang cawangan & agensi aktif.",
  },
  ENTERPRISE: {
    name: "ENTERPRISE",
    monthlyPrice: 699.0,
    yearlyMonthlyRate: 599.0,
    yearlyTotalPrice: 7188.0, // 599 * 12
    maxBranches: 99,
    maxCounters: 99,
    maxDisplays: 99,
    whatsappQuota: 5000,
    description: "Kapasiti tanpa had untuk kementerian, hospital & rangkaian nasional.",
  },
};

export function calculatePlanAmount(planType: string, billingCycle: "MONTHLY" | "YEARLY"): number {
  const plan = SAAS_PLANS[planType.toUpperCase()] || SAAS_PLANS.PRO;
  return billingCycle === "YEARLY" ? plan.yearlyTotalPrice : plan.monthlyPrice;
}

export function generateInvoiceNo(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `INV-${year}-${randomSuffix}`;
}

export async function createPaymentTransaction(params: {
  tenantId: string;
  planType: string;
  billingCycle: "MONTHLY" | "YEARLY";
  paymentMethod: "FPX" | "CARD" | "DUITNOW_QR" | "SANDBOX";
  gatewayProvider?: "TOYYIBPAY" | "BILLPLZ" | "STRIPE" | "SIMULATOR";
}) {
  const amount = calculatePlanAmount(params.planType, params.billingCycle);
  const invoiceNo = generateInvoiceNo();

  const transaction = await prisma.paymentTransaction.create({
    data: {
      tenantId: params.tenantId,
      invoiceNo,
      amount,
      currency: "MYR",
      planType: params.planType.toUpperCase(),
      billingCycle: params.billingCycle,
      paymentMethod: params.paymentMethod,
      gatewayProvider: params.gatewayProvider || (params.paymentMethod === "SANDBOX" ? "SIMULATOR" : "TOYYIBPAY"),
      status: "PENDING",
      billCode: `BILL-${Date.now()}`,
    },
    include: {
      tenant: true,
    },
  });

  return transaction;
}

export async function handleSuccessfulPayment(params: {
  transactionId: string;
  gatewayRef?: string;
  paymentMethod?: string;
}) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Dapatkan transaksi
    const transaction = await tx.paymentTransaction.findUnique({
      where: { id: params.transactionId },
      include: { tenant: true },
    });

    if (!transaction) {
      throw new Error(`Transaksi pembayaran dengan ID ${params.transactionId} tidak ditemui.`);
    }

    if (transaction.status === "SUCCESS") {
      return transaction; // Sudah diproses
    }

    const planConfig = SAAS_PLANS[transaction.planType] || SAAS_PLANS.PRO;
    const now = new Date();
    const durationDays = transaction.billingCycle === "YEARLY" ? 365 : 30;
    const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // 2. Kemas kini rekod Transaksi
    const updatedTransaction = await tx.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "SUCCESS",
        gatewayRef: params.gatewayRef || `REF-${Date.now()}`,
        paymentMethod: params.paymentMethod || transaction.paymentMethod,
        paidAt: now,
        receiptUrl: `/langganan/invois/${transaction.id}`,
      },
    });

    // 3. Kemas kini atau cipta Langganan Penyewa (Subscription)
    const existingSub = await tx.subscription.findFirst({
      where: { tenantId: transaction.tenantId },
      orderBy: { createdAt: "desc" },
    });

    let subscriptionId: string;

    if (existingSub) {
      const updatedSub = await tx.subscription.update({
        where: { id: existingSub.id },
        data: {
          planType: transaction.planType as PlanType,
          status: "ACTIVE",
          startDate: now,
          endDate,
          billingCycle: transaction.billingCycle,
          maxBranches: planConfig.maxBranches,
          maxCounters: planConfig.maxCounters,
          maxDisplays: planConfig.maxDisplays,
          whatsappQuota: planConfig.whatsappQuota,
          paymentProvider: transaction.gatewayProvider,
        },
      });
      subscriptionId = updatedSub.id;
    } else {
      const newSub = await tx.subscription.create({
        data: {
          tenantId: transaction.tenantId,
          planType: transaction.planType as PlanType,
          status: "ACTIVE",
          startDate: now,
          endDate,
          billingCycle: transaction.billingCycle,
          maxBranches: planConfig.maxBranches,
          maxCounters: planConfig.maxCounters,
          maxDisplays: planConfig.maxDisplays,
          whatsappQuota: planConfig.whatsappQuota,
          paymentProvider: transaction.gatewayProvider,
        },
      });
      subscriptionId = newSub.id;
    }

    // Hubungkan subscriptionId ke transaksi
    await tx.paymentTransaction.update({
      where: { id: transaction.id },
      data: { subscriptionId },
    });

    // 4. Kemas kini status Pelan pada Tenant
    await tx.tenant.update({
      where: { id: transaction.tenantId },
      data: {
        planType: transaction.planType as PlanType,
        status: "ACTIVE",
      },
    });

    // 5. Catat Audit Log rasmi
    await tx.auditLog.create({
      data: {
        tenantId: transaction.tenantId,
        action: "SUBSCRIPTION_PAYMENT_SUCCESS",
        details: {
          invoiceNo: transaction.invoiceNo,
          amount: Number(transaction.amount),
          planType: transaction.planType,
          billingCycle: transaction.billingCycle,
          gatewayRef: params.gatewayRef,
          endDate: endDate.toISOString(),
        },
        status: "SUCCESS",
      },
    });

    return updatedTransaction;
  });

  await invalidateSubscriptionCache(result.tenantId);
  return result;
}

// -----------------------------------------------------------------------------
// Konfigurasi & utiliti gerbang pembayaran
// -----------------------------------------------------------------------------

/** Mod SANDBOX (aktif serta-merta tanpa bayaran) hanya dibenarkan di luar produksi atau jika diaktifkan secara eksplisit. */
export function isBillingSandboxEnabled(): boolean {
  const flag = process.env.BILLING_SANDBOX_ENABLED;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

/** Benar jika sekurang-kurangnya satu gerbang pembayaran sebenar dikonfigurasi. */
export function isPaymentGatewayConfigured(): boolean {
  return isToyyibPayConfigured();
}

export const PAID_PLAN_TYPES = ["STARTER", "PRO", "ENTERPRISE"] as const;

export function isValidPaidPlan(planType: unknown): planType is (typeof PAID_PLAN_TYPES)[number] {
  return typeof planType === "string" && (PAID_PLAN_TYPES as readonly string[]).includes(planType.toUpperCase());
}

export function channelToPaymentMethod(channel?: string | null, fallback = "FPX"): string {
  if (!channel) return fallback;
  const c = String(channel).toUpperCase();
  if (c.includes("CARD") || c === "1" || c.includes("CREDIT")) return "CARD";
  if (c.includes("FPX") || c === "0") return "FPX";
  return fallback;
}

export async function markTransactionFailed(transactionId: string, gatewayRef?: string | null) {
  return prisma.paymentTransaction.update({
    where: { id: transactionId },
    data: {
      status: "FAILED",
      ...(gatewayRef ? { gatewayRef } : {}),
    },
  });
}

export type ReconcileStatus = "SUCCESS" | "PENDING" | "FAILED" | "MISMATCH" | "UNKNOWN";

/**
 * Semak semula transaksi terus dengan gerbang pembayaran dan aktifkan langganan jika
 * pembayaran disahkan. Selamat dipanggil berulang kali (webhook, halaman invois, /api/billing/verify).
 *
 * Transaksi ToyyibPay berstatus FAILED turut disemak semula kerana pelanggan boleh
 * mencuba bayar semula bil yang sama selepas percubaan FPX yang gagal.
 */
export async function reconcilePendingTransaction(
  transactionId: string,
  fallbackGatewayRef?: string
): Promise<{ status: ReconcileStatus; transactionId: string }> {
  const transaction = await prisma.paymentTransaction.findUnique({ where: { id: transactionId } });
  if (!transaction) {
    throw new Error("Transaksi tidak ditemui.");
  }

  if (transaction.status === "SUCCESS") return { status: "SUCCESS", transactionId };

  if (transaction.gatewayProvider !== "TOYYIBPAY" || !transaction.billCode) {
    return { status: transaction.status === "FAILED" ? "FAILED" : "PENDING", transactionId };
  }

  const verification = await verifyToyyibPayPayment(transaction.billCode, Number(transaction.amount));

  if (verification.paid) {
    await handleSuccessfulPayment({
      transactionId,
      gatewayRef: verification.ref || fallbackGatewayRef,
      paymentMethod: channelToPaymentMethod(verification.channel, transaction.paymentMethod),
    });
    return { status: "SUCCESS", transactionId };
  }

  if (verification.status === "MISMATCH") {
    // Bayaran diterima tetapi jumlah tidak sepadan: JANGAN aktifkan, kekalkan PENDING untuk semakan manual.
    console.error(
      `[Billing] Jumlah tidak sepadan untuk ${transaction.invoiceNo} (bil ${transaction.billCode}): ` +
        `dijangka RM${Number(transaction.amount).toFixed(2)}, diterima RM${(verification.amount ?? 0).toFixed(2)}`
    );
    return { status: "MISMATCH", transactionId };
  }

  if (verification.status === "FAILED") {
    if (transaction.status !== "FAILED") {
      await markTransactionFailed(transactionId, verification.ref);
    }
    return { status: "FAILED", transactionId };
  }

  if (transaction.status === "FAILED") return { status: "FAILED", transactionId };
  return { status: verification.status === "PENDING" ? "PENDING" : "UNKNOWN", transactionId };
}
