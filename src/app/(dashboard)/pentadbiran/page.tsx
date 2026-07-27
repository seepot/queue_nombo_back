import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PentadbiranInfoClient from "./PentadbiranInfoClient";

export default async function PentadbiranPage() {
  const session = await auth();
  if (!session) return null;

  const cawangan = await prisma.cawangan.findFirst({
    where: { idCawangan: session.user.idCawangan },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Kemaskini Info Cawangan</h1>
        <p className="text-gray-500 mt-1">
          Maklumat cawangan {cawangan?.namaCawangan}
        </p>
      </div>

      <PentadbiranInfoClient
        data={JSON.parse(JSON.stringify(cawangan))}
      />
    </div>
  );
}
