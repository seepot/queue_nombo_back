# QueNombo — Sistem Pengurusan Giliran SaaS

QueNombo ialah platform pengurusan giliran pintar berbilang tenant (multi-tenant SaaS) untuk klinik, farmasi, agensi dan rangkaian cawangan. Setiap organisasi (tenant) mendaftar sendiri, mendapat percubaan percuma 14 hari, dan melanggan pelan STARTER, PRO atau ENTERPRISE mengikut bilangan cawangan, kaunter dan paparan TV yang diperlukan.

Dibina dengan **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS 4**, **Prisma 6**, **PostgreSQL**, **Redis** dan **NextAuth v5**.

---

## Komponen Sistem

| Komponen | Folder | Peranan |
|---|---|---|
| Aplikasi web (ini) | `jpjeq-next-mysql` | Dashboard, API, kiosk awam, bil & langganan |
| Perkhidmatan masa nyata | `../jpjeq-realtime-service` | Gateway WebSocket (NestJS) untuk paparan TV, port 4001 |
| Paparan TV | `../jpjeq-tv-display` | Aplikasi Ionic/Capacitor untuk skrin dewan menunggu |

---

## Peranan Pengguna

| Peranan | Akses |
|---|---|
| `SUPERADMIN` | Pemilik platform: pengurusan tenant, lanjut percubaan, kuota, bayaran manual, siaran, diagnostik, impersonasi |
| `TENANT_ADMIN` | Pentadbir organisasi: cawangan, kakitangan, langganan & bil, integrasi WhatsApp, peranti |
| `BRANCH_MANAGER` | Pengurus cawangan: arahan kaunter, tetapan premis, analisis |
| `COUNTER_STAFF` | Staf kaunter: terminal panggilan giliran |

---

## Ciri Utama

- **Giliran masa nyata**: nombor giliran atomik melalui Redis, panggilan kaunter (Next, Recall, Transfer, No-show, Complete), paparan TV dengan pairing PIN dan denyut nadi.
- **Pelanggan awam**: imbas QR (`/scan/[slug]`), kiosk skrin sentuh (`/kiosk/[slug]`), tempahan temujanji (`/book/[slug]`), pantau tiket (`/ticket/[id]`), maklum balas CSAT.
- **Langganan & kuota**: percubaan 14 hari, tempoh ihsan 7 hari selepas tamat, sekatan automatik pada API operasi dan kiosk apabila langganan tamat, kuota cawangan / kaunter / paparan dikuatkuasakan, pembatalan langganan, peringatan e-mel sebelum tamat.
- **Bil**: FPX / kad melalui ToyyibPay, webhook yang disahkan semula melalui API gerbang, mod sandbox untuk pembangunan, invois & resit.
- **Keselamatan**: had percubaan log masuk (anti brute force), had kadar pada API awam, lupa / tetap semula kata laluan melalui e-mel, jejak audit.
- **Lain-lain**: notifikasi WhatsApp, pengumuman suara, ramalan AI beban kaunter, penyegerakan luar talian, PWA.

---

## Prasyarat

- Node.js 20 atau lebih baharu
- PostgreSQL 14 atau lebih baharu
- Redis 6 atau lebih baharu

---

## Pemasangan

```bash
npm install
cp .env.example .env        # kemudian isi nilai sebenar
npx prisma migrate deploy   # cipta jadual (atau `npx prisma migrate dev` semasa pembangunan)
node scripts/seed-superadmin.js
npm run dev
```

Layari `http://localhost:3000`. Akaun lalai yang dijana oleh skrip seed dicetak pada konsol.

---

## Pemboleh Ubah Persekitaran

Lihat `.env.example` untuk senarai penuh. Ringkasan:

| Pemboleh ubah | Kegunaan |
|---|---|
| `DATABASE_URL` | Sambungan PostgreSQL |
| `REDIS_URL` | Cache, urutan giliran, PIN pairing, had kadar, token tetapan semula |
| `AUTH_SECRET`, `AUTH_URL` | NextAuth v5 |
| `NEXT_PUBLIC_APP_URL` | URL awam aplikasi (digunakan dalam e-mel & URL kembali gerbang) |
| `REALTIME_SERVICE_URL`, `REALTIME_SERVICE_SECRET` | Perkhidmatan WebSocket |
| `CRON_SECRET` | Melindungi `GET /api/cron/subscriptions` |
| `BILLING_WEBHOOK_SECRET` | Header `x-billing-secret` untuk webhook generik / simulasi |
| `BILLING_SANDBOX_ENABLED` | Benarkan kaedah bayaran SANDBOX (lalai: hanya di luar produksi) |
| `TOYYIBPAY_SECRET_KEY`, `TOYYIBPAY_CATEGORY_CODE`, `TOYYIBPAY_BASE_URL` | Gerbang ToyyibPay (`https://dev.toyyibpay.com` untuk sandbox) |
| `RESEND_API_KEY`, `MAIL_FROM` | E-mel transaksi. Tanpa kunci, pautan dicatat ke konsol (dev sahaja) |

---

## Skrip

