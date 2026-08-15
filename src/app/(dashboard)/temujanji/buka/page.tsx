import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import BukaTemujanjiClient from "./BukaTemujanjiClient";

export default async function BukaTemujanjiPage() {
  const session = await auth();
  if (!session) return null;
  if (session.user.levelAkses === "1") redirect("/temujanji/kalendar");

  const idCawangan = session.user.idCawangan;
  const [cawangan, kumpulan, hariCuti, cutiUmum, waktuOperasi] = await Promise.all([
    prisma.cawangan.findFirst({
      where: { idCawangan },
      select: { namaCawangan: true },
    }),
    prisma.kumpulanPerkhidmatan.findMany({
      where: { idCawangan, status: 1 },
      orderBy: [{ noSiri: "asc" }, { id: "asc" }],
      select: { id: true, keterangan: true },
    }),
    prisma.hariCuti.findMany({
      where: { cawangan: idCawangan },
      orderBy: { namaHari: "asc" },
      select: { id: true, namaHari: true },
    }),
    prisma.cutiUmum.findMany({
      where: { cawangan: idCawangan },
      orderBy: { tarikh1: "asc" },
      select: { id: true, tarikh1: true, keterangan: true },
    }),
    prisma.waktuOperasi.findMany({
      where: { cawangan: idCawangan, statusAktif: 1 },
      orderBy: [{ namaHari: "asc" }, { sesi: "asc" }, { id: "asc" }],
      select: {
        id: true,
        namaHari: true,
        waktuMula: true,
        waktuTamat: true,
        sesi: true,
      },
    }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Buka Temujanji</h1>
        <p className="mt-1 text-gray-500">
          Tetapan waktu temujanji untuk {cawangan?.namaCawangan}
        </p>
      </div>

      <BukaTemujanjiClient
        cutiUmum={JSON.parse(JSON.stringify(cutiUmum))}
        hariCuti={JSON.parse(JSON.stringify(hariCuti))}
        kumpulan={JSON.parse(JSON.stringify(kumpulan))}
        waktuOperasi={JSON.parse(JSON.stringify(waktuOperasi))}
      />
    </div>
  );
}
