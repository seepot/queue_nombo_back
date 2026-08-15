import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HadLimitClient from "./HadLimitClient";

async function getHadLimitData(idCawangan: string) {
  const [cawangan, kumpulan, hadPelanggan] = await Promise.all([
    prisma.cawangan.findFirst({
      where: { idCawangan },
      select: {
        idCawangan: true,
        namaCawangan: true,
        jenisLimit: true,
        selaMasa: true,
      },
    }),
    prisma.kumpulanPerkhidmatan.findMany({
      where: {
        idCawangan,
        NOT: { keterangan: "Khas" },
      },
      orderBy: [{ noSiri: "asc" }, { id: "asc" }],
      select: {
        id: true,
        keterangan: true,
        noSiri: true,
        status: true,
      },
    }),
    prisma.hadPelanggan.findMany({
      where: { cawangan: idCawangan },
      orderBy: { id: "asc" },
      select: {
        id: true,
        kumpulanPerkhidmatan: true,
        hadPelanggan1: true,
        hadPelanggan2: true,
        hadPelanggan3: true,
        jenisLimit: true,
        tempohMulaScan: true,
      },
    }),
  ]);

  const cawanganHad =
    hadPelanggan.find((row) => !row.kumpulanPerkhidmatan && row.jenisLimit === 1) ||
    hadPelanggan.find((row) => !row.kumpulanPerkhidmatan) ||
    null;

  const perkhidmatanHad = kumpulan.map((service) => {
    const had = hadPelanggan.find(
      (row) => row.kumpulanPerkhidmatan === String(service.id)
    );

    return {
      id: had?.id ?? null,
      kumpulanPerkhidmatan: String(service.id),
      keterangan: service.keterangan || `Perkhidmatan ${service.id}`,
      noSiri: service.noSiri,
      status: service.status ?? 1,
      hadPelanggan1: had?.hadPelanggan1 ?? 0,
      hadPelanggan2: had?.hadPelanggan2 ?? 0,
      hadPelanggan3: had?.hadPelanggan3 ?? 0,
    };
  });

  return {
    cawangan,
    jenisLimit: cawangan?.jenisLimit || 1,
    cawanganHad: {
      id: cawanganHad?.id ?? null,
      kumpulanPerkhidmatan: null,
      hadPelanggan1: cawanganHad?.hadPelanggan1 ?? 0,
      hadPelanggan2: cawanganHad?.hadPelanggan2 ?? 0,
      hadPelanggan3: cawanganHad?.hadPelanggan3 ?? 0,
    },
    tempohMulaScan: cawanganHad?.tempohMulaScan ?? hadPelanggan[0]?.tempohMulaScan ?? 0,
    tempohMenungguSelepasImbas: Math.floor((cawangan?.selaMasa || 0) / 60),
    perkhidmatanHad,
  };
}

export default async function HadLimitPage() {
  const session = await auth();
  if (!session) return null;

  const data = await getHadLimitData(session.user.idCawangan);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Had Limit</h1>
        <p className="text-gray-500 mt-1">
          Tetapan had pelanggan untuk {data.cawangan?.namaCawangan}
        </p>
      </div>

      <HadLimitClient data={JSON.parse(JSON.stringify(data))} />
    </div>
  );
}
