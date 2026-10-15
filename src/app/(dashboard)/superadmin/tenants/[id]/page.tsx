import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { daysAgo, daysUntil } from "@/lib/date";
import { readJsonObject, type TenantSettings } from "@/lib/settings";
import TenantProfileClient from "./TenantProfileClient";

export const metadata = {
  title: "Profil Lengkap Tenant 360° | Pusat SuperAdmin QueNombo",
  description: "Pengurusan terperinci profil penyewa, kuota sumber, staf, invois dan keselamatan.",
};

export default async function TenantProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any;

  if (!user || user.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
      branches: {
        include: {
          counters: {
            include: { assignedUser: true },
          },
          categories: true,
          devices: true,
        },
      },
      users: {
        include: {
          branch: { select: { name: true, code: true } },
          counters: { select: { id: true, counterNo: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      _count: {
        select: {
          branches: true,
          users: true,
          transactions: true,
        },
      },
    },
  });

  if (!tenant) {
    notFound();
  }

  // Hitung jumlah tiket bagi tenant ini
  const ticketCount = await prisma.ticket.count({
    where: { branch: { tenantId: tenant.id } },
  });

  const sevenDaysAgo = daysAgo(7);
  const ticketCountLast7Days = await prisma.ticket.count({
    where: { branch: { tenantId: tenant.id }, createdAt: { gte: sevenDaysAgo } },
  });

  const sub = tenant.subscriptions[0];
  const settings = readJsonObject<TenantSettings>(tenant.settings);

  const daysUntilExpiry = daysUntil(sub?.endDate);

  const activeStaffWithRecentLogin = tenant.users.filter(
    (u) => u.lastLogin && new Date(u.lastLogin) >= sevenDaysAgo
  ).length;

  const defaultFlags = {
    enableAiOptima: true,
    enableVoiceAnnouncer: true,
    enableOfflineEdge: true,
    enableExternalApi: false,
    enablePwaManager: true,
  };
  const featureFlags = { ...defaultFlags, ...(settings.featureFlags || {}) };

  const tenantData = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    email: tenant.email,
    phone: tenant.phone,
    planType: tenant.planType,
    status: tenant.status,
    createdAt: tenant.createdAt.toISOString(),
    internalNotes: settings.internalNotes || "",
    ticketCount,
    ticketCountLast7Days,
    daysUntilExpiry,
    activeStaffWithRecentLogin,
    featureFlags,
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
    branches: tenant.branches.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      address: b.address,
      phone: b.phone,
      counters: b.counters.map((c) => ({
        id: c.id,
        counterNo: c.counterNo,
        name: c.name || `Kaunter ${c.counterNo}`,
        status: c.status,
        staffName: c.assignedUser?.name || null,
      })),
      categories: b.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        prefixCode: cat.prefixCode,
      })),
      devices: b.devices.map((d) => ({
        id: d.id,
        deviceName: d.deviceName,
        deviceType: d.deviceType,
        isPaired: d.isPaired,
      })),
    })),
    users: tenant.users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      phone: u.phone || null,
      role: u.role,
      status: u.status,
      branchName: u.branch ? `${u.branch.name} [${u.branch.code}]` : null,
      assignedCounters: u.counters?.map((c) => c.name || `Kaunter ${c.counterNo}`) || [],
      lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
    })),
    transactions: tenant.transactions.map((tx) => ({
      id: tx.id,
      invoiceNo: tx.invoiceNo,
      amount: Number(tx.amount),
      currency: tx.currency,
      planType: tx.planType,
      billingCycle: tx.billingCycle,
      paymentMethod: tx.paymentMethod,
      status: tx.status,
      paidAt: tx.paidAt ? tx.paidAt.toISOString() : null,
      createdAt: tx.createdAt.toISOString(),
    })),
    auditLogs: tenant.auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      status: log.status,
      details: log.details,
      createdAt: log.createdAt.toISOString(),
    })),
  };

  return <TenantProfileClient tenant={tenantData} />;
}
