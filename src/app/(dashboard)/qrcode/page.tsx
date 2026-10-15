import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = {
  title: "Kod QR Premis & Cetakan Poster | QueNombo SaaS",
};

export default async function QRCodeDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const userRole = user.role;
  const userTenantId = user.tenantId;

  const branches = await prisma.branch.findMany({
    where: {
      ...(userRole !== "SUPERADMIN" && userTenantId ? { tenantId: userTenantId } : {}),
    },
    include: {
      tenant: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      <div>
        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-extrabold rounded-full uppercase tracking-wider mb-2">
          Pintu Masuk & Imbasan Pelanggan
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Kod QR Cawangan & Cetakan Poster A4</h1>
        <p className="text-sm text-gray-500">
          Cetak poster kod QR rasmi untuk ditampal di pintu masuk premis atau kaunter pendaftaran.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((b) => (
          <div
            key={b.id}
            className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-mono font-bold rounded-lg">
                  {b.code}
                </span>
                <span className="text-xs text-blue-600 font-bold">{b.tenant.name}</span>
              </div>
              <h2 className="text-lg font-black text-gray-900">{b.name}</h2>
              <p className="text-xs text-gray-500 mt-1">
                Pautan Imbasan: <span className="font-mono text-gray-700">/scan/{b.tenant.slug}</span>
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3">
              <Link
                href={`/scan/${b.tenant.slug}`}
                target="_blank"
                className="flex-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl text-center transition-colors"
              >
                Uji Imbasan ↗
              </Link>

              <Link
                href={`/qrcode/print/${b.id}`}
                target="_blank"
                className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl text-center shadow-xs transition-colors"
              >
                🖨️ Cetak Poster A4
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
