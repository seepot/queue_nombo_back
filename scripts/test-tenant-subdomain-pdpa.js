/**
 * Ujian subdomain tenant, eksport data PDPA & permohonan pemadaman (jalankan semasa `npm run dev` aktif).
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const http = require("http");

const prisma = new PrismaClient();
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const PORT = new URL(BASE).port || "80";
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

/** fetch() Node melarang header Host; guna http.request untuk mensimulasikan subdomain tenant. */
function requestWithHost(path, host) {
  const url = new URL(BASE);
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: url.hostname, port: url.port || 80, path, method: "GET", headers: { Host: host } },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, location: res.headers.location || "", body }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

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
  if (!jar.has("authjs.session-token")) throw new Error(`Log masuk '${username}' gagal: ${res.headers.get("location")}`);
  return jarHeader(jar);
}

async function main() {
  console.log("==================================================================");
  console.log("  🌐 UJIAN SUBDOMAIN TENANT, EKSPORT DATA & PEMOHONAN PEMADAMAN");
  console.log("==================================================================\n");

  const demo = await prisma.tenant.findUnique({ where: { slug: "demo" } });
  if (!demo) throw new Error("Tenant demo tidak ditemui.");
  const originalSettings = demo.settings;

  try {
    console.log("[1/4] Subdomain demo.localhost...");
    const subHost = `demo.localhost:${PORT}`;
    let res = await requestWithHost("/kiosk", subHost);
    assert(res.status === 200 && res.body.includes(demo.name), `/kiosk pada subdomain memaparkan kiosk tenant (dapat ${res.status})`);
    res = await requestWithHost("/", subHost);
    assert(res.status === 200 && /Ambil Giliran/.test(res.body), "/ pada subdomain memaparkan halaman ambil giliran");
    res = await requestWithHost("/login", subHost);
    assert(res.status >= 300 && res.status < 400 && /org=demo/.test(res.location), `/login pada subdomain diubah hala dengan org=demo (${res.location})`);
    res = await requestWithHost("/kiosk", `www.localhost:${PORT}`);
    assert(res.status === 404, `www bukan tenant: /kiosk -> 404 (dapat ${res.status})`);

    console.log("[2/4] Eksport data (TENANT_ADMIN)...");
    const cookie = await login(ADMIN_USER, ADMIN_PASS);
    res = await fetch(`${BASE}/api/tenant/export`, { headers: { Cookie: cookie, "x-forwarded-for": ip } });
    assert(res.status === 200, `export -> 200 (dapat ${res.status})`);
    assert((res.headers.get("content-disposition") || "").includes("attachment"), "respons ialah muat turun");
    const data = await res.json();
    assert(data.tenant.slug === "demo" && Array.isArray(data.users) && data.users.length > 0, `data tenant & ${data.users.length} pengguna disertakan`);
    assert(!JSON.stringify(data.users).includes("passwordHash"), "tiada passwordHash dalam eksport");
    res = await fetch(`${BASE}/api/tenant/export`, { redirect: "manual", headers: { "x-forwarded-for": ip } });
    assert(res.status === 401 || (res.status >= 300 && res.status < 400), `export tanpa sesi disekat (dapat ${res.status})`);

    console.log("[3/4] Permohonan pemadaman akaun...");
    res = await fetch(`${BASE}/api/tenant/deletion-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, "x-forwarded-for": ip },
      body: JSON.stringify({ action: "REQUEST", confirmSlug: "salah", reason: "ujian" }),
    });
    assert(res.status === 400, "slug pengesahan salah ditolak (400)");
    res = await fetch(`${BASE}/api/tenant/deletion-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, "x-forwarded-for": ip },
      body: JSON.stringify({ action: "REQUEST", confirmSlug: "demo", reason: "ujian automatik" }),
    });
    let body = await res.json();
    assert(res.status === 200 && body.deletionRequest?.status === "PENDING", "permohonan direkodkan sebagai PENDING");
    const after = await prisma.tenant.findUnique({ where: { id: demo.id } });
    assert(after.settings?.deletionRequest?.status === "PENDING", "settings.deletionRequest disimpan dalam DB");
    res = await fetch(`${BASE}/api/tenant/deletion-request`, { headers: { Cookie: cookie, "x-forwarded-for": ip } });
    body = await res.json();
    assert(body.deletionRequest?.status === "PENDING" && body.scheduledFor, `GET memaparkan permohonan & tarikh jadual (${body.scheduledFor})`);

    console.log("[4/4] Batalkan permohonan...");
    res = await fetch(`${BASE}/api/tenant/deletion-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, "x-forwarded-for": ip },
      body: JSON.stringify({ action: "CANCEL" }),
    });
    body = await res.json();
    assert(res.status === 200 && body.deletionRequest === null, "permohonan dibatalkan");
    const audits = await prisma.auditLog.findMany({
      where: { tenantId: demo.id, action: { in: ["TENANT_DATA_EXPORTED", "TENANT_DELETION_REQUESTED", "TENANT_DELETION_REQUEST_CANCELED"] } },
      orderBy: { createdAt: "desc" },
      take: 3,
    });
    assert(audits.length === 3, "tiga rekod audit (eksport, mohon, batal) wujud");

    console.log("\n🎉 SEMUA UJIAN SUBDOMAIN & PDPA LULUS");
  } finally {
    await prisma.tenant.update({ where: { id: demo.id }, data: { settings: originalSettings } });
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
