import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isWithinLastMs } from "@/lib/date";
import { DEFAULT_PLATFORM_SETTINGS, readJsonObject, type PlatformSettings, type TenantSettings } from "@/lib/settings";
import SuperadminClient from "./SuperadminClient";

export const metadata = {
  title: "Pusat Kawalan SuperAdmin Enterprise | QueNombo SaaS",
  description: "Papan pemuka eksekutif pengurusan tenant, armada peranti, kewangan & audit global.",
};

export default async function SuperadminPage() {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any;

  if (!user || user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const [
    tenantsRaw,
    totalBranches,
    totalUsers,
    totalTickets,
    rawDevices,
    rawTransactions,
    rawAuditLogs,
    latestSettingLog,
  ] = await Promise.all([
    prisma.tenant.findMany({
      include: {
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
        branches: {
          include: {
            counters: true,
            categories: true,
          },
        },
        users: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: {
            branches: true,
            users: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.branch.count(),
    prisma.user.count(),
    prisma.ticket.count(),
    prisma.device.findMany({
      include: {
        branch: {
          include: {
            tenant: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { lastHeartbeat: "desc" },
    }),
    prisma.paymentTransaction.findMany({
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.auditLog.findMany({
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.auditLog.findFirst({
      where: { action: "PLATFORM_GLOBAL_SETTINGS_UPDATED" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Kira Anggaran MRR
  let estimatedMRR = 0;
  tenantsRaw.forEach((t) => {
    const plan = t.planType;
    if (plan === "STARTER") estimatedMRR += 99;
    else if (plan === "PRO") estimatedMRR += 299;
    else if (plan === "ENTERPRISE") estimatedMRR += 799;
  });

  const twoMinutesMs = 2 * 60 * 1000;

  const devices = rawDevices.map((d) => {
    const isOnline = isWithinLastMs(d.lastHeartbeat, twoMinutesMs) && d.isPaired;
    return {
      id: d.id,
      deviceName: d.deviceName,
      deviceUid: d.deviceUid,
      deviceType: d.deviceType,
      isPaired: d.isPaired,
      ipAddress: d.ipAddress,
      appVersion: d.appVersion,
      branchName: d.branch?.name || "Tiada Cawangan",
      tenantName: d.branch?.tenant?.name || "Sistem",
      lastHeartbeat: d.lastHeartbeat ? d.lastHeartbeat.toISOString() : "",
      isOnline,
    };
  });

  const onlineDevicesCount = devices.filter((d) => d.isOnline).length;

  const tenants = tenantsRaw.map((t) => {
    const sub = t.subscriptions[0];
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      email: t.email,
      phone: t.phone,
      planType: t.planType,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      internalNotes: readJsonObject<TenantSettings>(t.settings).internalNotes || "",
      branchCount: t._count?.branches || 0,
      userCount: t._count?.users || 0,
      ticketCount: t.branches.reduce((acc, b) => acc + (b.counters?.length || 0) * 10, 0),
      subscription: sub
        ? {
            id: sub.id,
            planType: sub.planType,
            status: sub.status,
            billingCycle: sub.billingCycle,
            startDate: sub.startDate.toISOString(),
            endDate: sub.endDate ? sub.endDate.toISOString() : null,
            maxBranches: sub.maxBranches,
            maxCounters: sub.maxCounters,
            maxDisplays: sub.maxDisplays,
            whatsappQuota: sub.whatsappQuota,
            whatsappUsed: sub.whatsappUsed,
          }
        : null,
      branches: t.branches.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        counterCount: b.counters?.length || 0,
        categoryCount: b.categories?.length || 0,
      })),
      users: t.users || [],
    };
  });

  const transactions = rawTransactions.map((tx) => ({
    id: tx.id,
    invoiceNo: tx.invoiceNo,
    tenantName: tx.tenant?.name || "Tidak Diketahui",
    tenantSlug: tx.tenant?.slug || "demo",
    planType: tx.planType,
    billingCycle: tx.billingCycle,
    amount: Number(tx.amount),
    currency: tx.currency,
    status: tx.status,
    paymentMethod: tx.paymentMethod,
    paidAt: tx.paidAt ? tx.paidAt.toISOString() : null,
    createdAt: tx.createdAt.toISOString(),
  }));

  const auditLogs = rawAuditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    tenantName: log.tenant?.name || "Global / System",
    status: log.status,
    details: log.details,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt.toISOString(),
  }));

  const platformSettings = latestSettingLog?.details
    ? readJsonObject<PlatformSettings>(latestSettingLog.details)
    : DEFAULT_PLATFORM_SETTINGS;

  const metrics = {
    totalTenants: tenants.length,
    totalBranches,
    totalUsers,
    totalTickets,
    totalDevices: devices.length,
    onlineDevicesCount,
    estimatedMRR,
  };

  return (
    <SuperadminClient
      tenants={tenants}
      devices={devices}
      transactions={transactions}
      auditLogs={auditLogs}
      platformSettings={platformSettings}
      metrics={metrics}
    />
  );
}
