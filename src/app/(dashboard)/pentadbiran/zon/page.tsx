import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ZonClient from "./ZonClient";

export default async function ZonPage() {
  const session = await auth();
  if (!session) return null;

  const [cawangan, zon] = await Promise.all([
    prisma.cawangan.findFirst({
      where: { idCawangan: session.user.idCawangan },
      select: {
        idCawangan: true,
        namaCawangan: true,
      },
    }),
    prisma.zon.findMany({
      where: { cawangan: session.user.idCawangan },
      orderBy: { id: "asc" },
      select: {
        id: true,
        zon: true,
        catatan: true,
      },
    }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Zon</h1>
        <p className="mt-1 text-gray-500">
          Tetapan Zon/Aras untuk {cawangan?.namaCawangan}
        </p>
      </div>

      <ZonClient zon={JSON.parse(JSON.stringify(zon))} />
    </div>
  );
}
