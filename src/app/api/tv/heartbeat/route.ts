import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fallback in-memory store in case table tv_display is pending migration
interface TvRecord {
  id: number;
  idCawangan: string;
  namaTv: string;
  lokasi: string | null;
  ipAddress: string | null;
  deviceInfo: string | null;
  lastPing: Date;
  currentTicket: string | null;
  statusRealtime: string | null;
  appVersion: string | null;
  remoteCommand: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var globalTvStore: Map<string, TvRecord> | undefined;
}

const tvStore = globalThis.globalTvStore ?? new Map<string, TvRecord>();
globalThis.globalTvStore = tvStore;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      cawangan,
      idCawangan = cawangan,
      namaTv = "TV Utama Dewan",
      lokasi = "Ruang Menunggu Utama",
      currentTicket = null,
      statusRealtime = "connected",
      appVersion = "2.0.0",
      deviceInfo = req.headers.get("user-agent") || "Android TV",
    } = body;

    if (!idCawangan) {
      return NextResponse.json(
        { error: "idCawangan diperlukan" },
        { status: 400 }
      );
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const key = `${idCawangan}_${namaTv}`;
    const now = new Date(Date.now() + 8 * 60 * 60 * 1000);

    // 1. Try DB update/upsert
    let pendingCommand: string | null = null;
    try {
      // Auto create table if not exists (raw safe)
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS tv_display (
          id INT AUTO_INCREMENT PRIMARY KEY,
          id_cawangan VARCHAR(20) NOT NULL,
          nama_tv VARCHAR(100) NOT NULL DEFAULT 'TV Utama Dewan',
          lokasi VARCHAR(100) NULL,
          ip_address VARCHAR(50) NULL,
          device_info VARCHAR(255) NULL,
          last_ping DATETIME NOT NULL,
          current_ticket VARCHAR(50) NULL,
          status_realtime VARCHAR(30) DEFAULT 'connected',
          app_version VARCHAR(30) NULL,
          remote_command VARCHAR(50) NULL,
          create_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_cawangan (id_cawangan)
        )
      `).catch(() => {});

      const existing = await prisma.$queryRawUnsafe<
        Array<{ id: number; remote_command: string | null }>
      >(
        `SELECT id, remote_command FROM tv_display WHERE id_cawangan = ? AND nama_tv = ? LIMIT 1`,
        idCawangan,
        namaTv
      );

      if (existing && existing.length > 0) {
        pendingCommand = existing[0].remote_command;
        await prisma.$executeRawUnsafe(
          `UPDATE tv_display 
           SET ip_address = ?, device_info = ?, last_ping = NOW(), current_ticket = ?, status_realtime = ?, app_version = ?, remote_command = NULL
           WHERE id = ?`,
          clientIp,
          deviceInfo.slice(0, 250),
          currentTicket,
          statusRealtime,
          appVersion,
          existing[0].id
        );
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO tv_display (id_cawangan, nama_tv, lokasi, ip_address, device_info, last_ping, current_ticket, status_realtime, app_version)
           VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
          idCawangan,
          namaTv,
          lokasi,
          clientIp,
          deviceInfo.slice(0, 250),
          currentTicket,
          statusRealtime,
          appVersion
        );
      }
    } catch {
      // Fallback to memory store
      const existingMem = tvStore.get(key);
      pendingCommand = existingMem?.remoteCommand || null;
      tvStore.set(key, {
        id: existingMem?.id || Date.now(),
        idCawangan,
        namaTv,
        lokasi,
        ipAddress: clientIp,
        deviceInfo,
        lastPing: now,
        currentTicket,
        statusRealtime,
        appVersion,
        remoteCommand: null,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Heartbeat diterima",
      serverTime: now.toISOString(),
      command: pendingCommand || "NONE",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Ralat memproses denyutan nadi TV" },
      { status: 500 }
    );
  }
}
