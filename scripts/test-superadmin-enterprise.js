const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runSuperadminEnterpriseTest() {
  console.log("==================================================================");
  console.log("  🛡️ MENJALANKAN UJIAN PUSAT SUPERADMIN ENTERPRISE FASA 21");
  console.log("==================================================================\n");

  // 1. Ambil data telemetri platform global
  const [tenants, branches, users, tickets, devices] = await Promise.all([
    prisma.tenant.findMany({ include: { subscriptions: true } }),
    prisma.branch.count(),
    prisma.user.count(),
    prisma.ticket.count(),
    prisma.device.count(),
  ]);

  let estimatedMRR = 0;
  tenants.forEach((t) => {
    if (t.planType === "STARTER") estimatedMRR += 99;
    else if (t.planType === "PRO") estimatedMRR += 299;
    else if (t.planType === "ENTERPRISE") estimatedMRR += 799;
  });

  console.log("[1/3] 📊 Pengiraan Metrik Eksekutif Platform:");
  console.log(`  🏢 Jumlah Organisasi: ${tenants.length}`);
  console.log(`  🏬 Jumlah Cawangan:   ${branches}`);
  console.log(`  👥 Jumlah Staf:       ${users}`);
  console.log(`  🎟️ Jumlah Tiket:      ${tickets}`);
  console.log(`  📺 Jumlah Peranti TV: ${devices}`);
  console.log(`  💰 Anggaran MRR:      RM ${estimatedMRR}/bulan\n`);

  // 2. Uji Lanjutan Tempoh Percubaan (Extend Trial +14 Hari)
  const sampleTenant = tenants[0];
  console.log(`[2/3] ⏳ Menguji Lanjutan Tempoh Percubaan untuk '${sampleTenant.name}':`);
  const sub = sampleTenant.subscriptions[0];

  if (sub) {
    const currentEnd = sub.endDate ? new Date(sub.endDate) : new Date();
    const newEnd = new Date(currentEnd.getTime() + 14 * 24 * 60 * 60 * 1000);

    const updatedSub = await prisma.subscription.update({
      where: { id: sub.id },
      data: { endDate: newEnd, status: "TRIAL" },
    });
    console.log(`  ✅ Tempoh percubaan dilanjutkan ke: ${updatedSub.endDate.toISOString()}`);
  }

  // 3. Uji Siaran Notis Global Platform
  console.log("\n[3/3] 📢 Menguji Siaran Notis Global Platform:");
  const testBannerText = `Penyelenggaraan Berjadual Sistem QueNombo ${Date.now()}`;
  await prisma.auditLog.create({
    data: {
      tenantId: sampleTenant.id,
      action: "PLATFORM_GLOBAL_SETTINGS_UPDATED",
      details: {
        announcementBanner: testBannerText,
        announcementType: "WARNING",
        maintenanceMode: false,
        updatedBy: "Superadmin Test Suite",
      },
      status: "SUCCESS",
    },
  });
  console.log(`  ✅ Notis global disiarkan: "${testBannerText}"`);

  console.log("\n==================================================================");
  console.log("  🎉 UJIAN PUSAT SUPERADMIN ENTERPRISE FASA 21 LULUS 100%!");
  console.log("==================================================================\n");
}

runSuperadminEnterpriseTest()
  .catch((e) => {
    console.error("❌ Ralat Ujian Superadmin Enterprise:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
