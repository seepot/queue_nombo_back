/**
 * Ujian keselamatan bil (jalankan semasa `npm run dev` aktif).
 *  - webhook tanpa/salah rahsia ditolak, dengan rahsia diproses
 *  - callback gaya ToyyibPay dengan billcode tidak dikenali -> 404
 *  - checkout tanpa sesi -> 401
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const SECRET = process.env.BILLING_WEBHOOK_SECRET;

function assert(cond, msg) {
  if (!cond) throw new Error(`❌ ${msg}`);
  console.log(`  ✅ ${msg}`);
}

async function main() {
  console.log("==================================================================");
  console.log("  💳 UJIAN KESELAMATAN WEBHOOK & CHECKOUT");
  console.log("==================================================================\n");
  if (!SECRET) throw new Error("BILLING_WEBHOOK_SECRET tiada dalam .env");

  const tenant = await prisma.tenant.findUnique({ where: { slug: "demo" } });
  if (!tenant) throw new Error("Tenant demo tidak ditemui.");
  const subBefore = await prisma.subscription.findFirst({ where: { tenantId: tenant.id }, orderBy: { createdAt: "desc" } });

  const tx = await prisma.paymentTransaction.create({
    data: {
      tenantId: tenant.id,
      invoiceNo: `INV-TEST-${Date.now()}`,
      amount: 249.0,
      currency: "MYR",
      planType: "PRO",
      billingCycle: "MONTHLY",
      paymentMethod: "SANDBOX",
      gatewayProvider: "SIMULATOR",
      status: "PENDING",
      billCode: `BILL-TEST-${Date.now()}`,
    },
  });

  try {
    console.log("[1/4] Checkout tanpa sesi...");
    let res = await fetch(`${BASE}/api/billing/checkout`, {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planType: "PRO", paymentMethod: "SANDBOX", autoConfirm: true }),
    });
    // Proxy mengubah hala permintaan tanpa sesi ke /login (3xx); laluan sendiri membalas 401
    assert(res.status === 401 || (res.status >= 300 && res.status < 400), `checkout tanpa log masuk disekat (dapat ${res.status})`);

    console.log("[2/4] Webhook generik tanpa / salah rahsia...");
    res = await fetch(`${BASE}/api/billing/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: tx.id, status: "SUCCESS" }),
    });
    assert(res.status === 401, `tanpa rahsia -> 401 (dapat ${res.status})`);
    res = await fetch(`${BASE}/api/billing/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-billing-secret": "salah" },
      body: JSON.stringify({ transactionId: tx.id, status: "SUCCESS" }),
    });
    assert(res.status === 401, `rahsia salah -> 401 (dapat ${res.status})`);
    const stillPending = await prisma.paymentTransaction.findUnique({ where: { id: tx.id } });
    assert(stillPending.status === "PENDING", "transaksi kekal PENDING selepas percubaan tanpa rahsia");

    console.log("[3/4] Callback gaya ToyyibPay dengan billcode tidak dikenali...");
    res = await fetch(`${BASE}/api/billing/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ billcode: "xxxxxxxx", status: "1", refno: "R1", order_id: "INV-TIADA" }),
    });
    assert(res.status === 404, `billcode tidak dikenali -> 404 (dapat ${res.status})`);

    console.log("[4/4] Webhook generik dengan rahsia yang betul...");
    res = await fetch(`${BASE}/api/billing/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-billing-secret": SECRET },
      body: JSON.stringify({ transactionId: tx.id, status: "SUCCESS", gatewayRef: "TEST-REF" }),
    });
    const data = await res.json();
    assert(res.status === 200 && data.status === "SUCCESS", `rahsia betul -> SUCCESS (dapat ${res.status})`);
    const paid = await prisma.paymentTransaction.findUnique({ where: { id: tx.id } });
    assert(paid.status === "SUCCESS" && paid.paidAt, "transaksi ditanda SUCCESS dalam DB");

    console.log("\n🎉 SEMUA UJIAN KESELAMATAN BIL LULUS");
  } finally {
    // Pulihkan langganan asal tenant demo & padam transaksi ujian
    if (subBefore) {
      await prisma.subscription.update({
        where: { id: subBefore.id },
        data: {
          planType: subBefore.planType,
          status: subBefore.status,
          startDate: subBefore.startDate,
          endDate: subBefore.endDate,
          billingCycle: subBefore.billingCycle,
          maxBranches: subBefore.maxBranches,
          maxCounters: subBefore.maxCounters,
          maxDisplays: subBefore.maxDisplays,
          whatsappQuota: subBefore.whatsappQuota,
          paymentProvider: subBefore.paymentProvider,
        },
      });
    }
    await prisma.paymentTransaction.deleteMany({ where: { id: tx.id } });
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
