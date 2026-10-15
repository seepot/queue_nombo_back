import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { readJsonObject, type BranchSettings } from "@/lib/settings";
import ManagerMobileClient from "./ManagerMobileClient";

const branchInclude = {
  counters: {
    include: {
      assignedUser: true,
    },
  },
  categories: true,
  tenant: true,
} satisfies Prisma.BranchInclude;

type BranchWithRelations = Prisma.BranchGetPayload<{ include: typeof branchInclude }>;

export const metadata = {
  title: "Pusat Kawalan Mudah Alih Pengurus | QueNombo SaaS",
  description: "Papan pemuka mudah alih dan kawalan jauh pengurus cawangan.",
};

export default async function ManagerMobilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const tenantId = user.tenantId;

  // Dapatkan senarai cawangan
  let branches: BranchWithRelations[] = [];
  if (user.role === "SUPERADMIN") {
    branches = await prisma.branch.findMany({
      include: branchInclude,
      take: 10,
    });
  } else if (tenantId) {
    branches = await prisma.branch.findMany({
      where: { tenantId },
      include: branchInclude,
    });
  }

  if (branches.length === 0) {
    redirect("/dashboard");
  }

  // Ambil statistik tiket hari ini bagi cawangan pertama (atau cawangan user)
  const activeBranch = branches.find((b) => b.id === user.branchId) || branches[0];
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const [waitingCount, servingCount, completedCount, totalFeedbacks, csatAgg] = await Promise.all([
    prisma.ticket.count({
      where: { branchId: activeBranch.id, status: "WAITING", createdAt: { gte: todayStart } },
    }),
    prisma.ticket.count({
      where: { branchId: activeBranch.id, status: "SERVING", createdAt: { gte: todayStart } },
    }),
    prisma.ticket.count({
      where: { branchId: activeBranch.id, status: "COMPLETED", createdAt: { gte: todayStart } },
    }),
    prisma.feedback.count({
      where: { branchId: activeBranch.id, createdAt: { gte: todayStart } },
    }),
    prisma.feedback.aggregate({
      where: { branchId: activeBranch.id, createdAt: { gte: todayStart } },
      _avg: { rating: true },
    }),
  ]);

  const rawSettings = readJsonObject<BranchSettings>(activeBranch.settings);

  return (
    <ManagerMobileClient
      branches={branches.map((b) => {
        const settings = readJsonObject<BranchSettings>(b.settings);
        return {
          id: b.id,
          name: b.name,
          code: b.code,
          tenantName: b.tenant.name,
          runningText: settings.runningText || "",
          kioskPaused: settings.kioskPaused || false,
          counters: b.counters.map((c) => ({
            id: c.id,
            counterNo: c.counterNo,
            name: c.name || `Kaunter ${c.counterNo}`,
            status: c.status,
            staffName: c.assignedUser?.name || null,
          })),
        };
      })}
      initialActiveBranchId={activeBranch.id}
      initialMetrics={{
        waitingCount,
        servingCount,
        completedCount,
        csatScore: csatAgg._avg.rating ? csatAgg._avg.rating.toFixed(1) : "5.0",
        totalFeedbacks,
        kioskPaused: rawSettings.kioskPaused || false,
        runningText: rawSettings.runningText || "",
      }}
    />
  );
}
