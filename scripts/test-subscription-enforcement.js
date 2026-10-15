/**
 * Ujian penguatkuasaan langganan (jalankan semasa `npm run dev` aktif).
 *  1. Tamatkan tempoh langganan tenant ujian -> API tiket & kiosk awam mesti disekat (402)
 *  2. Cron sapuan mesti menolak tanpa rahsia dan menanda EXPIRED dengan rahsia
 *  3. Pulihkan langganan -> API tiket berfungsi semula
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const Redis = require("ioredis");

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const SLUG = process.env.TEST_TENANT_SLUG || "kliniksuraya";

function assert(cond, msg) {
  if (!cond) throw new Error(`❌ ${msg}`);
  console.log(`  ✅ ${msg}`);
}

async function main() {
  console.log("==================================================================");
  console.log("  🔒 UJIAN PENGUATKUASAAN LANGGANAN & KUOTA");
  console.log("==================================================================\n");

  const tenant = await prisma.tenant.findUnique({
    where: { slug: SLUG },
    include: { branches: { include: { categories: true } }, subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!tenant) throw new Error(`Tenant '${SLUG}' tidak ditemui.`);
  const sub = tenant.subscriptions[0];
  if (!sub) throw new Error("Tenant tiada langganan.");
  const branch = tenant.branches[0];
  const category = branch?.categories[0];
  if (!branch || !category) throw new Error("Tenant tiada cawangan/kategori.");

  const original = { status: sub.status, endDate: sub.endDate };
  const cacheKey = `tenant:subscription:state:${tenant.id}`;
  const createdTicketIds = [];

  try {
    console.log(`[1/5] Tenant '${tenant.name}' -> tetapkan langganan tamat semalam...`);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "TRIAL", endDate: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    await redis.del(cacheKey);

    console.log("[2/5] API jana tiket mesti disekat...");
    let res = await fetch(`${BASE}/api/tickets/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.10" },
      body: JSON.stringify({ branchId: branch.id, categoryId: category.id, requestType: "QR_WEB" }),
    });
    let data = await res.json();
    assert(res.status === 402 && data.code === "SUBSCRIPTION_INACTIVE", `tickets/generate -> 402 SUBSCRIPTION_INACTIVE (dapat ${res.status} ${data.code || ""})`);

    res = await fetch(`${BASE}/api/appointments/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.10" },
      body: JSON.stringify({ branchId: branch.id, categoryId: category.id, appointmentDate: "2030-01-01", timeSlot: "09:00", customerName: "Ujian", customerPhone: "0123456789" }),
    });
    data = await res.json();
    assert(res.status === 402, `appointments/book -> 402 (dapat ${res.status})`);

    console.log("[3/5] Kiosk awam mesti papar 'tidak tersedia'...");
    res = await fetch(`${BASE}/kiosk/${SLUG}`);
    const html = await res.text();
    assert(html.includes("Perkhidmatan Tidak Tersedia"), "kiosk/[slug] memaparkan halaman sekatan");

    console.log("[4/5] Cron sapuan langganan...");
    // Set semula ke TRIAL tamat (bacaan malas tadi sudah menanda EXPIRED) supaya sapuan ada calon
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "TRIAL", endDate: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    await redis.del(cacheKey);
    res = await fetch(`${BASE}/api/cron/subscriptions`);
    assert(res.status === 401, `cron tanpa rahsia -> 401 (dapat ${res.status})`);
    res = await fetch(`${BASE}/api/cron/subscriptions`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
    data = await res.json();
    assert(res.status === 200 && data.success && data.checked >= 1 && data.expired >= 1, `cron dengan rahsia -> 200 (checked=${data.checked}, expired=${data.expired})`);
    const afterSweep = await prisma.subscription.findUnique({ where: { id: sub.id } });
    assert(afterSweep.status === "EXPIRED", `status langganan dalam DB kini EXPIRED (dapat ${afterSweep.status})`);

    console.log("[5/5] Aktifkan semula (TRIAL +7 hari) -> API tiket berfungsi semula...");
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "TRIAL", endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    await redis.del(cacheKey);
    res = await fetch(`${BASE}/api/tickets/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.10" },
      body: JSON.stringify({ branchId: branch.id, categoryId: category.id, requestType: "QR_WEB" }),
    });
    data = await res.json();
    assert(res.status === 200 && data.success, `tickets/generate -> 200 selepas pemulihan (dapat ${res.status})`);
    if (data.ticket?.id) createdTicketIds.push(data.ticket.id);

    console.log("\n🎉 SEMUA UJIAN PENGUATKUASAAN LANGGANAN LULUS");
  } finally {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: original.status, endDate: original.endDate } });
    await redis.del(cacheKey);
    if (createdTicketIds.length) await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    await prisma.$disconnect();
    redis.disconnect();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
