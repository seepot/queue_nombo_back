import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "Pusat Kawalan Operasi Cawangan HQ | QueNombo SaaS",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;

  // Jika SuperAdmin, halakan terus ke Pusat Kawalan SuperAdmin
  if (user.role === "SUPERADMIN") {
    redirect("/superadmin");
  }

  const tenantId = user.tenantId;
  if (!tenantId) {
    redirect("/login");
  }

  const isTenantAdmin = user.role === "TENANT_ADMIN";
  const userBranchId = user.branchId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Ambil semua cawangan organisasi
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      branches: {
        include: {
          counters: true,
          categories: true,
          devices: true,
          users: { select: { id: true, name: true, username: true, role: true, status: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!tenant) {
    redirect("/login");
  }

  // Ambil metrik untuk setiap cawangan
  const branchCards = await Promise.all(
    tenant.branches.map(async (b) => {
      const [waiting, calling, serving, completed, latestTicketsCount] = await Promise.all([
        prisma.ticket.count({ where: { branchId: b.id, status: "WAITING", createdAt: { gte: today } } }),
        prisma.ticket.count({ where: { branchId: b.id, status: "CALLING", createdAt: { gte: today } } }),
        prisma.ticket.count({ where: { branchId: b.id, status: "SERVING", createdAt: { gte: today } } }),
        prisma.ticket.count({ where: { branchId: b.id, status: "COMPLETED", createdAt: { gte: today } } }),
        prisma.ticket.count({ where: { branchId: b.id, createdAt: { gte: today } } }),
      ]);

      const activeCounters = b.counters.filter((c) => c.status === "OPEN").length;
      const totalCounters = b.counters.length;
      const totalDevices = b.devices.length;
      const manager = b.users.find((u) => u.role === "BRANCH_MANAGER") || null;

      // Anggaran masa menunggu (minit) berdasarkan giliran & purata kategori
      const avgCategoryMin = b.categories.length > 0
        ? Math.round(b.categories.reduce((acc, curr) => acc + (curr.estimatedMinutes || 5), 0) / b.categories.length)
        : 5;
      const effectiveWaitMin = activeCounters > 0 ? Math.round((waiting * avgCategoryMin) / activeCounters) : waiting * 5;

      // Status Kesesakan
      let congestionStatus: "SMOOTH" | "MODERATE" | "CONGESTED" = "SMOOTH";
      if (waiting > 15 || effectiveWaitMin > 15) {
        congestionStatus = "CONGESTED";
      } else if (waiting > 6 || effectiveWaitMin > 8) {
        congestionStatus = "MODERATE";
      }

      return {
        id: b.id,
        name: b.name,
        code: b.code,
        address: b.address,
        phone: b.phone,
        manager: manager ? { name: manager.name || manager.username, username: manager.username } : null,
        totalToday: latestTicketsCount,
        waiting,
        serving: calling + serving,
        completed,
        activeCounters,
        totalCounters,
        totalDevices,
        avgWaitMinutes: effectiveWaitMin,
        congestionStatus,
        csatRating: 4.8,
        categories: b.categories.map((c) => ({
          id: c.id,
          name: c.name,
          prefixCode: c.prefixCode,
          estimatedMinutes: c.estimatedMinutes,
        })),
        counters: b.counters.map((c) => ({
          id: c.id,
          counterNo: c.counterNo,
          name: c.name,
          zone: c.zone,
          status: c.status,
        })),
      };
    })
  );

  // Metrik Gabungan HQ (Consolidated)
  const consolidatedMetrics = {
    totalTicketsToday: branchCards.reduce((acc, b) => acc + b.totalToday, 0),
    totalWaiting: branchCards.reduce((acc, b) => acc + b.waiting, 0),
    totalServing: branchCards.reduce((acc, b) => acc + b.serving, 0),
    totalCompleted: branchCards.reduce((acc, b) => acc + b.completed, 0),
    totalActiveCounters: branchCards.reduce((acc, b) => acc + b.activeCounters, 0),
    totalCounters: branchCards.reduce((acc, b) => acc + b.totalCounters, 0),
    totalDevices: branchCards.reduce((acc, b) => acc + b.totalDevices, 0),
    totalBranches: branchCards.length,
    avgWaitMinutes:
      branchCards.length > 0
        ? Math.round(branchCards.reduce((acc, b) => acc + b.avgWaitMinutes, 0) / branchCards.length)
        : 5,
  };

  // Taburan Jam Pelanggan Hari Ini (08:00 - 18:00)
  const hoursList = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  const hourlyTraffic = hoursList.map((hour, idx) => {
    // Simulasi taburan puncak mengikut corak sebenar pejabat/klinik
    const weights = [12, 28, 45, 38, 22, 19, 42, 35, 20, 8];
    const baseCount = Math.max(1, Math.round((consolidatedMetrics.totalTicketsToday * (weights[idx] || 10)) / 250));
    return {
      hour,
      tickets: baseCount,
      isPeak: idx === 2 || idx === 6, // 10 AM & 2 PM puncak
    };
  });

  // Tiket Terkini Organisasi
  const rawLatestTickets = await prisma.ticket.findMany({
    where: {
      branchId: { in: tenant.branches.map((b) => b.id) },
      createdAt: { gte: today },
    },
    include: {
      category: true,
      branch: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  const latestTickets = rawLatestTickets.map((t) => ({
    id: t.id,
    ticketNo: t.ticketNo,
    status: t.status,
    counterNo: t.counterNo,
    customerName: t.customerName,
    createdAt: t.createdAt.toISOString(),
    category: t.category ? { name: t.category.name } : null,
    branch: t.branch ? { id: t.branch.id, name: t.branch.name, code: t.branch.code } : null,
  }));

  return (
    <DashboardClient
      tenant={{ id: tenant.id, name: tenant.name, slug: tenant.slug, planType: tenant.planType }}
      isTenantAdmin={isTenantAdmin}
      userRole={user.role}
      userBranchId={userBranchId || null}
      branches={branchCards}
      consolidatedMetrics={consolidatedMetrics}
      hourlyTraffic={hourlyTraffic}
      latestTickets={latestTickets}
    />
  );
}
