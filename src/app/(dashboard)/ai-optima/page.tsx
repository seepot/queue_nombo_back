import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCounterOptimizationRecommendations, getHourlyTrafficForecast } from "@/lib/ai-queue";
import AiOptimaClient from "./AiOptimaClient";

export const metadata = {
  title: "AI Optima & Ramalan Kaunter | QueNombo SaaS",
};

export default async function AiOptimaPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  let tenantId = user.tenantId;

  let tenant = null;
  if (tenantId) {
    tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { branches: { take: 1 } },
    });
  } else {
    // Fallback untuk SuperAdmin
    tenant = await prisma.tenant.findFirst({
      include: { branches: { take: 1 } },
    });
    tenantId = tenant?.id;
  }

  const branch = tenant?.branches[0];
  const branchId = branch?.id || "demo-branch-id";

  const recommendations = await getCounterOptimizationRecommendations(branchId);
  const hourlyForecast = getHourlyTrafficForecast();

  return (
    <AiOptimaClient
      initialRecommendations={recommendations}
      initialForecast={hourlyForecast}
      branchName={branch?.name || "Cawangan Utama (Superadmin View)"}
      branchId={branchId}
    />
  );
}
