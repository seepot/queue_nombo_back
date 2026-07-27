import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CawanganClient from "./CawanganClient";

export default async function CawanganPage() {
  const session = await auth();
  if (!session) return null;

  const cawangan = await prisma.cawangan.findMany({
    orderBy: { namaCawangan: "asc" },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Pengurusan Cawangan
        </h1>
        <p className="text-gray-500 mt-1">Senarai semua cawangan berdaftar</p>
      </div>

      <CawanganClient
        cawangan={JSON.parse(JSON.stringify(cawangan))}
        isSuperAdmin={session.user.levelAkses === "1"}
      />
    </div>
  );
}
