import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DrafSlotClient from "./DrafSlotClient";

interface PageProps {
  searchParams?: Promise<{ mula?: string; tamat?: string }>;
}

export default async function DrafSlotPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session) return null;
  if (session.user.levelAkses === "1") redirect("/temujanji/kalendar");

  const params = searchParams ? await searchParams : {};
  const mula = params.mula || "";
  const tamat = params.tamat || "";
  const idCawangan = session.user.idCawangan;
  const hasDateFilter = Boolean(mula && tamat);
  const slotDateFilter = hasDateFilter ? "AND a.tarikh BETWEEN ? AND ?" : "";
  const tarikhDateFilter = hasDateFilter ? { tarikh: { gte: mula, lte: tamat } } : {};

  const [cawangan, slots, tarikh] = await Promise.all([
    prisma.cawangan.findFirst({
      where: { idCawangan },
      select: { namaCawangan: true },
    }),
    prisma.$queryRawUnsafe<
      Array<{
        id: number;
        cawangan: string | null;
        keterangan: string | null;
        tarikh: string | null;
        bilangan: number | null;
        status: number | null;
        masa: string | null;
        urusniaga: number | null;
      }>
    >(
      `SELECT
         a.id,
         a.cawangan,
         b.keterangan,
         a.tarikh,
         a.bilangan,
         a.status,
         a.masa,
         b.id as urusniaga
       FROM tempahan_masa a
       LEFT JOIN kumpulan_perkhidmatan b ON a.kump_perkhidmatan = b.id
       WHERE a.status = 0
         AND a.cawangan = ?
         AND a.buka_tempahan IS NULL
         ${slotDateFilter}
       ORDER BY a.tarikh ASC, b.id ASC, a.masa ASC`,
      ...(hasDateFilter ? [idCawangan, mula, tamat] : [idCawangan])
    ),
    prisma.tempahanMasa.findMany({
      where: {
        cawangan: idCawangan,
        status: 0,
        bukaTempahan: null,
        ...tarikhDateFilter,
      },
      distinct: ["tarikh"],
      orderBy: { tarikh: "asc" },
      select: { tarikh: true },
    }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Draf Slot Temujanji</h1>
        <p className="mt-1 text-gray-500">
          Draf slot temujanji untuk {cawangan?.namaCawangan}
        </p>
      </div>

      <DrafSlotClient
        initialMula={mula}
        initialTamat={tamat}
        slots={slots.map((slot) => ({
          ...slot,
          id: Number(slot.id),
          bilangan: Number(slot.bilangan || 0),
          status: slot.status == null ? null : Number(slot.status),
          urusniaga: slot.urusniaga == null ? null : Number(slot.urusniaga),
        }))}
        tarikh={tarikh.map((row) => row.tarikh).filter(Boolean) as string[]}
      />
    </div>
  );
}
