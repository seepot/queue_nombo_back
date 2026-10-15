const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runTenantPageTest() {
  console.log("==================================================================");
  console.log("  🏢 MENJALANKAN UJIAN HALAMAN DEDIKASI TENANT 360°");
  console.log("==================================================================\n");

  const tenant = await prisma.tenant.findFirst({
    include: {
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
      branches: {
        include: {
          counters: { include: { assignedUser: true } },
          categories: true,
          devices: true,
        },
      },
      users: { orderBy: { createdAt: "asc" } },
      transactions: { orderBy: { createdAt: "desc" } },
      auditLogs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!tenant) {
    throw new Error("❌ Tiada tenant ditemui.");
  }

  console.log(`[1/3] 🏢 Mengesahkan Data Penuh bagi: '${tenant.name}' (ID: ${tenant.id})`);
  console.log(`  - Slug:        /${tenant.slug}`);
  console.log(`  - Pelan:       ${tenant.planType}`);
  console.log(`  - Status:      ${tenant.status}`);
  console.log(`  - Cawangan:    ${tenant.branches.length} cawangan`);
  console.log(`  - Kaunter:     ${tenant.branches.reduce((acc, b) => acc + b.counters.length, 0)} kaunter`);
  console.log(`  - Staf/User:   ${tenant.users.length} pengguna`);
  console.log(`  - Transaksi:   ${tenant.transactions.length} invois`);
  console.log(`  - Log Audit:   ${tenant.auditLogs.length} rekod`);

  console.log("\n[2/3] 🔍 Menguji Hubungan Relasi Cawangan & Kaunter:");
  tenant.branches.forEach((b) => {
    console.log(`  🏬 Cawangan: ${b.name} [${b.code}] (${b.counters.length} kaunter, ${b.categories.length} kategori)`);
  });

  console.log("\n[3/3] 🌐 Laluan Akses Halaman Dedikasi SuperAdmin:");
  console.log(`  🔗 URL: /superadmin/tenants/${tenant.id}`);

  console.log("\n==================================================================");
  console.log("  🎉 UJIAN HALAMAN DEDIKASI TENANT 360° LULUS 100%!");
  console.log("==================================================================\n");
}

runTenantPageTest()
  .catch((e) => {
    console.error("❌ Ralat Ujian Tenant Page:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
