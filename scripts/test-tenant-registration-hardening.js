/**
 * Ujian pengetatan aliran pendaftaran tenant
 * (jalankan semasa `npm run dev` aktif, tanpa RESEND_API_KEY supaya devVerifyUrl dipulangkan).
 *
 *  - kata laluan lemah ditolak
 *  - slug terpelihara / terlalu pendek ditolak
 *  - pendaftaran sah menghantar pautan pengesahan (emailVerifiedAt = null)
 *  - tindakan bil (checkout, cancel) disekat sebelum pengesahan (403 EMAIL_NOT_VERIFIED)
 *  - hantar semula membatalkan token lama; pengesahan menetapkan emailVerifiedAt
 *  - token tidak boleh diguna semula; tindakan bil dibuka selepas pengesahan
 *  - tenant ujian dibersihkan selepas selesai
 *
 * Pembolehubah: TEST_BASE_URL (lalai http://localhost:3000)
 */
/* eslint-disable @typescript-eslint/no-require-imports -- skrip CommonJS dijalankan dengan `node` seperti scripts/test-*.js lain */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const Redis = require("ioredis");

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;

const stamp = Date.now().toString().slice(-6);
const SLUG = `ujian-daftar-${stamp}`;
const USERNAME = `ujian_admin_${stamp}`;
const EMAIL = `ujian-${stamp}@contoh.test`;
const PASSWORD = "Ujian1234";

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

async function postJson(path, body, extraHeaders = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip, ...extraHeaders },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function registerPayload(overrides = {}) {
  return {
    companyName: "Klinik Ujian Pengetatan",
    slug: SLUG,
    name: "Dr. Ujian",
    username: USERNAME,
    email: EMAIL,
    phone: "0123456789",
    password: PASSWORD,
    ...overrides,
  };
}

const tokenOf = (url) => new URL(url).searchParams.get("token");

