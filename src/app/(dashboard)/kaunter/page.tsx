import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import KaunterClient from "./KaunterClient";

function getTiketTable(cawangan: string): string {
  const negeri = cawangan.substring(2, 4);
  return `tiket_${negeri}`;
}

async function getKaunterData(idCawangan: string) {
  const todayStr = new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const tbl = getTiketTable(idCawangan);

  const [kaunters, kumpulan, zon] = await Promise.all([
    prisma.kaunter.findMany({
      where: { idCawangan },
      orderBy: { id: "asc" },
    }),
    prisma.kumpulanPerkhidmatan.findMany({
      where: { idCawangan },
    }),
    prisma.zon.findMany({
      where: { cawangan: idCawangan },
      orderBy: { id: "asc" },
      select: {
        id: true,
        zon: true,
        catatan: true,
      },
    }),
  ]);

  // Get transaction stats for each kaunter
  const kaunterStats = await Promise.all(
    kaunters.map(async (k) => {
      const noKaunter = k.noKaunter ? Number(k.noKaunter) : 0;

      // Jumlah transaksi today
      const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) as count FROM ${tbl}
         WHERE cawangan = ? AND kaunter = ? AND DATE(tarikh) = ?`,
        idCawangan,
        noKaunter,
        todayStr
      );
      const jumlahTransaksi = Number(countResult[0]?.count ?? 0);

      // Last ticket
      const lastResult = await prisma.$queryRawUnsafe<
        Array<{ no_tiket: number; tarikh: Date | null }>
      >(
        `SELECT no_tiket, tarikh FROM ${tbl}
         WHERE cawangan = ? AND kaunter = ? AND DATE(tarikh) = ?
         ORDER BY id DESC LIMIT 1`,
        idCawangan,
        noKaunter,
        todayStr
      );

      // Average service time (call_date to end_date for status=4)
      const durasiResult = await prisma.$queryRawUnsafe<
        Array<{ avg_seconds: number | null }>
      >(
        `SELECT AVG(TIMESTAMPDIFF(SECOND, call_date, end_date)) as avg_seconds FROM ${tbl}
         WHERE cawangan = ? AND kaunter = ? AND DATE(tarikh) = ? AND status_tiket = 4
         AND call_date IS NOT NULL AND end_date IS NOT NULL`,
        idCawangan,
        noKaunter,
        todayStr
      );

      const avgSeconds = Number(durasiResult[0]?.avg_seconds ?? 0);
      const h = Math.floor(avgSeconds / 3600);
      const m = Math.floor((avgSeconds % 3600) / 60);
      const s = Math.floor(avgSeconds % 60);
      const tempohMasa =
        avgSeconds > 0
          ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : null;

      return {
        ...k,
        jumlahTransaksi,
        noTerakhir: lastResult[0]?.no_tiket ?? null,
        tarikh: lastResult[0]?.tarikh
          ? new Date(lastResult[0].tarikh).toISOString().slice(0, 10)
          : null,
        tempohMasa,
      };
    })
  );

  return { kaunters: kaunterStats, kumpulan, zon };
}

export default async function KaunterPage() {
  const session = await auth();
  if (!session) return null;

  const data = await getKaunterData(session.user.idCawangan);

  // Get branch name
  const cawangan = await prisma.cawangan.findFirst({
    where: { idCawangan: session.user.idCawangan },
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Maklumat Kaunter
          </h1>
          <p className="text-gray-500 mt-1">
            Senarai dan tetapan kaunter untuk cawangan anda
          </p>
        </div>
      </div>

      <KaunterClient
        kaunters={JSON.parse(JSON.stringify(data.kaunters))}
        kumpulan={JSON.parse(JSON.stringify(data.kumpulan))}
        zon={JSON.parse(JSON.stringify(data.zon))}
        namaCawangan={cawangan?.namaCawangan || session.user.namaCawangan}
      />
    </div>
  );
}
