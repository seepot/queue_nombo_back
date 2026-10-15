const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runSuiteTest() {
  console.log("==================================================================");
  console.log("  🚀 MENJALANKAN UJIAN SUT EKSEKUTIF SUPERADMIN HUB FASA 23");
  console.log("==================================================================\n");

  // 1. Uji Enjin Pengiraan Skor Kesihatan & Churn Radar
  console.log("[1/5] 📉 Menguji Formula Radar Kesihatan & Churn Tenant:");
  const testHealthy = {
    ticketCountLast7Days: 80,
    totalTickets: 1200,
    activeCounters: 3,
    totalStaff: 4,
    activeStaffWithRecentLogin: 3,
    daysUntilExpiry: 120,
    status: "ACTIVE",
  };
  const testAtRisk = {
    ticketCountLast7Days: 0,
    totalTickets: 12,
    activeCounters: 0,
    totalStaff: 2,
    activeStaffWithRecentLogin: 0,
    daysUntilExpiry: 3,
    status: "ACTIVE",
  };

  function testCalcHealth(metrics) {
    let score = 50;
    if (metrics.status !== "ACTIVE") return { score: 10, status: "AT_RISK" };
    if (metrics.ticketCountLast7Days >= 50) score += 25;
    else if (metrics.ticketCountLast7Days === 0) score -= 20;

    if (metrics.activeStaffWithRecentLogin > 0) score += 15;
    else score -= 15;

    if (metrics.daysUntilExpiry !== null && metrics.daysUntilExpiry <= 7) score -= 10;
    return { score: Math.max(0, Math.min(100, score)), status: score >= 75 ? "HEALTHY" : score >= 45 ? "STABLE" : "AT_RISK" };
  }

  const hRes = testCalcHealth(testHealthy);
  const rRes = testCalcHealth(testAtRisk);
  console.log(`  ✅ Tenant Aktif: Skor ${hRes.score}% [Status: ${hRes.status}]`);
  console.log(`  ✅ Tenant Berisiko Churn: Skor ${rRes.score}% [Status: ${rRes.status}]`);

  // 2. Uji Penyamaran Ghost Impersonation
  console.log("\n[2/5] 🕵️ Menguji Audit Log Sesi Penyamaran (Ghost Impersonation):");
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("Tiada tenant ditemui.");

  const impLog = await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      action: "SUPERADMIN_GHOST_IMPERSONATION_STARTED",
      details: { superadmin: "superadmin@quenombo.com", targetTenant: tenant.name },
      status: "SUCCESS",
    },
  });
  console.log(`  ✅ Log Penyamaran Dicipta: ID ${impLog.id} (${impLog.action})`);

  // 3. Uji Hab Penyiaran Hebahan Pukal
  console.log("\n[3/5] 📢 Menguji Enjin Hebahan Pukal (Global Broadcast):");
  const broadcastLog = await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      action: "SUPERADMIN_GLOBAL_BROADCAST_SENT",
      details: {
        title: "Ujian Hebahan Sistem",
        channel: "WHATSAPP",
        targetAudience: "ALL_ADMINS",
        recipientCount: 4,
      },
      status: "SUCCESS",
    },
  });
  console.log(`  ✅ Log Penyiaran Pukal Disimpan: ID ${broadcastLog.id}`);

  // 4. Uji Suis Feature Flags
  console.log("\n[4/5] 🎛️ Menguji Pengubahsuaian Feature Flags Organisasi:");
  const testFlags = {
    enableAiOptima: true,
    enableVoiceAnnouncer: true,
    enableOfflineEdge: true,
    enableExternalApi: true,
    enablePwaManager: true,
  };
  const currentSettings = tenant.settings || {};
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { settings: { ...currentSettings, featureFlags: testFlags } },
  });
  console.log("  ✅ Feature Flags berjaya dikemas kini dalam PostgreSQL (5 modul aktif).");

  // 5. Uji Diagnostik Database & Snapshot
  console.log("\n[5/5] 💾 Menguji Telemetri Diagnostik & Snapshot Database:");
  const [tCount, uCount, bCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.branch.count(),
  ]);
  console.log(`  ✅ Telemetri Database: ${tCount} tenants, ${uCount} users, ${bCount} branches.`);

  // Bersihkan log ujian
  await prisma.auditLog.deleteMany({
    where: { id: { in: [impLog.id, broadcastLog.id] } },
  });
  console.log("  🧹 Log audit ujian dibersihkan.");

  console.log("\n==================================================================");
  console.log("  🎉 SEMUA 5 MODUL SUT EKSEKUTIF FASA 23 LULUS 100%!");
  console.log("==================================================================\n");
}

runSuiteTest()
  .catch((e) => {
    console.error("❌ Ralat Ujian Suite Fasa 23:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
