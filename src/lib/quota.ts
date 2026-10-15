import { prisma } from "@/lib/prisma";

export interface QuotaCheckResult {
  allowed: boolean;
  currentCount: number;
  maxLimit: number;
  message?: string;
}

/**
 * Menyemak sama ada tenant mempunyai kuota mencukupi untuk menambah sumber baru.
 */
export async function checkTenantQuota(
  tenantId: string,
  resource: "branches" | "counters" | "displays"
): Promise<QuotaCheckResult> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      tenantId,
      status: { in: ["ACTIVE", "TRIAL"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    return {
      allowed: false,
      currentCount: 0,
      maxLimit: 0,
      message: "Tiada langganan aktif ditemui. Sila langgan pelan untuk meneruskan.",
    };
  }

  // Semak tarikh luput
  if (subscription.endDate && new Date() > new Date(subscription.endDate)) {
    return {
      allowed: false,
      currentCount: 0,
      maxLimit: 0,
      message: "Langganan anda telah tamat tempoh. Sila perbaharui pelan anda.",
    };
  }

  if (resource === "branches") {
    const currentCount = await prisma.branch.count({ where: { tenantId } });
    const maxLimit = subscription.maxBranches;
    const allowed = currentCount < maxLimit;

    return {
      allowed,
      currentCount,
      maxLimit,
      message: allowed
        ? undefined
        : `Had kuota cawangan (${maxLimit}) telah dicapai. Sila naik taraf ke pelan Pro atau Enterprise.`,
    };
  }

  if (resource === "counters") {
    const currentCount = await prisma.counter.count({
      where: { branch: { tenantId } },
    });
    const maxLimit = subscription.maxCounters;
    const allowed = currentCount < maxLimit;

    return {
      allowed,
      currentCount,
      maxLimit,
      message: allowed
        ? undefined
        : `Had kuota kaunter (${maxLimit}) telah dicapai. Sila naik taraf pelan langganan anda.`,
    };
  }

  if (resource === "displays") {
    const currentCount = await prisma.device.count({
      where: { branch: { tenantId }, deviceType: "TV_DISPLAY" },
    });
    const maxLimit = subscription.maxDisplays;
    const allowed = currentCount < maxLimit;

    return {
      allowed,
      currentCount,
      maxLimit,
      message: allowed
        ? undefined
        : `Had kuota paparan TV (${maxLimit}) telah dicapai. Sila naik taraf pelan langganan anda.`,
    };
  }

  return { allowed: true, currentCount: 0, maxLimit: 999 };
}