async function main() {
  console.log("==================================================================");
  console.log("  🛡️  UJIAN PENGETATAN PENDAFTARAN TENANT");
  console.log("==================================================================\n");
  console.log(`  Sasaran: ${BASE}  |  slug ujian: ${SLUG}\n`);

  let tenantId = null;
  let userId = null;

  try {
    console.log("[1/8] Kata laluan lemah ditolak...");
    let r = await postJson("/api/auth/register", registerPayload({ password: "pendek1" }));
    assert(r.status === 400 && /kata laluan/i.test(r.data.message || ""), `7 aksara -> 400 (${r.data.message})`);
    r = await postJson("/api/auth/register", registerPayload({ password: "hurufsahaja" }));
    assert(r.status === 400 && /huruf dan nombor/i.test(r.data.message || ""), `tanpa nombor -> 400 (${r.data.message})`);

    console.log("[2/8] Slug terpelihara & pendek ditolak...");
    r = await postJson("/api/auth/register", registerPayload({ slug: "admin" }));
    assert(r.status === 400 && /dikhaskan/i.test(r.data.message || ""), `slug 'admin' -> 400 (${r.data.message})`);
    r = await postJson("/api/auth/register", registerPayload({ slug: "ab" }));
    assert(r.status === 400 && /3 aksara/i.test(r.data.message || ""), `slug 'ab' -> 400 (${r.data.message})`);
    const before = await prisma.tenant.count({ where: { slug: { in: ["admin", "ab", SLUG] } } });
    assert(before === 0, "tiada tenant dicipta oleh permintaan yang ditolak");

    console.log("[3/8] Pendaftaran sah menghantar pautan pengesahan...");
    r = await postJson("/api/auth/register", registerPayload());
    assert(r.status === 200 && r.data.success, `pendaftaran sah -> 200 (${r.data.message})`);
    assert(r.data.devVerifyUrl, "devVerifyUrl dipulangkan (mod dev tanpa RESEND_API_KEY)");
    assert(r.data.verificationEmail?.sent === true, "e-mel pengesahan dicatat sebagai dihantar");
    const token1 = tokenOf(r.data.devVerifyUrl);
    assert(token1 && token1.length === 64, "token 32-bait (hex 64 aksara)");
    tenantId = r.data.data.tenantId;

    const user = await prisma.user.findUnique({ where: { username: USERNAME } });
    assert(user && user.role === "TENANT_ADMIN", "pengguna TENANT_ADMIN dicipta");
    assert(user.emailVerifiedAt === null, "emailVerifiedAt = null selepas pendaftaran");
    assert(user.email === EMAIL, "e-mel disimpan pada pengguna");
    userId = user.id;

    console.log("[4/8] Log masuk tanpa pengesahan dibenarkan, tindakan bil disekat...");
    const cookie = await login(USERNAME, PASSWORD);
    assert(cookie.includes("authjs.session-token"), "log masuk berjaya sebelum e-mel disahkan");
    r = await postJson("/api/billing/checkout", { planType: "PRO", paymentMethod: "SANDBOX", autoConfirm: true }, { Cookie: cookie });
    assert(r.status === 403 && r.data.code === "EMAIL_NOT_VERIFIED", `checkout -> 403 EMAIL_NOT_VERIFIED (dapat ${r.status})`);
    r = await postJson("/api/billing/cancel", { action: "CANCEL" }, { Cookie: cookie });
    assert(r.status === 403 && r.data.code === "EMAIL_NOT_VERIFIED", `cancel -> 403 EMAIL_NOT_VERIFIED (dapat ${r.status})`);
    const subStill = await prisma.subscription.findFirst({ where: { tenantId } });
    assert(subStill && subStill.status === "TRIAL", "langganan kekal TRIAL (tiada perubahan)");

    console.log("[5/8] Semak token & hantar semula (membatalkan token lama)...");
    let res = await fetch(`${BASE}/api/auth/verify-email?token=${token1}`);
    let data = await res.json();
    assert(data.valid === true, "token asal sah");
    r = await postJson("/api/auth/resend-verification", { identifier: EMAIL });
    assert(r.status === 200 && r.data.success && r.data.devVerifyUrl, "hantar semula (awam) -> 200 + devVerifyUrl");
    const token2 = tokenOf(r.data.devVerifyUrl);
    assert(token2 && token2 !== token1, "token baharu berbeza daripada token asal");
    res = await fetch(`${BASE}/api/auth/verify-email?token=${token1}`);
    data = await res.json();
    assert(data.valid === false, "token asal dibatalkan selepas hantar semula");
    r = await postJson("/api/auth/verify-email", { token: token1 });
    assert(r.status === 400, "token asal tidak boleh digunakan (400)");

    console.log("[6/8] Pengesahan menetapkan emailVerifiedAt...");
    r = await postJson("/api/auth/verify-email", { token: token2 });
    assert(r.status === 200 && r.data.success && r.data.alreadyVerified === false, `pengesahan berjaya (${r.data.message})`);
    const verified = await prisma.user.findUnique({ where: { id: userId } });
    assert(verified.emailVerifiedAt instanceof Date, `emailVerifiedAt ditetapkan: ${verified.emailVerifiedAt?.toISOString()}`);
    const audit = await prisma.auditLog.findFirst({ where: { userId, action: "EMAIL_VERIFIED" } });
    assert(audit, "log audit EMAIL_VERIFIED direkodkan");

    console.log("[7/8] Token tidak boleh diguna semula...");
    r = await postJson("/api/auth/verify-email", { token: token2 });
    assert(r.status === 400 && r.data.code === "TOKEN_INVALID", "guna semula token -> 400 TOKEN_INVALID");
    res = await fetch(`${BASE}/api/auth/verify-email?token=${token2}`);
    data = await res.json();
    assert(data.valid === false, "token yang telah digunakan tidak lagi sah");
    r = await postJson("/api/auth/verify-email", { token: "token-palsu-" + "x".repeat(52) });
    assert(r.status === 400, "token palsu -> 400");
    r = await postJson("/api/auth/resend-verification", {}, { Cookie: cookie });
    assert(r.status === 200 && r.data.alreadyVerified === true, "hantar semula (sesi) selepas disahkan -> alreadyVerified");

    console.log("[8/8] Tindakan bil dibuka selepas pengesahan...");
    r = await postJson("/api/billing/cancel", { action: "CANCEL" }, { Cookie: cookie });
    assert(r.status === 200 && r.data.success, `cancel -> 200 selepas pengesahan (${r.data.message})`);
    const subAfter = await prisma.subscription.findFirst({ where: { tenantId } });
    assert(subAfter.status === "CANCELED", "langganan ujian berstatus CANCELED");

    console.log("\n🎉 SEMUA UJIAN PENGETATAN PENDAFTARAN LULUS");
  } finally {
    console.log("\n🧹 Membersihkan data ujian...");
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch((e) => console.warn("  ⚠️  gagal padam tenant:", e.message));
      console.log(`  ↩️  Tenant ujian '${SLUG}' dipadam (cascade: pengguna, cawangan, langganan, audit).`);
    }
    if (userId) {
      await redis.del(`ratelimit:resend-verification:user:${userId}`, `emailverify:user:${userId}`).catch(() => {});
    }
    if (tenantId) {
      await redis.del(`tenant:subscription:state:${tenantId}`, `tenant:cache:slug:${SLUG}`, `tenant:cache:id:${tenantId}`).catch(() => {});
    }
    redis.disconnect();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
