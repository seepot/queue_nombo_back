/**
 * Ujian had kadar & perlindungan brute force log masuk (jalankan semasa `npm run dev` aktif).
 */
require("dotenv").config();
const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const USERNAME = process.env.TEST_LOGIN_USERNAME || "staf1";
const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;

function assert(cond, msg) {
  if (!cond) throw new Error(`❌ ${msg}`);
  console.log(`  ✅ ${msg}`);
}

async function loginAttempt(password) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { "x-forwarded-for": ip } });
  const { csrfToken } = await csrfRes.json();
  // Pelayan boleh menghantar kuki yang sama lebih sekali (proxy + pengendali); ambil nilai terakhir bagi setiap nama
  const jar = new Map();
  for (const c of csrfRes.headers.getSetCookie()) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  const cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
      "x-forwarded-for": ip,
    },
    body: new URLSearchParams({ csrfToken, username: USERNAME, password }),
  });
  return { status: res.status, location: res.headers.get("location") || "" };
}

async function main() {
  console.log("==================================================================");
  console.log("  🚦 UJIAN HAD KADAR & BRUTE FORCE LOG MASUK");
  console.log("==================================================================\n");

  try {
    console.log(`[1/2] Had kadar /api/auth/forgot-password (5 per 15 minit, IP ${ip})...`);
    let last;
    for (let i = 1; i <= 6; i++) {
      last = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ identifier: `tiada-${i}@contoh.my` }),
      });
      if (i <= 5) assert(last.status === 200, `permintaan #${i} -> 200`);
    }
    assert(last.status === 429 && last.headers.get("retry-after"), `permintaan #6 -> 429 dengan Retry-After`);

    console.log(`\n[2/2] Kunci log masuk selepas 5 kata laluan salah (pengguna '${USERNAME}')...`);
    await redis.del(`login:fail:user:${USERNAME}`, `login:lock:user:${USERNAME}`);
    let result;
    for (let i = 1; i <= 5; i++) {
      result = await loginAttempt(`salah-${i}`);
      assert(result.status === 302 && /error=CredentialsSignin/.test(result.location) && !/code=throttled/.test(result.location), `percubaan #${i} ditolak sebagai kredensial tidak sah`);
    }
    result = await loginAttempt("salah-6");
    assert(/code=throttled/.test(result.location), `percubaan #6 disekat dengan code=throttled (${result.location})`);
    const ttl = await redis.ttl(`login:lock:user:${USERNAME}`);
    assert(ttl > 0 && ttl <= 900, `kunci Redis wujud dengan TTL ${ttl}s`);

    console.log("\n🎉 SEMUA UJIAN HAD KADAR LULUS");
  } finally {
    await redis.del(
      `login:fail:user:${USERNAME}`,
      `login:lock:user:${USERNAME}`,
      `login:fail:ip:${ip}`,
      `login:lock:ip:${ip}`,
      `ratelimit:forgot-password:ip:${ip}`
    );
    redis.disconnect();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
