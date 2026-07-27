import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import JadualClient from "./JadualClient";

export default async function JadualPage() {
  const session = await auth();
  if (!session) return null;

  const cawangan = session.user.idCawangan;

  // Get staff list (level_akses = 3)
  const staff = await prisma.user.findMany({
    where: { idCawangan: cawangan, levelAkses: 3 },
    orderBy: { nama: "asc" },
  });

  // Get kaunter list with kumpulan names
  const kaunters = await prisma.$queryRawUnsafe<
    Array<{ id: number; no_kaunter: string; keterangan: string }>
  >(
    `SELECT a.id, a.no_kaunter, b.keterangan FROM kaunter a
     INNER JOIN kumpulan_perkhidmatan b ON a.id_perkhidmatan_kumpulan = b.id
     WHERE a.id_cawangan = ?`,
    cawangan
  );

  // Get existing jadual (only current/active ones)
  const todayStr = new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const jadualList = await prisma.$queryRawUnsafe<
    Array<{
      id: number;
      nokp: string;
      id_kaunter: number;
      tarikh_mula: Date | null;
      tarikh_tamat: Date | null;
      nama: string | null;
      no_kaunter: string | null;
      keterangan: string | null;
    }>
  >(
    `SELECT j.id, j.nokp, j.id_kaunter, j.tarikh_mula, j.tarikh_tamat,
            u.nama, k.no_kaunter, kp.keterangan
     FROM jadual_tugasan j
     LEFT JOIN users u ON j.nokp = u.uname
     LEFT JOIN kaunter k ON j.id_kaunter = k.id
     LEFT JOIN kumpulan_perkhidmatan kp ON k.id_perkhidmatan_kumpulan = kp.id
     WHERE j.id_cawangan = ? AND j.status_aktif = 1
     AND ? BETWEEN j.tarikh_mula AND j.tarikh_tamat
     ORDER BY k.no_kaunter ASC`,
    cawangan,
    todayStr
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Jadual Bertugas</h1>
        <p className="text-gray-500 mt-1">
          Pengurusan jadual kerja kakitangan kaunter
        </p>
      </div>

      <JadualClient
        staff={JSON.parse(JSON.stringify(staff))}
        kaunters={JSON.parse(
          JSON.stringify(
            kaunters.map((k) => ({ ...k, id: Number(k.id) }))
          )
        )}
        jadualList={JSON.parse(
          JSON.stringify(
            jadualList.map((j) => ({ ...j, id: Number(j.id) }))
          )
        )}
      />
    </div>
  );
}
