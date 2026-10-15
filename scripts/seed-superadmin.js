const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulakan penjanaan akaun SuperAdmin dan data permulaan QueNombo...");

  const passwordHash = await bcrypt.hash("admin123", 10);
  // Akaun seed ialah akaun sistem/demo: e-mel dianggap disahkan supaya tindakan bil
  // (checkout, pembatalan) tidak disekat oleh gate pengesahan e-mel, termasuk dalam CI.
  const emailVerifiedAt = new Date();

  // 1. Cipta akaun SuperAdmin
  const superadmin = await prisma.user.upsert({
    where: { username: "superadmin" },
    update: {
      passwordHash,
      role: "SUPERADMIN",
      status: "ACTIVE",
      emailVerifiedAt,
    },
    create: {
      username: "superadmin",
      email: "superadmin@quenombo.com",
      name: "Super Administrator (QueNombo)",
      passwordHash,
      role: "SUPERADMIN",
      status: "ACTIVE",
      emailVerifiedAt,
    },
  });
  console.log(`✅ SuperAdmin sedia: username='${superadmin.username}', password='admin123'`);

  // 2. Cipta Demo Tenant (Pilihan)
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Klinik QueNombo Demo",
      slug: "demo",
      email: "demo@quenombo.com",
      planType: "PRO",
      status: "ACTIVE",
      settings: {
        theme: "light",
        voiceLanguage: "ms-MY",
        runningText: "Selamat Datang ke Klinik QueNombo Demo • Sila pastikan giliran anda dipanggil",
      },
    },
  });

  // 3. Cipta Subscription Demo
  await prisma.subscription.upsert({
    where: { id: "sub-demo-01" },
    update: {},
    create: {
      id: "sub-demo-01",
      tenantId: tenant.id,
      planType: "PRO",
      status: "ACTIVE",
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 tahun
      maxBranches: 3,
      maxCounters: 10,
      maxDisplays: 99,
      whatsappQuota: 300,
      billingCycle: "YEARLY",
    },
  });

  // 4. Cipta Cawangan Demo
  const branch = await prisma.branch.upsert({
    where: { id: "branch-demo-01" },
    update: {},
    create: {
      id: "branch-demo-01",
      tenantId: tenant.id,
      name: "Cawangan Utama (Demo)",
      code: "DEMO01",
      address: "No. 12, Jalan Sultan Ismail, Kuala Lumpur",
      phone: "0312345678",
      qrRadiusMeters: 500,
    },
  });

  // 5. Cipta Kategori Urusan Demo
  const catA = await prisma.serviceCategory.upsert({
    where: { id: "cat-demo-a" },
    update: {},
    create: {
      id: "cat-demo-a",
      branchId: branch.id,
      name: "Pendaftaran & Konsultasi",
      prefixCode: "A",
      startNumber: 1001,
      currentSeq: 1000,
      estimatedMinutes: 5,
      sortOrder: 1,
    },
  });

  const catB = await prisma.serviceCategory.upsert({
    where: { id: "cat-demo-b" },
    update: {},
    create: {
      id: "cat-demo-b",
      branchId: branch.id,
      name: "Pembayaran & Kaunter Ubat",
      prefixCode: "B",
      startNumber: 2001,
      currentSeq: 2000,
      estimatedMinutes: 7,
      sortOrder: 2,
    },
  });

  // 6. Cipta Kaunter Demo
  const counter1 = await prisma.counter.upsert({
    where: { id: "counter-demo-1" },
    update: {},
    create: {
      id: "counter-demo-1",
      branchId: branch.id,
      counterNo: "1",
      name: "Kaunter Konsultasi 1",
      zone: "Zon Rawatan",
      status: "OPEN",
      priorityOrder: "A,B",
    },
  });

  const counter2 = await prisma.counter.upsert({
    where: { id: "counter-demo-2" },
    update: {},
    create: {
      id: "counter-demo-2",
      branchId: branch.id,
      counterNo: "2",
      name: "Kaunter Farmasi 2",
      zone: "Zon Farmasi",
      status: "OPEN",
      priorityOrder: "B,A",
    },
  });

  // 7. Cipta Tenant Admin
  const tenantAdmin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      passwordHash,
      role: "TENANT_ADMIN",
      tenantId: tenant.id,
      branchId: branch.id,
      emailVerifiedAt,
    },
    create: {
      username: "admin",
      email: "admin@demo.com",
      name: "Pengurus Cawangan Demo",
      passwordHash,
      role: "TENANT_ADMIN",
      tenantId: tenant.id,
      branchId: branch.id,
      status: "ACTIVE",
      emailVerifiedAt,
    },
  });

  // 8. Cipta Staf Kaunter
  const staffUser = await prisma.user.upsert({
    where: { username: "staf1" },
    update: {
      passwordHash,
      role: "COUNTER_STAFF",
      tenantId: tenant.id,
      branchId: branch.id,
      emailVerifiedAt,
    },
    create: {
      username: "staf1",
      email: "staf1@demo.com",
      name: "Siti Aminah (Staf Kaunter 1)",
      passwordHash,
      role: "COUNTER_STAFF",
      tenantId: tenant.id,
      branchId: branch.id,
      status: "ACTIVE",
      emailVerifiedAt,
    },
  });

  await prisma.counter.update({
    where: { id: counter1.id },
    data: { assignedUserId: staffUser.id },
  });

  console.log(`✅ Demo Tenant & Staf berjaya dicipta:`);
  console.log(`   - Tenant Admin: username='${tenantAdmin.username}', password='admin123'`);
  console.log(`   - Staf Kaunter 1: username='${staffUser.username}', password='admin123'`);
}

main()
  .catch((e) => {
    console.error("❌ Ralat semasa seed database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
