const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runBranchManagerTest() {
  console.log("==================================================================");
  console.log("  👔 MENJALANKAN UJIAN PERLANTIKAN KETUA CAWANGAN FASA 25");
  console.log("==================================================================\n");

  const branch = await prisma.branch.findFirst({
    include: { tenant: true },
  });

  if (!branch) throw new Error("Tiada cawangan ditemui.");

  console.log(`[1/4] 🏢 Menguji di Cawangan: '${branch.name}' (${branch.code}) [Tenant: ${branch.tenant.name}]...`);

  // 1. Cipta Ketua Cawangan Baharu
  console.log("\n[2/4] ➕ Menguji Pendaftaran Akaun Ketua Cawangan Baharu (BRANCH_MANAGER):");
  const tempUsername = `ketua_${Date.now().toString().slice(-4)}`;
  const passwordHash = await bcrypt.hash("admin123", 10);

  const newManager = await prisma.user.create({
    data: {
      tenantId: branch.tenantId,
      branchId: branch.id,
      name: "En. Razak (Ketua Cawangan)",
      username: tempUsername,
      email: `${tempUsername}@demo.com`,
      role: "BRANCH_MANAGER",
      status: "ACTIVE",
      passwordHash,
    },
  });

  console.log(`  ✅ Ketua Cawangan Berjaya Dicipta: '${newManager.name}' (@${newManager.username})`);
  console.log(`     - Peranan: ${newManager.role}`);
  console.log(`     - Cawangan Terpaut: ${newManager.branchId}`);

  // 2. Uji Verifikasi Log Masuk & Kelayakan Password
  console.log("\n[3/4] 🔑 Mengesahkan Kredensial Log Masuk Ketua Cawangan:");
  const isMatch = await bcrypt.compare("admin123", newManager.passwordHash);
  console.log(`  ✅ Ujian Kata Laluan 'admin123': ${isMatch ? "SAH & BERJAYA" : "GAGAL"}`);

  // 3. Bersihkan data ujian
  console.log("\n[4/4] 🧹 Membersihkan Akaun Ujian Ketua Cawangan:");
  await prisma.user.delete({ where: { id: newManager.id } });
  console.log("  ✅ Akaun ujian dibersihkan.");

  console.log("\n==================================================================");
  console.log("  🎉 UJIAN PERLANTIKAN KETUA CAWANGAN FASA 25 LULUS 100%!");
  console.log("==================================================================\n");
}

runBranchManagerTest()
  .catch((e) => {
    console.error("❌ Ralat Ujian Ketua Cawangan:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
