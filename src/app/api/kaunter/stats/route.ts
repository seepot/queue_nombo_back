import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getTiketTable(cawangan: string): string {
  const negeri = cawangan.substring(2, 4);
  return `tiket_${negeri}`;
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idCawangan = session.user.idCawangan;
  let noKaunter = session.user.noKaunter;

  // Fallback: look up kaunter from DB if not in session
  if (!noKaunter) {
    const userData = await prisma.user.findFirst({
      where: { id: Number(session.user.id) },
    });
    if (userData?.uname) {
      const kaunterData = await prisma.$queryRawUnsafe<
        Array<{ no_kaunter: string | null }>
      >(
        `SELECT k.no_kaunter FROM kaunter k
         INNER JOIN jadual_tugasan j ON j.id_kaunter = k.id
         WHERE j.nokp = ? LIMIT 1`,
        userData.uname
      );
      if (kaunterData.length) {
        noKaunter = kaunterData[0].no_kaunter || undefined;
      }
    }
  }

  const kaunterNum = noKaunter ? Number(noKaunter) : 0;
  const todayStr = new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const tbl = getTiketTable(idCawangan);

  // Current ticket
  const currentTicket = await prisma.$queryRawUnsafe<
    Array<{ no_tiket: number; transid: string; status_tiket: number }>
  >(
    `SELECT no_tiket, transid, status_tiket FROM ${tbl}
     WHERE cawangan = ? AND kaunter = ? AND DATE(tarikh) = ?
     AND status_tiket IN (1, 2)
     ORDER BY call_date DESC LIMIT 1`,
    idCawangan,
    kaunterNum,
    todayStr
  );

  // Waiting queue
  const waitingList = await prisma.$queryRawUnsafe<
    Array<{ no_tiket: number; no_siri: number; sesi: number }>
  >(
    `SELECT no_tiket, no_siri, sesi FROM ${tbl}
     WHERE cawangan = ? AND DATE(tarikh) = ? AND status_tiket = 0 AND kaunter IS NULL
     ORDER BY id ASC LIMIT 20`,
    idCawangan,
    todayStr
  );

  // Cancelled
  const cancelledList = await prisma.$queryRawUnsafe<
    Array<{ no_tiket: number; cancel_date: Date | null; status_tiket: number }>
  >(
    `SELECT no_tiket, cancel_date, status_tiket FROM ${tbl}
     WHERE cawangan = ? AND kaunter = ? AND DATE(tarikh) = ? AND status_tiket = 5
     ORDER BY id DESC LIMIT 10`,
    idCawangan,
    kaunterNum,
    todayStr
  );

  // Transferred
  const transferredList = await prisma.$queryRawUnsafe<
    Array<{ no_tiket: number; transfer_from: number; status_tiket: number }>
  >(
    `SELECT no_tiket, transfer_from, status_tiket FROM ${tbl}
     WHERE cawangan = ? AND kaunter = ? AND DATE(tarikh) = ? AND status_tiket = 3
     ORDER BY id DESC LIMIT 10`,
    idCawangan,
    kaunterNum,
    todayStr
  );

  // Served count
  const servedResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT COUNT(*) as count FROM ${tbl}
     WHERE cawangan = ? AND kaunter = ? AND DATE(tarikh) = ? AND status_tiket = 4`,
    idCawangan,
    kaunterNum,
    todayStr
  );
  const bilPelanggan = Number(servedResult[0]?.count ?? 0);

  // Last ticket
  const lastTicket = await prisma.$queryRawUnsafe<
    Array<{ no_tiket: number; end_date: Date | null; status_tiket: number }>
  >(
    `SELECT no_tiket, end_date, status_tiket FROM ${tbl}
     WHERE cawangan = ? AND kaunter = ? AND DATE(tarikh) = ? AND status_tiket = 4
     ORDER BY end_date DESC LIMIT 5`,
    idCawangan,
    kaunterNum,
    todayStr
  );

  // Pindah perkhidmatan
  const pindahPerkhidmatanList = await prisma.$queryRawUnsafe<
    Array<{ no_tiket: number; keterangan: string | null; status_tiket: number }>
  >(
    `SELECT a.no_tiket, b.keterangan, a.status_tiket FROM ${tbl} a
     LEFT JOIN kumpulan_perkhidmatan b ON a.kumpulan_perkhidmatan = b.id
     WHERE a.cawangan = ? AND a.status_tiket = 6 AND DATE(a.tarikh) = ?
     AND a.transfer_from <> ? AND a.kaunter = ?
     ORDER BY a.id DESC LIMIT 10`,
    idCawangan,
    todayStr,
    kaunterNum,
    kaunterNum
  );

  // Bilangan mengikut perkhidmatan
  const bilanganPerkhidmatan = await prisma.$queryRawUnsafe<
    Array<{ bilangan: bigint; keterangan: string | null }>
  >(
    `SELECT COUNT(*) as bilangan, b.keterangan FROM ${tbl} a
     INNER JOIN kumpulan_perkhidmatan b ON a.kumpulan_perkhidmatan = b.id
     WHERE a.cawangan = ? AND DATE(a.tarikh) = ?
     GROUP BY a.kumpulan_perkhidmatan`,
    idCawangan,
    todayStr
  );

  return NextResponse.json({
    currentTicket: currentTicket[0] || null,
    waitingList,
    cancelledList,
    transferredList,
    bilPelanggan,
    belumPanggil: waitingList.length,
    lastTicket,
    pindahPerkhidmatanList,
    bilanganPerkhidmatan: bilanganPerkhidmatan.map((r) => ({
      keterangan: r.keterangan || "Lain-lain",
      bilangan: Number(r.bilangan),
    })),
  });
}
