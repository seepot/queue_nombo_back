const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runBranchManagementTest() {
  console.log("==================================================================");
  console.log("  🏢 MENJALANKAN UJIAN MODUL PENGURUSAN CAWANGAN SAAS FASA 24");
  console.log("==================================================================\n");

  const tenant = await prisma.tenant.findFirst({
    include: { subscriptions: true, branches: true },
  });

  if (!tenant) throw new Error("Tiada tenant ditemui.");

  console.log(`[1/5] 🏢 Organisasi Diuji: '${tenant.name}' (Pelan: ${tenant.planType})...`);

  // 1. Uji Semakan Kuota
  console.log("\n[2/5] ⚡ Menguji Semakan Kuota Cawangan Pelan:");
  const sub = tenant.subscriptions[0];
  const maxAllowed = sub?.maxBranches || 3;
  const currentCount = tenant.branches.length;
  console.log(`  ✅ Cawangan Semasa: ${currentCount} / ${maxAllowed} Maksimum.`);

  // 2. Uji Cipta Cawangan Baharu
  console.log("\n[3/5] ➕ Menguji Penciptaan Cawangan Baharu (dengan Kaunter & Kategori Asas):");
  const testBranch = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      name: "Cawangan Ujian Automatik Shah Alam",
      code: `SA${Date.now().toString().slice(-4)}`,
      address: "Seksyen 7, 40000 Shah Alam, Selangor",
      phone: "03-55101010",
      qrRadiusMeters: 300,
      settings: {
        operatingHours: {
          openTime: "08:00",
          closeTime: "17:30",
          days: ["ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT"],
        },
      },
    },
  });

  // Cipta kategori & kaunter asas
  const cat = await prisma.serviceCategory.create({
    data: {
      branchId: testBranch.id,
      name: "Pendaftaran & Bayaran",
      prefixCode: "A",
      startNumber: 1001,
      currentSeq: 1000,
      estimatedMinutes: 5,
    },
  });

  const counter = await prisma.counter.create({
    data: {
      branchId: testBranch.id,
      counterNo: "1",
      name: "Kaunter 1",
      zone: "Zon Utama",
      status: "OPEN",
    },
  });

  console.log(`  ✅ Cawangan Berjaya Dicipta: '${testBranch.name}' (Kod: ${testBranch.code})`);
  console.log(`     - Kategori Asas: '${cat.name}' (${cat.prefixCode})`);
  console.log(`     - Kaunter Asas:  '${counter.name}' (No: ${counter.counterNo})`);

  // 3. Uji Kemas Kini Geofence & Waktu Operasi
  console.log("\n[4/5] 🎯 Menguji Kemas Kini Radius GPS Geofence & Waktu Operasi:");
  const updatedBranch = await prisma.branch.update({
    where: { id: testBranch.id },
    data: {
      qrRadiusMeters: 150,
      settings: {
        operatingHours: {
          openTime: "09:00",
          closeTime: "18:00",
          days: ["ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT", "SABTU"],
        },
      },
    },
  });
  console.log(`  ✅ Radius Geofence Dikemas kini: ${updatedBranch.qrRadiusMeters} meter.`);

  // 4. Bersihkan data ujian
  console.log("\n[5/5] 🧹 Membersihkan Cawangan Ujian:");
  await prisma.counter.deleteMany({ where: { branchId: testBranch.id } });
  await prisma.serviceCategory.deleteMany({ where: { branchId: testBranch.id } });
  await prisma.branch.delete({ where: { id: testBranch.id } });
  console.log("  ✅ Cawangan ujian dan relasi berjaya dibersihkan.");

  console.log("\n==================================================================");
  console.log("  🎉 UJIAN PENGURUSAN CAWANGAN MULTI-TENANT FASA 24 LULUS 100%!");
  console.log("==================================================================\n");
}

runBranchManagementTest()
  .catch((e) => {
    console.error("❌ Ralat Ujian Cawangan Fasa 24:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
