import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WaktuOperasiClient from "./WaktuOperasiClient";

export default async function WaktuOperasiPage() {
  const session = await auth();
  if (!session) return null;

  const cawangan = session.user.idCawangan;

  const currentYear = new Date(Date.now() + 8 * 60 * 60 * 1000).getFullYear();
  const startOfYear = new Date(`${currentYear}-01-01`);
  const endOfYear = new Date(`${currentYear}-12-31`);

  const [waktuOperasi, hariCuti, cutiUmum] = await Promise.all([
    prisma.waktuOperasi.findMany({
      where: { cawangan },
      orderBy: { id: "asc" },
    }),
    prisma.hariCuti.findMany({
      where: { cawangan },
    }),
    prisma.cutiUmum.findMany({
      where: {
        cawangan,
        tarikh1: { gte: startOfYear, lte: endOfYear },
      },
      orderBy: { tarikh1: "asc" },
    }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Masa Operasi</h1>
        <p className="text-gray-500 mt-1">
          Tetapan waktu operasi dan hari cuti cawangan
        </p>
      </div>

      <WaktuOperasiClient
        waktuOperasi={JSON.parse(JSON.stringify(waktuOperasi))}
        hariCuti={JSON.parse(JSON.stringify(hariCuti))}
        cutiUmum={JSON.parse(JSON.stringify(cutiUmum))}
      />
    </div>
  );
}
