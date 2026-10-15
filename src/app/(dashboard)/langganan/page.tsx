import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BillingClient from "./BillingClient";
import { isBillingSandboxEnabled, isPaymentGatewayConfigured } from "@/lib/payment-gateway";

export const metadata = {
  title: "Pelan & Langganan | QueNombo SaaS",
};

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  let tenantId = user.tenantId;

  let tenant = null;
  if (tenantId) {
    tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  } else {
    // Fallback untuk SuperAdmin
    tenant = await prisma.tenant.findFirst();
    tenantId = tenant?.id;
  }

  const [subscription, usedBranches, usedCounters, usedDisplays] = await Promise.all([
    tenantId
      ? prisma.subscription.findFirst({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
        })
      : null,
    tenantId ? prisma.branch.count({ where: { tenantId } }) : prisma.branch.count(),
    tenantId ? prisma.counter.count({ where: { branch: { tenantId } } }) : prisma.counter.count(),
    tenantId ? prisma.device.count({ where: { branch: { tenantId }, deviceType: "TV_DISPLAY" } }) : prisma.device.count(),
  ]);

  const subscriptionInfo = {
    planType: subscription?.planType || tenant?.planType || "PRO",
    status: subscription?.status || "ACTIVE",
    billingCycle: subscription?.billingCycle || "YEARLY",
    startDate: subscription?.startDate?.toISOString() || new Date().toISOString(),
    endDate: subscription?.endDate?.toISOString() || null,
    maxBranches: subscription?.maxBranches || 10,
    maxCounters: subscription?.maxCounters || 50,
    maxDisplays: subscription?.maxDisplays || 99,
    whatsappQuota: subscription?.whatsappQuota || 500,
  };

  const usage = {
    usedBranches,
    usedCounters,
    usedDisplays,
  };

  return (
    <BillingClient
      subscription={subscriptionInfo}
      usage={usage}
      tenantName={tenant?.name || "Organisasi Utama (Superadmin View)"}
      sandboxEnabled={isBillingSandboxEnabled()}
      gatewayConfigured={isPaymentGatewayConfigured()}
    />
  );
}
