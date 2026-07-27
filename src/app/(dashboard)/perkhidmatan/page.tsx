import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PerkhidmatanClient from "./PerkhidmatanClient";
import PerkhidmatanAdminPage from "./PerkhidmatanAdminPage";

async function getData(idCawangan: string) {
  const [kumpulan, perkhidmatan] = await Promise.all([
    prisma.kumpulanPerkhidmatan.findMany({
      where: { idCawangan },
      orderBy: { id: "asc" },
    }),
    prisma.perkhidmatan.findMany({
      orderBy: { keterangan: "asc" },
    }),
  ]);

  return { kumpulan, perkhidmatan };
}

export default async function PerkhidmatanPage() {
  const session = await auth();
  if (!session) return null;

  const isAdmin = session.user.levelAkses === "1";

  // Admin HQ: show filter page
  if (isAdmin) {
    const perkhidmatan = await prisma.perkhidmatan.findMany({
      orderBy: { keterangan: "asc" },
    });
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Pengurusan Perkhidmatan</h1>
          <p className="text-gray-500 mt-1">Pilih negeri dan cawangan untuk melihat kumpulan perkhidmatan</p>
        </div>
        <PerkhidmatanAdminPage perkhidmatan={JSON.parse(JSON.stringify(perkhidmatan))} />
      </div>
    );
  }

  // KC: auto-load own branch
  const data = await getData(session.user.idCawangan);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Pengurusan Perkhidmatan</h1>
        <p className="text-gray-500 mt-1">Senarai kumpulan perkhidmatan yang tersedia</p>
      </div>
      <PerkhidmatanClient
        kumpulan={JSON.parse(JSON.stringify(data.kumpulan))}
        perkhidmatan={JSON.parse(JSON.stringify(data.perkhidmatan))}
      />
    </div>
  );
}
