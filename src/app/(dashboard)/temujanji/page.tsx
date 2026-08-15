import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import TemujanjiClient from "./TemujanjiClient";

async function getTemujanjiData(idCawangan: string) {
  const [kumpulan, hariCuti, cutiUmum, waktuOperasi] = await Promise.all([
    prisma.kumpulanPerkhidmatan.findMany({
      where: { idCawangan },
    }),
    prisma.hariCuti.findMany({
      where: { cawangan: idCawangan },
    }),
    prisma.cutiUmum.findMany({
      where: { cawangan: idCawangan },
    }),
    prisma.waktuOperasi.findMany({
      where: { cawangan: idCawangan, statusAktif: 1 },
      orderBy: { id: "asc" },
    }),
  ]);

  return { kumpulan, hariCuti, cutiUmum, waktuOperasi };
}

export default async function TemujanjiPage() {
  const session = await auth();
  if (!session) return null;
  if (session.user.levelAkses === "1") redirect("/temujanji/kalendar");

  const data = await getTemujanjiData(session.user.idCawangan);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Pengurusan Temujanji
        </h1>
        <p className="text-gray-500 mt-1">
          Tetapan dan pengurusan slot temujanji
        </p>
      </div>

      <TemujanjiClient
        kumpulan={JSON.parse(JSON.stringify(data.kumpulan))}
        hariCuti={JSON.parse(JSON.stringify(data.hariCuti))}
        cutiUmum={JSON.parse(JSON.stringify(data.cutiUmum))}
        waktuOperasi={JSON.parse(JSON.stringify(data.waktuOperasi))}
      />
    </div>
  );
}
