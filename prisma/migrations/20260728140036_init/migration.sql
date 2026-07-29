-- CreateTable
CREATE TABLE "cawangan" (
    "id" SERIAL NOT NULL,
    "id_cawangan" VARCHAR(20),
    "nama_cawangan" VARCHAR(200) NOT NULL,
    "alamat1" VARCHAR(255),
    "alamat2" VARCHAR(255),
    "alamat3" VARCHAR(255),
    "alamat4" VARCHAR(200),
    "no_telefon" VARCHAR(20),
    "no_faks" VARCHAR(20),
    "negeri" VARCHAR(10),
    "daerah" VARCHAR(10),
    "bil_kaunter" INTEGER,
    "player_id" VARCHAR(200),
    "create_date" TIMESTAMP(3),
    "latitud" VARCHAR(50),
    "longitud" VARCHAR(50),
    "update_date" TIMESTAMP(3),
    "update_by" VARCHAR(20),
    "sela_masa" INTEGER,
    "flag" VARCHAR(5),
    "jenis_limit" INTEGER,
    "tempoh_mula_scan" INTEGER,
    "status_eq" INTEGER DEFAULT 0,
    "radius" INTEGER,
    "kodQR" VARCHAR(200),
    "tarikh_jana" TIMESTAMP(3),
    "nama_qr" VARCHAR(250),
    "gambar_qr" TEXT,

    CONSTRAINT "cawangan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuti_umum" (
    "id" SERIAL NOT NULL,
    "cawangan" VARCHAR(20),
    "tarikh_1" DATE,
    "status_aktif" INTEGER NOT NULL DEFAULT 1,
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keterangan" VARCHAR(200),
    "negeri" VARCHAR(10),
    "updateby" VARCHAR(20),
    "updatedate" TIMESTAMP(3),

    CONSTRAINT "cuti_umum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "had_pelanggan" (
    "id" SERIAL NOT NULL,
    "cawangan" VARCHAR(20) NOT NULL,
    "bahagian" VARCHAR(20),
    "kumpulan_perkhidmatan" VARCHAR(20),
    "bilangan_pelanggan" INTEGER NOT NULL DEFAULT 0,
    "status_aktif" INTEGER NOT NULL DEFAULT 1,
    "had_pelanggan1" INTEGER NOT NULL DEFAULT 0,
    "had_pelanggan2" INTEGER NOT NULL DEFAULT 0,
    "had_pelanggan3" INTEGER NOT NULL DEFAULT 0,
    "jenis_limit" INTEGER DEFAULT 1,
    "tempoh_mula_scan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "had_pelanggan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "had_temujanji" (
    "id" SERIAL NOT NULL,
    "cawangan" VARCHAR(10),
    "bil_temujanji" INTEGER,
    "bil_player_id" INTEGER,

    CONSTRAINT "had_temujanji_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hari_cuti" (
    "id" SERIAL NOT NULL,
    "cawangan" VARCHAR(20),
    "nama_hari" VARCHAR(3),
    "create_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hari_cuti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadual_tugasan" (
    "id" SERIAL NOT NULL,
    "nokp" VARCHAR(20),
    "id_kaunter" INTEGER,
    "id_cawangan" VARCHAR(10),
    "tarikh_mula" DATE,
    "tarikh_tamat" DATE,
    "status_aktif" INTEGER DEFAULT 1,
    "create_date" TIMESTAMP(3),
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jadual_tugasan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kaunter" (
    "id" SERIAL NOT NULL,
    "no_kaunter" VARCHAR(11),
    "nama_kaunter" VARCHAR(100),
    "id_perkhidmatan_kumpulan" INTEGER,
    "id_cawangan" VARCHAR(20),
    "no_siri" INTEGER,
    "susunan_keutamaan" VARCHAR(35),
    "id_pengguna" VARCHAR(11),
    "transid" VARCHAR(20),
    "no_tiket" INTEGER,
    "masa_panggil" TIMESTAMP(3),
    "masa_selesai" TIMESTAMP(3),
    "masa_batal" TIMESTAMP(3),
    "bilangan_pelanggan" INTEGER,
    "masa_menunggu" TIME,
    "waktu_mula" TIMESTAMP(3),
    "zon" VARCHAR(25),

    CONSTRAINT "kaunter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kaunter_stat" (
    "id" SERIAL NOT NULL,
    "cawangan" VARCHAR(20),
    "tarikh" DATE,
    "kaunter" VARCHAR(10),
    "bil_tiket" INTEGER,
    "bil_selesai" INTEGER,
    "bil_batal" INTEGER,
    "bil_lain" INTEGER,
    "batal_cust" INTEGER,
    "batal_kaunter" INTEGER,
    "purata_masa_menunggu" TIME,
    "purata_masa_layanan" TIME,
    "masa_menunggu_terlama" TIME,
    "masa_layanan_terlama" TIME,
    "jumlah_masa_keseluruhan" TIME,

    CONSTRAINT "kaunter_stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kumpulan_perkhidmatan" (
    "id" SERIAL NOT NULL,
    "id_perkhidmatan" TEXT,
    "id_cawangan" VARCHAR(20),
    "keterangan" VARCHAR(255),
    "no_siri" INTEGER NOT NULL,
    "no_terkini" INTEGER NOT NULL,
    "kategori" INTEGER NOT NULL DEFAULT 1,
    "ispelbagai" INTEGER DEFAULT 0,
    "create_date" TIMESTAMP(3),
    "status" INTEGER DEFAULT 1,

    CONSTRAINT "kumpulan_perkhidmatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_akses" (
    "id" SERIAL NOT NULL,
    "keterangan" VARCHAR(200),
    "status_aktif" INTEGER DEFAULT 1,

    CONSTRAINT "level_akses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_jadual_tugasan" (
    "id" SERIAL NOT NULL,
    "nokp" VARCHAR(20),
    "id_kaunter" INTEGER,
    "id_cawangan" VARCHAR(10),
    "tarikh_mula" DATE,
    "tarikh_tamat" DATE,
    "create_date" TIMESTAMP(3),
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_jadual_tugasan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_tiket" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" INTEGER,
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" INTEGER DEFAULT 0,
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "log_tiket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_transaksi" (
    "id" SERIAL NOT NULL,
    "ip" VARCHAR(100),
    "device" VARCHAR(255),
    "tarikh" TIMESTAMP(3),
    "direction" INTEGER,
    "module" VARCHAR(200),
    "data" TEXT,

    CONSTRAINT "log_transaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_transaksi_masamenunggu" (
    "id" SERIAL NOT NULL,
    "ip" VARCHAR(100),
    "device" VARCHAR(255),
    "tarikh" TIMESTAMP(3),
    "direction" INTEGER,
    "module" VARCHAR(200),
    "data" TEXT,

    CONSTRAINT "log_transaksi_masamenunggu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengumuman" (
    "id" SERIAL NOT NULL,
    "cawangan" VARCHAR(10) NOT NULL,
    "catatan" TEXT NOT NULL,
    "trh_mula" DATE NOT NULL,
    "trh_tamat" DATE NOT NULL,

    CONSTRAINT "pengumuman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peralatan" (
    "id" SERIAL NOT NULL,
    "player_id" VARCHAR(200),
    "ip" VARCHAR(100),

    CONSTRAINT "peralatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perkhidmatan" (
    "id" SERIAL NOT NULL,
    "keterangan" VARCHAR(500),

    CONSTRAINT "perkhidmatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perkhidmatan_stat" (
    "id" SERIAL NOT NULL,
    "cawangan" VARCHAR(20),
    "tarikh" DATE,
    "kumpulan_perkhidmatan" VARCHAR(10),
    "keterangan" VARCHAR(200),
    "bil_tiket" INTEGER,
    "bil_selesai" INTEGER,
    "bil_batal" INTEGER,
    "bil_lain" INTEGER,
    "batal_cust" INTEGER,
    "batal_kaunter" INTEGER,
    "purata_masa_menunggu" TIME,
    "purata_masa_layanan" TIME,
    "masa_menunggu_terlama" TIME,
    "masa_layanan_terlama" TIME,
    "jumlah_masa_keseluruhan" TIME,

    CONSTRAINT "perkhidmatan_stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref" (
    "id" SERIAL NOT NULL,
    "kod" VARCHAR(20) NOT NULL,
    "keterangan" VARCHAR(255) NOT NULL,
    "nilai" VARCHAR(100),
    "jenis" INTEGER NOT NULL,

    CONSTRAINT "ref_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tempahan_batal" (
    "id" SERIAL NOT NULL,
    "id_tempahan" INTEGER,
    "tempahan_masa_id" INTEGER,
    "cawangan" VARCHAR(100),
    "urusniaga" INTEGER,
    "kategori" INTEGER,
    "nopengenalan" VARCHAR(20),
    "nama" VARCHAR(200),
    "notelefon" VARCHAR(20),
    "emel" VARCHAR(50),
    "player_id" VARCHAR(100),
    "hash" VARCHAR(100),
    "is_pending" INTEGER,
    "create_date" TIMESTAMP(3),
    "tujuan_transaksi" VARCHAR(255),
    "web_token" VARCHAR(100),
    "first_id" INTEGER,
    "first_masa_id" INTEGER,
    "remarks" VARCHAR(255),

    CONSTRAINT "tempahan_batal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tempahan_list" (
    "id" SERIAL NOT NULL,
    "tempahan_masa_id" INTEGER,
    "cawangan" VARCHAR(100),
    "urusniaga" INTEGER,
    "kategori" INTEGER,
    "nopengenalan" VARCHAR(20),
    "nama" VARCHAR(200),
    "notelefon" VARCHAR(20),
    "emel" VARCHAR(50),
    "player_id" VARCHAR(100),
    "hash" VARCHAR(100),
    "is_pending" INTEGER,
    "create_date" TIMESTAMP(3),
    "batal" VARCHAR(3),
    "tujuan_transaksi" VARCHAR(255),
    "web_token" VARCHAR(100),
    "first_id" INTEGER,
    "first_masa_id" INTEGER,
    "temp_id" INTEGER,

    CONSTRAINT "tempahan_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tempahan_list_temp" (
    "id" SERIAL NOT NULL,
    "id_list" INTEGER,
    "tempahan_masa_id" INTEGER,
    "cawangan" VARCHAR(100),
    "urusniaga" INTEGER,
    "kategori" INTEGER,
    "nopengenalan" VARCHAR(20),
    "nama" VARCHAR(200),
    "notelefon" VARCHAR(20),
    "emel" VARCHAR(50),
    "player_id" VARCHAR(100),
    "hash" VARCHAR(100),
    "is_pending" INTEGER,
    "create_date" TIMESTAMP(3),
    "batal" INTEGER,
    "tujuan_transaksi" VARCHAR(255),
    "web_token" VARCHAR(100),
    "first_id" INTEGER,
    "first_masa_id" INTEGER,

    CONSTRAINT "tempahan_list_temp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tempahan_masa" (
    "id" SERIAL NOT NULL,
    "cawangan" VARCHAR(200),
    "kump_perkhidmatan" VARCHAR(30),
    "tarikh" VARCHAR(30),
    "masa" VARCHAR(30),
    "bilangan" INTEGER,
    "status" INTEGER,
    "bil_tlh_isi" INTEGER DEFAULT 0,
    "buka_tempahan" INTEGER,

    CONSTRAINT "tempahan_masa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tempahan_rate" (
    "id" SERIAL NOT NULL,
    "id_tempahan" INTEGER NOT NULL,
    "rate" INTEGER NOT NULL,
    "comment" TEXT,
    "create_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tempahan_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tempahan_tarikh" (
    "id" SERIAL NOT NULL,
    "cawangan" VARCHAR(100),
    "kump_perkhidmatan" VARCHAR(20),
    "had_max" VARCHAR(5),
    "tarikh" VARCHAR(20),
    "status" INTEGER DEFAULT 0,
    "cttn_batal" TEXT,
    "nyahaktif" INTEGER,
    "buka_tempahan" INTEGER,

    CONSTRAINT "tempahan_tarikh_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tempahan_temp" (
    "id" SERIAL NOT NULL,
    "tempahan_masa_id" INTEGER,
    "cawangan" VARCHAR(100),
    "urusniaga" INTEGER,
    "kategori" INTEGER,
    "nopengenalan" VARCHAR(20),
    "nama" VARCHAR(200),
    "notelefon" VARCHAR(20),
    "emel" VARCHAR(50),
    "player_id" VARCHAR(100),
    "hash" VARCHAR(100),
    "is_pending" INTEGER,
    "create_date" TIMESTAMP(3),
    "batal" INTEGER,
    "tujuan_transaksi" VARCHAR(255),
    "web_token" VARCHAR(100),
    "first_id" INTEGER,
    "first_masa_id" INTEGER,
    "temp_id" INTEGER,
    "update_list" INTEGER,

    CONSTRAINT "tempahan_temp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tempahan_temp2" (
    "id" SERIAL NOT NULL,
    "tempahan_masa_id" INTEGER,
    "cawangan" VARCHAR(100),
    "urusniaga" INTEGER,
    "kategori" INTEGER,
    "nopengenalan" VARCHAR(20),
    "nama" VARCHAR(200),
    "notelefon" VARCHAR(20),
    "emel" VARCHAR(50),
    "player_id" VARCHAR(100),
    "hash" VARCHAR(100),
    "is_pending" INTEGER,
    "create_date" TIMESTAMP(3),
    "batal" INTEGER,
    "tujuan_transaksi" VARCHAR(255),
    "web_token" VARCHAR(100),
    "first_id" INTEGER,
    "first_masa_id" INTEGER,
    "update_list" INTEGER,

    CONSTRAINT "tempahan_temp2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_01" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" INTEGER,
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" INTEGER DEFAULT 0,
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_01_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_02" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" INTEGER,
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" INTEGER DEFAULT 0,
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_02_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_03" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" INTEGER,
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" INTEGER DEFAULT 0,
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_03_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_04" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" INTEGER,
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" INTEGER DEFAULT 0,
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_04_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_05" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" INTEGER,
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" INTEGER DEFAULT 0,
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_05_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_06" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" INTEGER,
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" INTEGER DEFAULT 0,
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_06_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_07" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" VARCHAR(11),
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" VARCHAR(11) DEFAULT '0',
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_07_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_08" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" INTEGER,
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" INTEGER DEFAULT 0,
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_08_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_09" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" INTEGER,
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" INTEGER DEFAULT 0,
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_09_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_10" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" VARCHAR(11),
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" VARCHAR(11) DEFAULT '0',
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_10_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_11" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" INTEGER,
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" INTEGER DEFAULT 0,
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_11_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_12" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" INTEGER,
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" INTEGER DEFAULT 0,
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_12_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_13" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" INTEGER,
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" INTEGER DEFAULT 0,
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_13_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_14" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" INTEGER,
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" INTEGER DEFAULT 0,
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_14_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_15" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" INTEGER,
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" INTEGER DEFAULT 0,
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_15_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_16" (
    "id" SERIAL NOT NULL,
    "transid" VARCHAR(50),
    "no_tiket" INTEGER,
    "no_siri" INTEGER NOT NULL,
    "tarikh" TIMESTAMP(3),
    "kaunter" INTEGER,
    "cawangan" VARCHAR(20),
    "kumpulan_perkhidmatan" INTEGER,
    "player_id" VARCHAR(100),
    "create_date" TIMESTAMP(3),
    "call_date" TIMESTAMP(3),
    "transfer_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "cancel_date" TIMESTAMP(3),
    "active_date" TIMESTAMP(3),
    "request_by" INTEGER DEFAULT 1,
    "catatan" TEXT,
    "status_tiket" INTEGER DEFAULT 0,
    "batal_oleh" INTEGER NOT NULL DEFAULT 0,
    "ip" VARCHAR(100),
    "bilangan_panggil" INTEGER DEFAULT 0,
    "transfer_from" INTEGER DEFAULT 0,
    "masa_menunggu" TIME,
    "masa_layanan" TIME,
    "jumlah_masa" TIME,
    "update_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sesi" INTEGER NOT NULL,
    "perkhidmatan_khas" VARCHAR(5),
    "jenis_tiket" INTEGER,
    "uuid" VARCHAR(100),

    CONSTRAINT "tiket_16_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_stat" (
    "id" SERIAL NOT NULL,
    "cawangan" VARCHAR(20),
    "tarikh" DATE,
    "bil_tiket" INTEGER,
    "bil_selesai" INTEGER,
    "bil_batal" INTEGER,
    "bil_lain" INTEGER,
    "batal_cust" INTEGER,
    "batal_kaunter" INTEGER,
    "purata_masa_menunggu" VARCHAR(30),
    "purata_masa_layanan" VARCHAR(30),
    "masa_menunggu_terlama" VARCHAR(30),
    "masa_layanan_terlama" VARCHAR(30),
    "jumlah_masa_keseluruhan" VARCHAR(30),
    "masa_awal" TIME,
    "masa_akhir" TIME,

    CONSTRAINT "tiket_stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_stat_copy" (
    "id" SERIAL NOT NULL,
    "cawangan" VARCHAR(20),
    "tarikh" DATE,
    "bil_tiket" INTEGER,
    "bil_selesai" INTEGER,
    "bil_batal" INTEGER,
    "bil_lain" INTEGER,
    "batal_cust" INTEGER,
    "batal_kaunter" INTEGER,
    "purata_masa_menunggu" VARCHAR(30),
    "purata_masa_layanan" VARCHAR(30),
    "masa_menunggu_terlama" VARCHAR(30),
    "masa_layanan_terlama" VARCHAR(30),
    "jumlah_masa_keseluruhan" VARCHAR(30),
    "masa_awal" TIME,
    "masa_akhir" TIME,

    CONSTRAINT "tiket_stat_copy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_stat_hour" (
    "id" SERIAL NOT NULL,
    "cawangan" VARCHAR(20),
    "tarikh" DATE,
    "bil_tiket" INTEGER,
    "bil_tiket_batal_cust" INTEGER,
    "masa" VARCHAR(5),
    "jum" INTEGER,

    CONSTRAINT "tiket_stat_hour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiket_stat_utc" (
    "id" SERIAL NOT NULL,
    "cawangan" VARCHAR(20),
    "tarikh" DATE,
    "bil_tiket" INTEGER,
    "bil_tiket_batal_cust" INTEGER,
    "masa" VARCHAR(5),
    "jum" INTEGER,

    CONSTRAINT "tiket_stat_utc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tref_branch" (
    "REFBR_BRANCH_ID" CHAR(7),
    "REFBR_AGENCY_CODE" CHAR(2),
    "REFBR_STATE_CODE" CHAR(2),
    "REFBR_BRANCH_CODE" CHAR(2),
    "REFBR_USAGE_CODE" CHAR(1),
    "REFBR_NAME" CHAR(80),
    "REFBR_ADDRESS1" CHAR(40),
    "REFBR_ADDRESS2" CHAR(40),
    "REFBR_ADDRESS3" CHAR(40),
    "REFBR_POSTCODE" CHAR(5),
    "REFBR_CITY" CHAR(4),
    "REFBR_STATE" CHAR(2),
    "REFBR_COUNTRY" CHAR(3),
    "REFBR_TELNO" CHAR(14),
    "REFBR_EMAIL" CHAR(100),
    "REFBR_CONTACT_PERSON" CHAR(80),
    "REFBR_CREATE_BRANCH" CHAR(7),
    "REFBR_UPDATE_BRANCH" CHAR(7),
    "REFBR_CREATE_USER" CHAR(12),
    "REFBR_CREATE_DATE" DATE,
    "REFBR_UPDATE_USER" CHAR(12),
    "REFBR_UPDATE_DATE" DATE,
    "REFBR_MASTER_BR_ID" CHAR(7),
    "REFBR_EA_SHORT_CODE" CHAR(3),
    "REFBR_FAX_NO" CHAR(14),
    "REFBR_DISTRICT_CODE" CHAR(5),
    "REFBR_STATUS" CHAR(1),
    "REFBR_ADDRESS4" CHAR(40),
    "REFBR_ADDRESS5" CHAR(40),
    "REFBR_REMARK" CHAR(25)
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "nokp" VARCHAR(20),
    "nama" VARCHAR(200),
    "uname" VARCHAR(20),
    "pass" VARCHAR(200),
    "level_akses" INTEGER,
    "id_cawangan" VARCHAR(10),
    "last_login" TIMESTAMP(3),
    "catatan" VARCHAR(20),
    "status_login" INTEGER,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waktu_operasi" (
    "id" SERIAL NOT NULL,
    "cawangan" VARCHAR(20),
    "nama_hari" VARCHAR(3),
    "waktu_mula" TIME,
    "waktu_tamat" TIME,
    "sesi" INTEGER,
    "status_aktif" INTEGER NOT NULL DEFAULT 1,
    "create_date" TIMESTAMP(3),
    "update_date" TIMESTAMP(3),

    CONSTRAINT "waktu_operasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zon" (
    "id" SERIAL NOT NULL,
    "cawangan" VARCHAR(10) NOT NULL,
    "zon" VARCHAR(25) NOT NULL,
    "catatan" VARCHAR(50) NOT NULL,

    CONSTRAINT "zon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kaunter_stat_cawangan_idx" ON "kaunter_stat"("cawangan");

-- CreateIndex
CREATE INDEX "kaunter_stat_tarikh_idx" ON "kaunter_stat"("tarikh");

-- CreateIndex
CREATE INDEX "kumpulan_perkhidmatan_id_cawangan_idx" ON "kumpulan_perkhidmatan"("id_cawangan");

-- CreateIndex
CREATE INDEX "idx_uuid" ON "log_tiket"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "no_siri" ON "log_tiket"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "no_tiket" ON "log_tiket"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "log_tiket_kaunter" ON "log_tiket"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "log_tiket_kumpulan_perkhidmatan" ON "log_tiket"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "log_tiket_cawangan" ON "log_tiket"("cawangan", "id");

-- CreateIndex
CREATE INDEX "perkhidmatan_stat_cawangan_idx" ON "perkhidmatan_stat"("cawangan");

-- CreateIndex
CREATE INDEX "perkhidmatan_stat_tarikh_idx" ON "perkhidmatan_stat"("tarikh");

-- CreateIndex
CREATE INDEX "tempahan_batal_kategori_idx" ON "tempahan_batal"("kategori");

-- CreateIndex
CREATE INDEX "tempahan_batal_nopengenalan_idx" ON "tempahan_batal"("nopengenalan");

-- CreateIndex
CREATE INDEX "tempahan_batal_cawangan_idx" ON "tempahan_batal"("cawangan");

-- CreateIndex
CREATE INDEX "tempahan_batal_tempahan_masa_id_idx" ON "tempahan_batal"("tempahan_masa_id");

-- CreateIndex
CREATE INDEX "tempahan_list_kategori_idx" ON "tempahan_list"("kategori");

-- CreateIndex
CREATE INDEX "tempahan_list_nopengenalan_idx" ON "tempahan_list"("nopengenalan");

-- CreateIndex
CREATE INDEX "tempahan_list_cawangan_idx" ON "tempahan_list"("cawangan");

-- CreateIndex
CREATE INDEX "tempahan_list_tempahan_masa_id_idx" ON "tempahan_list"("tempahan_masa_id");

-- CreateIndex
CREATE INDEX "tempahan_masa_cawangan_idx" ON "tempahan_masa"("cawangan");

-- CreateIndex
CREATE INDEX "tempahan_masa_kump_perkhidmatan_idx" ON "tempahan_masa"("kump_perkhidmatan");

-- CreateIndex
CREATE INDEX "tempahan_tarikh_kump_perkhidmatan_idx" ON "tempahan_tarikh"("kump_perkhidmatan");

-- CreateIndex
CREATE INDEX "tempahan_tarikh_cawangan_idx" ON "tempahan_tarikh"("cawangan");

-- CreateIndex
CREATE INDEX "tempahan_temp_nopengenalan_idx" ON "tempahan_temp"("nopengenalan");

-- CreateIndex
CREATE INDEX "tempahan_temp_kategori_idx" ON "tempahan_temp"("kategori");

-- CreateIndex
CREATE INDEX "tempahan_temp_cawangan_idx" ON "tempahan_temp"("cawangan");

-- CreateIndex
CREATE INDEX "tempahan_temp_tempahan_masa_id_idx" ON "tempahan_temp"("tempahan_masa_id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_01_no_siri" ON "tiket_01"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_01_no_tiket" ON "tiket_01"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_01_kaunter" ON "tiket_01"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_01_kumpulan_perkhidmatan" ON "tiket_01"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_01_cawangan" ON "tiket_01"("cawangan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_02_no_siri" ON "tiket_02"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_02_no_tiket" ON "tiket_02"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_02_kaunter" ON "tiket_02"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_02_kumpulan_perkhidmatan" ON "tiket_02"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_02_cawangan" ON "tiket_02"("cawangan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_03_no_siri" ON "tiket_03"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_03_no_tiket" ON "tiket_03"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_03_kaunter" ON "tiket_03"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_03_kumpulan_perkhidmatan" ON "tiket_03"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_03_cawangan" ON "tiket_03"("cawangan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_04_no_siri" ON "tiket_04"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_04_no_tiket" ON "tiket_04"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_04_kaunter" ON "tiket_04"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_04_kumpulan_perkhidmatan" ON "tiket_04"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_04_cawangan" ON "tiket_04"("cawangan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_05_no_siri" ON "tiket_05"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_05_no_tiket" ON "tiket_05"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_05_kaunter" ON "tiket_05"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_05_kumpulan_perkhidmatan" ON "tiket_05"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_05_cawangan" ON "tiket_05"("cawangan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_06_no_siri" ON "tiket_06"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_06_no_tiket" ON "tiket_06"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_06_kaunter" ON "tiket_06"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_06_kumpulan_perkhidmatan" ON "tiket_06"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_06_cawangan" ON "tiket_06"("cawangan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_07_no_siri" ON "tiket_07"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_07_no_tiket" ON "tiket_07"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_07_kaunter" ON "tiket_07"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_07_kumpulan_perkhidmatan" ON "tiket_07"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_07_cawangan" ON "tiket_07"("cawangan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_08_no_siri" ON "tiket_08"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_08_no_tiket" ON "tiket_08"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_08_kaunter" ON "tiket_08"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_08_kumpulan_perkhidmatan" ON "tiket_08"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_08_cawangan" ON "tiket_08"("cawangan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_09_no_siri" ON "tiket_09"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_09_no_tiket" ON "tiket_09"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_09_kaunter" ON "tiket_09"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_09_kumpulan_perkhidmatan" ON "tiket_09"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_09_cawangan" ON "tiket_09"("cawangan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_10_no_siri" ON "tiket_10"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_10_no_tiket" ON "tiket_10"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_10_kaunter" ON "tiket_10"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_10_kumpulan_perkhidmatan" ON "tiket_10"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_10_cawangan" ON "tiket_10"("cawangan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_11_no_siri" ON "tiket_11"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_11_no_tiket" ON "tiket_11"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_11_kaunter" ON "tiket_11"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_11_kumpulan_perkhidmatan" ON "tiket_11"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_11_cawangan" ON "tiket_11"("cawangan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_12_no_siri" ON "tiket_12"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_12_no_tiket" ON "tiket_12"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_12_kaunter" ON "tiket_12"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_12_kumpulan_perkhidmatan" ON "tiket_12"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_12_cawangan" ON "tiket_12"("cawangan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_13_no_siri" ON "tiket_13"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_13_no_tiket" ON "tiket_13"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_13_kaunter" ON "tiket_13"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_13_kumpulan_perkhidmatan" ON "tiket_13"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_13_cawangan" ON "tiket_13"("cawangan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_14_no_siri" ON "tiket_14"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_14_no_tiket" ON "tiket_14"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_14_kaunter" ON "tiket_14"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_14_kumpulan_perkhidmatan" ON "tiket_14"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_14_cawangan" ON "tiket_14"("cawangan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_15_no_siri" ON "tiket_15"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_15_no_tiket" ON "tiket_15"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_15_kaunter" ON "tiket_15"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_15_kumpulan_perkhidmatan" ON "tiket_15"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_15_cawangan" ON "tiket_15"("cawangan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_16_no_siri" ON "tiket_16"("no_siri", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_16_no_tiket" ON "tiket_16"("no_tiket", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_16_kaunter" ON "tiket_16"("kaunter", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_16_kumpulan_perkhidmatan" ON "tiket_16"("kumpulan_perkhidmatan", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tiket_16_cawangan" ON "tiket_16"("cawangan", "id");

-- CreateIndex
CREATE INDEX "tiket_stat_cawangan_idx" ON "tiket_stat"("cawangan");

-- CreateIndex
CREATE INDEX "tiket_stat_tarikh_idx" ON "tiket_stat"("tarikh");

-- CreateIndex
CREATE INDEX "tiket_stat_copy_cawangan_idx" ON "tiket_stat_copy"("cawangan");

-- CreateIndex
CREATE INDEX "tiket_stat_copy_tarikh_idx" ON "tiket_stat_copy"("tarikh");

-- CreateIndex
CREATE INDEX "tiket_stat_hour_cawangan_idx" ON "tiket_stat_hour"("cawangan");

-- CreateIndex
CREATE INDEX "tiket_stat_hour_tarikh_idx" ON "tiket_stat_hour"("tarikh");

-- CreateIndex
CREATE INDEX "tiket_stat_utc_cawangan_idx" ON "tiket_stat_utc"("cawangan");

-- CreateIndex
CREATE INDEX "tiket_stat_utc_tarikh_idx" ON "tiket_stat_utc"("tarikh");

-- CreateIndex
CREATE INDEX "users_id_cawangan_idx" ON "users"("id_cawangan");

-- CreateIndex
CREATE INDEX "waktu_operasi_cawangan_idx" ON "waktu_operasi"("cawangan");

-- CreateIndex
CREATE INDEX "waktu_operasi_nama_hari_idx" ON "waktu_operasi"("nama_hari");
