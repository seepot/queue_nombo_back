# 🏛️ JPJeQ Next (Sistem Pengurusan Giliran Pintar JPJ)

Sistem Pengurusan Giliran Pintar Jabatan Pengangkutan Jalan Malaysia (JPJeQ) versi moden berasaskan **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, dan **MySQL**.

---

## 🚀 Ciri-Ciri Utama Sistem

### 1. 🏢 Papan Pemuka Operasi Mengikut Peranan (*Role-Based Dashboard*)
- **Superadmin HQ (Level 1)**: Pemantauan kuota pukal seluruh negara, status WebSocket, jejak audit, analisis masa menunggu, dan penanda aras prestasi cawangan.
- **Ketua Cawangan / KC (Level 2)**: Metrik operasi harian, pelarasan kuota cawangan, amaran awal kesesakan (*Congestion Alert Banner*), direktori kakitangan, dan konfigurasi kaunter.
- **Staf Kaunter (Level 3)**: Panggilan tiket giliran masa nyata (*Next, Recall, Transfer, Cancel, Complete*), jam randik durasi layanan (*Live Stopwatch*), sejarah transaksi, dan penugasan kaunter automatik.
- **Kiosk / Meja Khidmat Pelanggan (Level 4)**: Cetakan tiket fizikal mengikut kumpulan perkhidmatan dan pemantauan kuota sesi.
- **Paparan Kod QR Awam (Level 5)**: Mod paparan Kod QR kehadiran awam beranimasi dengan status waktu operasi.
- **Pengurusan Tertinggi (Level 6 & 7)**: Dashboard analisis eksekutif bagi Ketua Pengarah & Pengarah Negeri.

### 2. 📺 Modul Pemantauan TV Dewan Menunggu (*TV Display Live Monitor*)
- **Denyutan Nadi (*Heartbeat Ping*)**: Pengesanan automatik status TV di ruang menunggu (🟢 Online $<45$s, 🟡 Terganggu, 🔴 Terputus $>120$s).
- **Kawalan Jauh (*Remote Command*)**: Arahan *Muat Semula (Force Reload)* dan *Uji Bunyi Loceng (Test Chime)* terus dari Dashboard Ketua Cawangan ke TV dewan menunggu.
- **Lencana Amaran Terputus**: Sepanduk amaran merah di Dashboard KC jika TV didapati luar talian.

### 3. 🗺️ Pelan Lantai Cawangan Interaktif (*Interactive Floorplan View*)
- Visualisasi susun atur pod kaunter mengikut dewan/zon fizikal dengan lampu status beacon (Melayan/Sedia/Tutup) dan modal inspeksi cepat.

### 4. 🔍 Carian Pintar Global (*Spotlight Command Palette*)
- Pintasan papan kekunci `⌘K` / `Ctrl+K` untuk carian pantas cawangan, kakitangan, nombor tiket, dan menu navigasi.

### 5. 🔔 Sistem Dialog & Notifikasi Moden
- Modal pengesahan berasaskan Promise (`confirmModal`) dan notifikasi toast terapung beranimasi menggantikan `window.confirm` dan `window.alert` pelayar.

---

## 🛠️ Keperluan & Pemasangan

### 1. Prasyarat
- **Node.js**: v20.x atau ke atas
- **MySQL Database**: Pelayan database `smartqdb` (Jadual `cawangan`, `users`, `kaunter`, `tiket_XX`, `tv_display`, dll.)

### 2. Pemboleh Ubah Persekitaran (`.env`)
Salin atau konfigurasikan fail `.env`:

```env
DATABASE_URL="mysql://username:password@localhost:3306/smartqdb"
NEXTAUTH_SECRET="your-strong-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Perkhidmatan Realtime WebSocket (Pilihan)
REALTIME_SERVICE_URL="http://localhost:4001"
REALTIME_SERVICE_SECRET="your-realtime-secret"
```

### 3. Jalankan Projek

```bash
# Pasang dependensi
npm install

# Jana klien Prisma
npx prisma generate

# Jalankan mod pembangunan
npm run dev

# Bina untuk produksi
npm run build
npm run start
```

Layari `http://localhost:3000` di pelayar web.

---

## 📂 Struktur Direktori Utama

```
src/
├── app/
│   ├── (auth)/login/          # Halaman Log Masuk Moden
│   ├── (dashboard)/
│   │   ├── dashboard/         # Dashboard mengikut peranan (HQ/KC/Staf)
│   │   ├── kaunter/           # Pengurusan Kaunter & Pelan Lantai Interaktif
│   │   ├── kakitangan/        # Pengurusan Kakitangan Cawangan
│   │   ├── jadual/            # Jadual Tugasan Roster Mingguan
│   │   ├── temujanji/         # Modul Slot & Kalendar Temujanji
│   │   ├── laporan/           # Laporan SLA, Transaksi & Analisis Masa
│   │   ├── pentadbiran/       # Tetapan Info, Kuota, Status TV & Jejak Audit
│   │   └── aduan/             # Modul Aduan & Permohonan Change Request (CR)
│   └── api/
│       ├── auth/              # Handler NextAuth & Log Audit
│       ├── kaunter/           # API Transaksi Panggilan & Status Kaunter
│       ├── tv/                # API Heartbeat, Status & Kawalan Jauh TV
│       └── ...
├── components/                # Header, Sidebar, ToastProvider, Modal, Palette
└── lib/                       # Prisma Client, NextAuth, Audit Logger, Helpers
```

---

## 📄 Hak Cipta & Lesen
Hak Cipta Terpelihara © 2026 **Jabatan Pengangkutan Jalan (JPJ) Malaysia**.
