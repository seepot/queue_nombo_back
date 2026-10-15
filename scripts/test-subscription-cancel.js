/**
 * Ujian pembatalan / pengaktifan semula langganan dan peringatan e-mel cron
 * (jalankan semasa `npm run dev` aktif; tanpa RESEND_API_KEY e-mel dicatat ke konsol pelayan).
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const Redis = require("ioredis");

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const ADMIN_USER = process.env.TEST_ADMIN_USERNAME || "admin";
const ADMIN_PASS = process.env.TEST_ADMIN_PASSWORD || "admin123";
const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;

function assert(cond, msg) {
  if (!cond) throw new Error(`❌ ${msg}`);
  console.log(`  ✅ ${msg}`);
}

function cookieJarFrom(setCookies, jar = new Map()) {
  for (const c of setCookies) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return jar;
}
const jarHeader = (jar) => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

async function login(username, password) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { "x-forwarded-for": ip } });
  const { csrfToken } = await csrfRes.json();
  const jar = cookieJarFrom(csrfRes.headers.getSetCookie());
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: jarHeader(jar), "x-forwarded-for": ip },
    body: new URLSearchParams({ csrfToken, username, password }).toString(),
  });
  cookieJarFrom(res.headers.getSetCookie(), jar);
  if (!jar.has("authjs.session-token")) {
    throw new Error(`Log masuk '${username}' gagal: ${res.headers.get("location")}`);
  }
  return jarHeader(jar);
}

async function main() {
  console.log("==================================================================");
  console.log("  🧾 UJIAN PEMBATALAN LANGGANAN & PERINGATAN E-MEL");
  console.log("==================================================================\n");

  const demo = await prisma.tenant.findUnique({
    where: { slug: "demo" },
    include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 }, branches: { include: { categories: true } } },
  });
  if (!demo) throw new Error("Tenant demo tidak ditemui.");
  const demoSub = demo.subscriptions[0];
  const demoOriginal = { status: demoSub.status, endDate: demoSub.endDate };
  const branch = demo.branches[0];
  const category = branch.categories[0];
  const demoCache = `tenant:subscription:state:${demo.id}`;

  const suraya = await prisma.tenant.findUnique({
    where: { slug: "kliniksuraya" },
    include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const surayaSub = suraya?.subscriptions[0];
  const surayaOriginal = surayaSub ? { status: surayaSub.status, endDate: surayaSub.endDate } : null;
  const surayaCache = suraya ? `tenant:subscription:state:${suraya.id}` : null;
  const createdTicketIds = [];

  try {
    console.log(`[1/5] Log masuk sebagai '${ADMIN_USER}' (TENANT_ADMIN demo)...`);
    const cookie = await login(ADMIN_USER, ADMIN_PASS);
    assert(cookie.includes("authjs.session-token"), "sesi diperoleh");

    console.log("[2/5] Batalkan langganan...");
    let res = await fetch(`${BASE}/api/billing/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, "x-forwarded-for": ip },
      body: JSON.stringify({ action: "CANCEL", reason: "ujian automatik" }),
    });
    let data = await res.json();
    assert(res.status === 200 && data.success, `CANCEL -> 200 (dapat ${res.status} ${data.message || ""})`);
    assert(data.state.status === "CANCELED" && data.state.operational === true, "status CANCELED tetapi masih beroperasi sehingga tarikh tamat");

    res = await fetch(`${BASE}/api/tickets/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ branchId: branch.id, categoryId: category.id, requestType: "QR_WEB" }),
    });
    data = await res.json();
    assert(res.status === 200 && data.success, "jana tiket masih dibenarkan semasa CANCELED");
    if (data.ticket?.id) createdTicketIds.push(data.ticket.id);

    res = await fetch(`${BASE}/api/billing/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, "x-forwarded-for": ip },
      body: JSON.stringify({ action: "CANCEL" }),
    });
    assert(res.status === 400, "CANCEL kali kedua ditolak (400)");

    console.log("[3/5] Aktifkan semula...");
    res = await fetch(`${BASE}/api/billing/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, "x-forwarded-for": ip },
      body: JSON.stringify({ action: "RESUME" }),
    });
    data = await res.json();
    assert(res.status === 200 && data.state.status === "ACTIVE", `RESUME -> ACTIVE (dapat ${data.state?.status})`);
    const audit = await prisma.auditLog.findMany({
      where: { tenantId: demo.id, action: { in: ["SUBSCRIPTION_CANCELED", "SUBSCRIPTION_RESUMED"] } },
      orderBy: { createdAt: "desc" },
      take: 2,
    });
    assert(audit.length === 2, "dua rekod audit (dibatalkan & diaktifkan semula) wujud");

    console.log("[4/5] Tanpa sesi / peranan salah...");
    res = await fetch(`${BASE}/api/billing/cancel`, {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ action: "CANCEL" }),
    });
    assert(res.status === 401 || (res.status >= 300 && res.status < 400), `tanpa sesi disekat (dapat ${res.status})`);

    if (surayaSub) {
      console.log("[5/5] Peringatan e-mel cron (percubaan tamat dalam 2 hari)...");
      await prisma.subscription.update({
        where: { id: surayaSub.id },
        data: { status: "TRIAL", endDate: new Date(Date.now() + 2 * 24 * 3600 * 1000) },
      });
      await redis.del(surayaCache, `subreminder:${surayaSub.id}:TRIAL_ENDING`);
      res = await fetch(`${BASE}/api/cron/subscriptions`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
      data = await res.json();
      assert(res.status === 200 && data.reminders, "cron memulangkan ringkasan peringatan");
      assert(data.reminders.byKind.TRIAL_ENDING >= 1, `peringatan TRIAL_ENDING dihantar (attempted=${data.reminders.attempted}, delivered=${data.reminders.delivered})`);
      const dedupeTtl = await redis.ttl(`subreminder:${surayaSub.id}:TRIAL_ENDING`);
      assert(dedupeTtl > 0, `kunci dedupe wujud (TTL ${dedupeTtl}s)`);
      res = await fetch(`${BASE}/api/cron/subscriptions`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
      data = await res.json();
      assert(data.reminders.byKind.TRIAL_ENDING === 0, "larian kedua tidak menghantar semula (dedupe)");
    }

    console.log("\n🎉 SEMUA UJIAN PEMBATALAN & PERINGATAN LULUS");
  } finally {
    await prisma.subscription.update({ where: { id: demoSub.id }, data: demoOriginal });
    await redis.del(demoCache);
    if (surayaSub && surayaOriginal) {
      await prisma.subscription.update({ where: { id: surayaSub.id }, data: surayaOriginal });
      await redis.del(surayaCache, `subreminder:${surayaSub.id}:TRIAL_ENDING`);
    }
    if (createdTicketIds.length) await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    await prisma.$disconnect();
    redis.disconnect();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
