import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

function getTiketTable(cawangan: string): string {
  return `tiket_${cawangan.substring(2, 4)}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { idKumpulanPerkhidmatan, cawangan } = body;
  const idCawangan = cawangan || session.user.idCawangan;
  const tbl = getTiketTable(idCawangan);

  // Get current session
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const dayCode = days[now.getDay()];
  const currentTime = now.toISOString().slice(11, 19);

  const sessionResult = await prisma.$queryRawUnsafe<Array<{ sesi: number }>>(
    `SELECT sesi FROM waktu_operasi WHERE cawangan = ? AND ? BETWEEN waktu_mula AND waktu_tamat AND status_aktif = 1 AND nama_hari = ? LIMIT 1`,
    idCawangan,
    currentTime,
    dayCode
  );
  const sesi = sessionResult[0]?.sesi || 1;

  // Get service info
  const perkhidmatan = await prisma.kumpulanPerkhidmatan.findUnique({
    where: { id: Number(idKumpulanPerkhidmatan) },
  });

  if (!perkhidmatan) {
    return NextResponse.json({ error: "Perkhidmatan tidak dijumpai" }, { status: 404 });
  }

  const noTiket = (perkhidmatan.noTerkini || 0) + 1;
  const noSiri = perkhidmatan.noSiri;

  // Generate transaction ID
  const transid = createHash("sha1")
    .update("manual" + idKumpulanPerkhidmatan + idCawangan + now.toISOString() + Math.random())
    .digest("hex");

  const tarikhStr = now.toISOString().slice(0, 19).replace("T", " ");

  // Insert ticket
  await prisma.$queryRawUnsafe(
    `INSERT INTO ${tbl} (transid, no_tiket, no_siri, tarikh, cawangan, kumpulan_perkhidmatan, player_id, status_tiket, sesi, perkhidmatan_khas, create_date)
     VALUES (?, ?, ?, ?, ?, ?, 'manual', 0, ?, ?, ?)`,
    transid,
    noTiket,
    noSiri,
    tarikhStr,
    idCawangan,
    Number(idKumpulanPerkhidmatan),
    sesi,
    Number(idKumpulanPerkhidmatan),
    tarikhStr
  );

  // Update no_terkini
  await prisma.kumpulanPerkhidmatan.update({
    where: { id: Number(idKumpulanPerkhidmatan) },
    data: { noTerkini: noTiket },
  });

  return NextResponse.json({
    success: true,
    no_tiket: noTiket,
    no_siri: noSiri,
    transid,
  });
}
