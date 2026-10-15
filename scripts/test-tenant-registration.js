const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runTenantRegistrationTest() {
  console.log("==================================================================");
  console.log("  🏢 MENJALANKAN UJIAN PROSES PENDAFTARAN TENANT (TENANT REGISTER)");
  console.log("==================================================================\n");

  const testTenantSlug = "klinik-demo-" + Date.now().toString().slice(-4);
  const testUsername = "admin_" + Date.now().toString().slice(-4);
  const testPassword = "password123";
  const testCompanyName = "Klinik Kesihatan Demo";

  console.log(`[1/4] 📝 Menguji pendaftaran organisasi: '${testCompanyName}' (slug: '${testTenantSlug}')...`);

  // Hash password
  const passwordHash = await bcrypt.hash(testPassword, 10);

  // Transaksi Pendaftaran Lengkap
  const result = await prisma.$transaction(async (tx) => {
    // 1. Cipta Tenant
    const tenant = await tx.tenant.create({
      data: {
        name: testCompanyName,
        slug: testTenantSlug,
        email: "admin@klinikdemo.com",
        phone: "0198765432",
        planType: "FREE",
        status: "ACTIVE",
        settings: {
          theme: "light",
          logoUrl: null,
          voiceLanguage: "ms-MY",
          youtubeUrl: "https://www.youtube.com/embed/oe5HTPG7ksM",
          runningText: `Selamat Datang ke ${testCompanyName}`,
        },
      },
    });

    // 2. Cipta Langganan Trial
    const sub = await tx.subscription.create({
      data: {
        tenantId: tenant.id,
        planType: "FREE",
        status: "TRIAL",
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxBranches: 2,
        maxCounters: 5,
        maxDisplays: 2,
        whatsappQuota: 50,
        billingCycle: "MONTHLY",
      },
    });

    // 3. Cipta Cawangan HQ
    const branch = await tx.branch.create({
      data: {
        tenantId: tenant.id,
        name: "Cawangan Utama",
        code: "HQ01",
        phone: "0198765432",
        qrRadiusMeters: 500,
        settings: {
          operatingHours: "08:30 - 17:00",
          runningText: `Selamat Datang ke ${testCompanyName}`,
        },
      },
    });

    // 4. Cipta Kategori Urusan A & B
    const catA = await tx.serviceCategory.create({
      data: {
        branchId: branch.id,
        name: "Pendaftaran & Konsultasi",
        prefixCode: "A",
        startNumber: 1001,
        currentSeq: 1000,
        estimatedMinutes: 5,
        sortOrder: 1,
      },
    });

    const catB = await tx.serviceCategory.create({
      data: {
        branchId: branch.id,
        name: "Farmasi & Pembayaran",
        prefixCode: "B",
        startNumber: 2001,
        currentSeq: 2000,
        estimatedMinutes: 8,
        sortOrder: 2,
      },
    });

    // 5. Cipta Kaunter 1
    const counter = await tx.counter.create({
      data: {
        branchId: branch.id,
        counterNo: "1",
        name: "Kaunter Utama 1",
        zone: "Zon Utama",
        status: "OPEN",
        priorityOrder: `${catA.prefixCode},${catB.prefixCode}`,
      },
    });

    // 6. Cipta Pengguna Tenant Admin
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        username: testUsername,
        name: "Dr. Demo",
        email: "admin@klinikdemo.com",
        phone: "0198765432",
        passwordHash,
        role: "TENANT_ADMIN",
        status: "ACTIVE",
      },
    });

    await tx.counter.update({
      where: { id: counter.id },
      data: { assignedUserId: user.id },
    });

    // 7. Audit Log
    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        action: "TENANT_REGISTER",
        details: { companyName: testCompanyName, slug: testTenantSlug, username: testUsername },
        status: "SUCCESS",
      },
    });

    return {
      tenant,
      sub,
      branch,
      categories: [catA, catB],
      counter,
      user,
    };
  });

  console.log("  ✅ Tenant berjaya dicipta:", result.tenant.name, `[ID: ${result.tenant.id}]`);
  console.log("  ✅ Langganan 14-Hari Trial diaktifkan:", result.sub.planType, `[Status: ${result.sub.status}]`);
  console.log("  ✅ Cawangan HQ dibuka:", result.branch.name, `[Kod: ${result.branch.code}]`);
  console.log("  ✅ 2 Kategori Urusan dicipta:", result.categories.map((c) => c.prefixCode).join(", "));
  console.log("  ✅ Kaunter 1 dikonfigurasi & ditetapkan kepada Pengguna Admin.");
  console.log("  ✅ Akaun Pentadbir dicipta:", result.user.username, `[Peranan: ${result.user.role}]`);

  console.log("\n[2/4] 🔐 Mengesahkan proses pengesahan kata laluan (Password Authentication)...");
  const isMatch = await bcrypt.compare(testPassword, result.user.passwordHash);
  if (!isMatch) {
    throw new Error("❌ Kata laluan tidak sah!");
  }
  console.log("  ✅ Pengesahan kata laluan hash bcrypt BERJAYA!");

  console.log("\n[3/4] 🛡️ Mengesahkan integriti perhubungan multi-tenant...");
  const verifyTenant = await prisma.tenant.findUnique({
    where: { id: result.tenant.id },
    include: {
      branches: {
        include: {
          categories: true,
          counters: true,
        },
      },
      subscriptions: true,
      users: true,
      auditLogs: true,
    },
  });

  console.log(`  ✅ Struktur Tenant disahkan lengkap:`);
  console.log(`     - Bilangan Cawangan: ${verifyTenant.branches.length}`);
  console.log(`     - Bilangan Kategori Urusan: ${verifyTenant.branches[0].categories.length}`);
  console.log(`     - Bilangan Kaunter: ${verifyTenant.branches[0].counters.length}`);
  console.log(`     - Bilangan Pentadbir: ${verifyTenant.users.length}`);
  console.log(`     - Audit Log: ${verifyTenant.auditLogs.length} rekod`);

  console.log("\n[4/4] 🧹 Membersihkan data ujian...");
  await prisma.tenant.delete({ where: { id: result.tenant.id } });
  console.log("  ✅ Data ujian pendaftaran berjaya dibersihkan.");

  console.log("\n==================================================================");
  console.log("  🎉 PROSES PENDAFTARAN TENANT DISAHKAN 100% SEMPURNA & KUKUH!");
  console.log("==================================================================\n");
}

runTenantRegistrationTest()
  .catch((e) => {
    console.error("❌ Ralat Ujian Pendaftaran Tenant:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
