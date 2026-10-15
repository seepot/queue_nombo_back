import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readJsonObject, type BranchSettings } from "@/lib/settings";
import BranchManagementClient from "./BranchManagementClient";

export const metadata = {
  title: "Pusat Pengurusan Cawangan | QueNombo SaaS",
};

export default async function BranchManagementPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const tenantId = user.tenantId;

  let tenant = null;

  if (tenantId) {
    tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
        branches: {
          include: {
            counters: { orderBy: { counterNo: "asc" } },
            categories: { orderBy: { sortOrder: "asc" } },
            devices: true,
            users: { select: { id: true, name: true, username: true, role: true, status: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  } else if (user.role === "SUPERADMIN") {
    tenant = await prisma.tenant.findFirst({
      include: {
        subscriptions: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } },
        branches: {
          include: {
            counters: { orderBy: { counterNo: "asc" } },
            categories: { orderBy: { sortOrder: "asc" } },
            devices: true,
            users: { select: { id: true, name: true, username: true, role: true, status: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  if (!tenant) {
    redirect("/superadmin");
  }

  const sub = tenant.subscriptions[0];
  const maxBranches = sub?.maxBranches || 1;

  // Dapatkan statistik tiket hari ini bagi setiap cawangan
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const branchesWithMetrics = await Promise.all(
    tenant.branches.map(async (b) => {
      const todayTicketsCount = await prisma.ticket.count({
        where: { branchId: b.id, createdAt: { gte: today } },
      });

      const settings = readJsonObject<BranchSettings>(b.settings);
      const manager = b.users.find((u) => u.role === "BRANCH_MANAGER") || null;

      return {
        id: b.id,
        name: b.name,
        code: b.code,
        address: b.address,
        phone: b.phone,
        latitude: b.latitude || null,
        longitude: b.longitude || null,
        qrRadiusMeters: b.qrRadiusMeters || 500,
        operatingHours: settings.operatingHours || {
          openTime: "08:30",
          closeTime: "17:00",
          days: ["ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT"],
        },
        manager: manager
          ? {
              id: manager.id,
              name: manager.name,
              username: manager.username,
              role: manager.role,
              status: manager.status,
            }
          : null,
        counters: b.counters.map((c) => ({
          id: c.id,
          counterNo: c.counterNo,
          name: c.name,
          zone: c.zone,
          priorityOrder: c.priorityOrder,
          status: c.status,
        })),
        categories: b.categories.map((c) => ({
          id: c.id,
          name: c.name,
          prefixCode: c.prefixCode,
          startNumber: c.startNumber,
          currentSeq: c.currentSeq,
          estimatedMinutes: c.estimatedMinutes,
          nextCategoryId: c.nextCategoryId || null,
        })),
        devices: b.devices.map((d) => ({
          id: d.id,
          deviceName: d.deviceName,
          deviceType: d.deviceType,
          isPaired: d.isPaired,
          lastHeartbeat: d.lastHeartbeat ? d.lastHeartbeat.toISOString() : null,
        })),
        users: b.users,
        todayTicketsCount,
      };
    })
  );

  const allTenantStaff = await prisma.user.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      branchId: true,
      status: true,
    },
    orderBy: { name: "asc" },
  });

  const tenantInfo = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    planType: tenant.planType,
    maxBranches,
    usedBranches: tenant.branches.length,
  };

  return (
    <BranchManagementClient
      tenant={tenantInfo}
      branches={branchesWithMetrics}
      allStaff={allTenantStaff}
    />
  );
}
