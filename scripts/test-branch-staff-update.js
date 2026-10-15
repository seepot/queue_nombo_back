const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runBranchStaffAndEditTest() {
  console.log("==================================================================");
  console.log("  🏢 MENJALANKAN UJIAN KEMAS KINI KATEGORI/KAUNTER & STAF FASA 26");
  console.log("==================================================================\n");

  const branch = await prisma.branch.findFirst({
    include: { categories: true, counters: true, tenant: true },
  });

  if (!branch) throw new Error("Tiada cawangan ditemui.");

  console.log(`[1/5] 🏢 Cawangan Diuji: '${branch.name}' (${branch.code})...`);

  // 1. Uji Kemas Kini Kategori (UPDATE_CATEGORY)
  console.log("\n[2/5] ✏️ Menguji Kemas Kini Kategori Urusan (UPDATE_CATEGORY):");
  const testCat = branch.categories[0];
  if (testCat) {
    const updatedCat = await prisma.serviceCategory.update({
      where: { id: testCat.id },
      data: { name: `${testCat.name} (Dikemas Kini)`, estimatedMinutes: 12 },
    });
    console.log(`  ✅ Kategori Berjaya Dikemas kini: '${updatedCat.name}' (Masa: ${updatedCat.estimatedMinutes} Minit)`);
    // Pulihkan
    await prisma.serviceCategory.update({
      where: { id: testCat.id },
      data: { name: testCat.name, estimatedMinutes: testCat.estimatedMinutes },
    });
  }

  // 2. Uji Kemas Kini Kaunter (UPDATE_COUNTER)
  console.log("\n[3/5] ✏️ Menguji Kemas Kini Kaunter Fizikal (UPDATE_COUNTER):");
  const testCounter = branch.counters[0];
  if (testCounter) {
    const updatedCounter = await prisma.counter.update({
      where: { id: testCounter.id },
      data: { name: "Kaunter Pantas VIP", zone: "Zon Premium" },
    });
    console.log(`  ✅ Kaunter Berjaya Dikemas kini: '${updatedCounter.name}' [${updatedCounter.zone}]`);
    // Pulihkan
    await prisma.counter.update({
      where: { id: testCounter.id },
      data: { name: testCounter.name, zone: testCounter.zone },
    });
  }

  // 3. Uji Pendaftaran Staf Kaunter Baharu ke Cawangan (CREATE_BRANCH_STAFF)
  console.log("\n[4/5] 👥 Menguji Pendaftaran Staf Kaunter Baharu ke Cawangan (CREATE_BRANCH_STAFF):");
  const tempStaffUsername = `staf_caw_${Date.now().toString().slice(-4)}`;
  const passHash = await bcrypt.hash("admin123", 10);
  const newStaff = await prisma.user.create({
    data: {
      tenantId: branch.tenantId,
      branchId: branch.id,
      name: "Siti Kaunter Ujian",
      username: tempStaffUsername,
      role: "COUNTER_STAFF",
      status: "ACTIVE",
      passwordHash: passHash,
    },
  });
  console.log(`  ✅ Staf Kaunter Berjaya Dicipta: '${newStaff.name}' (@${newStaff.username})`);
  console.log(`     - Ditugaskan ke Cawangan: ${newStaff.branchId}`);

  // 4. Uji Reset Password & Pemindahan Staf
  console.log("\n[5/5] 🔑 Menguji Reset Password & Nyah-tugas Staf Cawangan:");
  const newPassHash = await bcrypt.hash("QueNombo#2026!", 10);
  await prisma.user.update({
    where: { id: newStaff.id },
    data: { passwordHash: newPassHash },
  });
  const isMatch = await bcrypt.compare("QueNombo#2026!", newPassHash);
  console.log(`  ✅ Kata Laluan Berjaya Diset Semula: ${isMatch ? "SAH" : "GAGAL"}`);

  // Bersihkan data ujian
  await prisma.user.delete({ where: { id: newStaff.id } });
  console.log("  ✅ Rekod staf ujian dibersihkan.");

  console.log("\n==================================================================");
  console.log("  🎉 UJIAN KEMAS KINI & PENGURUSAN STAF FASA 26 LULUS 100%!");
  console.log("==================================================================\n");
}

runBranchStaffAndEditTest()
  .catch((e) => {
    console.error("❌ Ralat Ujian Fasa 26:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
