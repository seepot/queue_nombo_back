/**
 * Ujian aliran lupa / tetap semula kata laluan (jalankan tanpa RESEND_API_KEY).
 *  - Pelayan `npm run dev`: pautan tetapan semula dibaca daripada `devResetUrl` dalam respons.
 *  - Pelayan produksi (`npm run start`, cth. CI): respons tidak mendedahkan pautan; tetapkan
 *    MAIL_OUTBOX_FILE pada pelayan dan skrip ini, lalu pautan dibaca daripada e-mel terakhir
 *    dalam fail itu.
 */
require("dotenv").config();
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.TEST_RESET_EMAIL || "admin@demo.com";
const OUTBOX = process.env.MAIL_OUTBOX_FILE;
const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;

function assert(cond, msg) {
  if (!cond) throw new Error(`❌ ${msg}`);
  console.log(`  ✅ ${msg}`);
}

/** Pautan tetapan semula daripada respons dev, atau daripada e-mel terakhir kepada EMAIL dalam MAIL_OUTBOX_FILE. */
function findResetUrl(data) {
  if (data.devResetUrl) return data.devResetUrl;
  if (!OUTBOX || !fs.existsSync(OUTBOX)) return null;
  const mails = fs
    .readFileSync(OUTBOX, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((m) => m.to === EMAIL);
  const last = mails[mails.length - 1];
  const match = last && /https?:\/\/\S+\/reset-password\?token=[0-9a-f]+/.exec(last.text || last.html || "");
  return match ? match[0] : null;
}

async function main() {
  console.log("==================================================================");
  console.log("  🔑 UJIAN LUPA & TETAP SEMULA KATA LALUAN");
  console.log("==================================================================\n");

  const user = await prisma.user.findFirst({ where: { email: EMAIL } });
  if (!user) throw new Error(`Pengguna dengan e-mel ${EMAIL} tidak ditemui.`);
  const originalHash = user.passwordHash;

  try {
    console.log("[1/4] Mohon pautan tetapan semula...");
    let res = await fetch(`${BASE}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ identifier: EMAIL }),
    });
    let data = await res.json();
    assert(res.status === 200 && data.success, "respons generik 200");
    const resetUrl = findResetUrl(data);
    assert(resetUrl, data.devResetUrl ? "pautan dev dipulangkan (mod tanpa e-mel)" : "pautan diperoleh daripada MAIL_OUTBOX_FILE");
    const token = new URL(resetUrl).searchParams.get("token");

    console.log("[2/4] Semak token...");
    res = await fetch(`${BASE}/api/auth/reset-password?token=${token}`);
    data = await res.json();
    assert(data.valid === true, "token sah");
    res = await fetch(`${BASE}/api/auth/reset-password?token=token-palsu-${Date.now()}xxxxxxxxxxxxxxxxxxxxxxxx`);
    data = await res.json();
    assert(data.valid === false, "token palsu tidak sah");

    console.log("[3/4] Tetap semula dengan kata laluan lemah lalu kuat...");
    res = await fetch(`${BASE}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ token, password: "pendek" }),
    });
    assert(res.status === 400, "kata laluan lemah ditolak (400)");
    res = await fetch(`${BASE}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ token, password: "Ujian1234" }),
    });
    data = await res.json();
    assert(res.status === 200 && data.success, "kata laluan baharu diterima");

    console.log("[4/4] Sahkan hash & token sekali guna...");
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    assert(await bcrypt.compare("Ujian1234", updated.passwordHash), "hash bcrypt sepadan dengan kata laluan baharu");
    res = await fetch(`${BASE}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ token, password: "Ujian5678" }),
    });
    assert(res.status === 400, "token tidak boleh diguna semula (400)");

    console.log("\n🎉 SEMUA UJIAN TETAP SEMULA KATA LALUAN LULUS");
  } finally {
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: originalHash } });
    console.log("  ↩️  Kata laluan asal dipulihkan.");
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
