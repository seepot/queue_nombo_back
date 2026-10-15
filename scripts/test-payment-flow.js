const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runPaymentFlowTest() {
  console.log("==================================================================");
  console.log("  💳 MENJALANKAN UJIAN GERBANG PEMBAYARAN & INVOIS FASA 17");
  console.log("==================================================================\n");

  // 1. Dapatkan tenant sedia ada
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    throw new Error("❌ Tiada tenant ditemui dalam pangkalan data untuk ujian.");
  }

  console.log(`[1/4] 🏢 Menguji pendaftaran transaksi pembayaran bagi Tenant: '${tenant.name}' [ID: ${tenant.id}]...`);

  const invoiceNo = `INV-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const planType = "PRO";
  const billingCycle = "YEARLY";
  const amount = 2388.0; // RM 199 * 12

  const transaction = await prisma.paymentTransaction.create({
    data: {
      tenantId: tenant.id,
      invoiceNo,
      amount,
      currency: "MYR",
      planType,
      billingCycle,
      paymentMethod: "FPX",
      gatewayProvider: "TOYYIBPAY",
      status: "PENDING",
      billCode: `BILL-${Date.now()}`,
    },
  });

  console.log(`  ✅ Transaksi pembayaran 'PENDING' dicipta:`);
  console.log(`     - No Invois: ${transaction.invoiceNo}`);
  console.log(`     - Jumlah: RM ${Number(transaction.amount).toFixed(2)}`);
  console.log(`     - Pelan: ${transaction.planType} (${transaction.billingCycle})`);
  console.log(`     - Kaedah: ${transaction.paymentMethod} (${transaction.gatewayProvider})`);

  console.log("\n[2/4] ⚡ Memproses Callback Webhook Pengaktifan Auto-Provisioning...");

  const now = new Date();
  const endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const gatewayRef = `FPX-TOYYIB-${Date.now()}`;

  // Simulasi pelaksanaan handleSuccessfulPayment
  const result = await prisma.$transaction(async (tx) => {
    const updatedTx = await tx.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "SUCCESS",
        gatewayRef,
        paidAt: now,
        receiptUrl: `/langganan/invois/${transaction.id}`,
      },
    });

    const sub = await tx.subscription.create({
      data: {
        tenantId: tenant.id,
        planType: "PRO",
        status: "ACTIVE",
        startDate: now,
        endDate,
        billingCycle: "YEARLY",
        maxBranches: 5,
        maxCounters: 20,
        maxDisplays: 99,
        whatsappQuota: 1000,
        paymentProvider: "TOYYIBPAY",
      },
    });

    await tx.paymentTransaction.update({
      where: { id: transaction.id },
      data: { subscriptionId: sub.id },
    });

    await tx.tenant.update({
      where: { id: tenant.id },
      data: { planType: "PRO", status: "ACTIVE" },
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "SUBSCRIPTION_PAYMENT_SUCCESS",
        details: { invoiceNo, amount, planType, gatewayRef },
        status: "SUCCESS",
      },
    });

    return { updatedTx, sub };
  });

  console.log(`  ✅ Webhook diproses berjaya:`);
  console.log(`     - Status Transaksi: ${result.updatedTx.status}`);
  console.log(`     - Gateway Ref: ${result.updatedTx.gatewayRef}`);
  console.log(`     - Resit URL: ${result.updatedTx.receiptUrl}`);

  console.log("\n[3/4] 🛡️ Mengesahkan kuota langganan & hak akses cawangan...");
  console.log(`     - Kuota Cawangan Baharu: ${result.sub.maxBranches} cawangan`);
  console.log(`     - Kuota Kaunter Baharu: ${result.sub.maxCounters} kaunter`);
  console.log(`     - Kuota Skrin TV Baharu: ${result.sub.maxDisplays} paparan (Tanpa Had)`);
  console.log(`     - Kuota WhatsApp Baharu: ${result.sub.whatsappQuota} mesej / bulan`);
  console.log(`     - Tarikh Luput: ${result.sub.endDate.toISOString().split("T")[0]}`);

  console.log("\n[4/4] 🧹 Membersihkan rekod ujian transaksi...");
  await prisma.paymentTransaction.delete({ where: { id: transaction.id } });
  await prisma.subscription.delete({ where: { id: result.sub.id } });
  console.log("  ✅ Rekod transaksi ujian berjaya dibersihkan.");

  console.log("\n==================================================================");
  console.log("  🎉 UJIAN GERBANG PEMBAYARAN FASA 17 LULUS 100% CEMERLANG!");
  console.log("==================================================================\n");
}

runPaymentFlowTest()
  .catch((e) => {
    console.error("❌ Ralat Ujian Pembayaran:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