```bash
# Seed
node scripts/seed-superadmin.js            # superadmin + tenant demo + pengguna contoh
node scripts/seed-sample-clinic-tickets.js # tiket contoh

# Ujian integrasi (perlukan `npm run dev` aktif; guna TEST_BASE_URL jika bukan port 3000)
TEST_BASE_URL=http://localhost:3000 node scripts/test-subscription-enforcement.js
TEST_BASE_URL=http://localhost:3000 node scripts/test-subscription-cancel.js
TEST_BASE_URL=http://localhost:3000 node scripts/test-rate-limit.js
TEST_BASE_URL=http://localhost:3000 node scripts/test-password-reset.js
TEST_BASE_URL=http://localhost:3000 node scripts/test-billing-security.js
```

Skrip `test-*.js` lain menguji modul khusus (pendaftaran tenant, superadmin, peranti, WhatsApp, dsb.).

---

## Integrasi Berterusan (CI)

Aliran kerja GitHub Actions `.github/workflows/ci.yml` berjalan pada setiap `push` dan *pull request* ke `main`:

1. **Jenis & lint** — `npm ci`, `npx prisma generate`, `npx tsc --noEmit`, `npx eslint src --max-warnings=0`.
2. **Ujian integrasi** — servis `postgres:16` dan `redis:7`, `npx prisma migrate deploy`, `node scripts/seed-superadmin.js`,
   `npm run build && npm run start` di latar belakang, tunggu `/api/health`, kemudian lima skrip ujian integrasi di atas.

Pelayan CI berjalan dalam mod produksi, maka `/api/auth/forgot-password` tidak memulangkan `devResetUrl`. Untuk ujian
tetapan semula kata laluan, pelayan dan skrip ujian diberi `MAIL_OUTBOX_FILE`: dalam mod konsol (tanpa `RESEND_API_KEY`),
setiap e-mel turut ditulis ke fail itu (satu JSON setiap baris) dan skrip membaca pautan daripadanya. Semua rahsia dalam
aliran kerja hanyalah nilai ujian untuk pangkalan data sementara CI.

Untuk meniru CI secara tempatan (pangkalan data bersih `quenombo_ci`):

```bash
createdb quenombo_ci
export DATABASE_URL="postgresql://localhost:5432/quenombo_ci?schema=public" MAIL_OUTBOX_FILE="$PWD/.mail-outbox.jsonl"
npx prisma migrate deploy && node scripts/seed-superadmin.js
npm run build && npm run start -- -p 3100 &
TEST_BASE_URL=http://localhost:3100 TEST_TENANT_SLUG=demo node scripts/test-password-reset.js
```

---

## Tugas Berjadual

`GET /api/cron/subscriptions` menjalankan sapuan harian: menanda langganan tamat (`PAST_DUE` / `EXPIRED`) dan menghantar peringatan e-mel (percubaan hampir tamat, tempoh ihsan, tamat). Vercel Cron dikonfigurasi dalam `vercel.json`; pada PM2 / crontab, panggil endpoint ini dengan header `x-cron-secret`.

---

## Struktur Direktori

```
src/
├── app/
│   ├── (auth)/                 # login, forgot-password, reset-password
│   ├── (dashboard)/
│   │   ├── dashboard/          # Papan pemuka mengikut peranan
│   │   ├── superadmin/         # Pengurusan platform & tenant
│   │   ├── cawangan/ pengurus/ # Cawangan, kaunter, kakitangan
│   │   ├── terminal/           # Terminal panggilan kaunter
│   │   ├── peranti/ qrcode/    # Pairing TV & kod QR premis
│   │   ├── langganan/          # Pelan, bil, invois
│   │   ├── onboarding/         # Persediaan awal premis
│   │   ├── temujanji/ maklumbalas/ analisis/ ai-optima/ integrasi/
│   ├── api/
│   │   ├── auth/               # NextAuth, register, forgot/reset password
│   │   ├── billing/            # checkout, webhook, verify, invoices, cancel
│   │   ├── cron/               # sapuan langganan
│   │   ├── tickets/ kaunter/ appointments/ devices/ tv/ branches/
│   │   ├── superadmin/ reports/ whatsapp/ ai/ sync/ feedback/
│   ├── book/ kiosk/ scan/ ticket/ pricing/ register/   # Laluan awam
├── components/                 # Sidebar, Header, sepanduk langganan, modal, toast
├── context/                    # Bahasa (BM / EN)
└── lib/                        # prisma, redis, auth, subscription, quota, rate-limit,
                                # payment-gateway, payments/toyyibpay, mailer, whatsapp, ...
prisma/
├── schema.prisma               # Tenant, Subscription, Branch, Counter, Device, Ticket, ...
└── migrations/                 # Sejarah migrasi PostgreSQL
scripts/                        # Seed & ujian integrasi
```

---

## Penggunaan Produksi

- Bina dengan `npm run build` dan jalankan `npm run start`, atau gunakan `ecosystem.config.js` (PM2) di folder induk bersama perkhidmatan masa nyata.
- Tetapkan `BILLING_SANDBOX_ENABLED=false`, rahsia rawak untuk `AUTH_SECRET`, `CRON_SECRET`, `BILLING_WEBHOOK_SECRET`, serta kelayakan ToyyibPay produksi dan `RESEND_API_KEY`.
- Pastikan `NEXT_PUBLIC_APP_URL` ialah URL awam sebenar supaya URL kembali dan callback gerbang berfungsi.

---

## Lesen

Hak Cipta Terpelihara © 2026 QueNombo. Semua hak terpelihara.
