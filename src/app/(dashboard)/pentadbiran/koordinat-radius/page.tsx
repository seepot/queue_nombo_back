import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import KoordinatRadiusClient from "./KoordinatRadiusClient";

export default async function KoordinatRadiusPage() {
  const session = await auth();
  if (!session) return null;

  const cawangan = await prisma.cawangan.findFirst({
    where: { idCawangan: session.user.idCawangan },
    select: {
      id: true,
      idCawangan: true,
      namaCawangan: true,
      latitud: true,
      longitud: true,
      radius: true,
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Koordinat/Radius</h1>
        <p className="mt-1 text-gray-500">
          Tetapan koordinat dan radius imbas QR untuk {cawangan?.namaCawangan}
        </p>
      </div>

      <KoordinatRadiusClient data={JSON.parse(JSON.stringify(cawangan))} />
    </div>
  );
}
