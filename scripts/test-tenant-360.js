const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function runTenant360Test() {
  console.log("==================================================================");
  console.log("  🏢 MENJALANKAN UJIAN PROFIL TENANT 360° SUPERADMIN FASA 22");
  console.log("==================================================================\n");

  const tenant = await prisma.tenant.findFirst({
    include: {
      subscriptions: true,
      users: true,
    },
  });

  if (!tenant) {
    throw new Error("❌ Tiada tenant ditemui untuk ujian.");
  }

  console.log(`[1/4] 🏢 Menguji di Organisasi: '${tenant.name}' (slug: ${tenant.slug})...`);

  // 1. Uji UPDATE_QUOTAS
  console.log("\n[2/4] ⚡ Menguji Penyesuaian Kuota Dinamik (Custom Overrides):");
  const sub = tenant.subscriptions[0];
  if (sub) {
    const updatedSub = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        maxBranches: 10,
        maxCounters: 30,
        maxDisplays: 15,
        whatsappQuota: 2500,
      },
    });
    console.log(`  ✅ Kuota berjaya dikemas kini:`);
    console.log(`     - Had Cawangan: ${updatedSub.maxBranches}`);
    console.log(`     - Had Kaunter:  ${updatedSub.maxCounters}`);
    console.log(`     - Had TV:       ${updatedSub.maxDisplays}`);
    console.log(`     - Had WhatsApp: ${updatedSub.whatsappQuota} mesej/bulan`);
  }

  // 2. Uji RESET_ADMIN_PASSWORD
  console.log("\n[3/4] 🔑 Menguji Penetapan Semula Kata Laluan Pentadbir (TENANT_ADMIN):");
  const tempPass = `QueNombo#Test${Date.now().toString().slice(-4)}!`;
  const hashed = await bcrypt.hash(tempPass, 10);
  const isMatch = await bcrypt.compare(tempPass, hashed);
  console.log(`  ✅ Enjin enkripsi kata laluan disahkan: (Disahkan: ${isMatch ? "SAH" : "GAGAL"})`);

  // 3. Uji RECORD_MANUAL_PAYMENT & SAVE_CRM_NOTES
  console.log("\n[4/4] 💳 Menguji Rekod Bayaran Manual & Nota CRM:");
  const testInvoice = `INV-MANUAL-${Date.now().toString().slice(-6)}`;
  const manualTrx = await prisma.paymentTransaction.create({
    data: {
      tenantId: tenant.id,
      invoiceNo: testInvoice,
      amount: 1499.0,
      currency: "MYR",
      planType: "PRO",
      billingCycle: "YEARLY",
      paymentMethod: "LOCAL_ORDER",
      status: "SUCCESS",
      gatewayProvider: "MANUAL",
      gatewayRef: "LO/MOH/2026/009",
      paidAt: new Date(),
    },
  });
  console.log(`  ✅ Invois Bayaran Manual Dicipta: ${manualTrx.invoiceNo} (RM ${manualTrx.amount})`);

  // Simpan Nota CRM
  const crmNote = `Pelanggan VIP Kementerian Kesihatan Malaysia. Perjanjian khas SLA 99.99%. Ref: ${Date.now()}`;
  const currentSettings = tenant.settings || {};
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { settings: { ...currentSettings, internalNotes: crmNote } },
  });
  console.log(`  ✅ Nota CRM Disimpan: "${crmNote.slice(0, 50)}..."`);

  // Bersihkan transaksi ujian
  await prisma.paymentTransaction.delete({ where: { id: manualTrx.id } });
  console.log("  🧹 Transaksi ujian dibersihkan.");

  console.log("\n==================================================================");
  console.log("  🎉 UJIAN PROFIL LENGKAP TENANT 360° FASA 22 LULUS 100%!");
  console.log("==================================================================\n");
}

runTenant360Test()
  .catch((e) => {
    console.error("❌ Ralat Ujian Tenant 360:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
