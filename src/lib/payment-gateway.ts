import { prisma } from "./prisma";

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
  return await prisma.$transaction(async (tx) => {
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
          planType: transaction.planType as any,
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
          planType: transaction.planType as any,
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
        planType: transaction.planType as any,
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
}
