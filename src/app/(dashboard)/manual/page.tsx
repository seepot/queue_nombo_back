import { auth } from "@/lib/auth";

export default async function ManualPage() {
  const session = await auth();
  if (!session) return null;

  const isKC = session.user.levelAkses === "2";

  const documents = [
    ...(isKC
      ? [
          {
            title: "Modul Temujanji",
            desc: "Manual penggunaan modul temujanji",
            href: "/document/manualKC.pdf",
          },
          {
            title: "Modul eQ (Ketua Cawangan)",
            desc: "Manual penggunaan modul ketua cawangan",
            href: "/document/ManualPenggunaKetuaCawangan.pdf",
          },
        ]
      : []),
    {
      title: "Modul eQ (Kaunter)",
      desc: "Manual penggunaan modul kaunter",
      href: "/document/ManualPenggunaKaunter.pdf",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Manual Pengguna</h1>
        <p className="text-gray-500 mt-1">Panduan penggunaan sistem JPJeQ</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="space-y-4">
          {documents.map((doc) => (
            <div
              key={doc.href}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{doc.title}</h3>
                <p className="text-sm text-gray-500">{doc.desc}</p>
              </div>
              <a
                href={doc.href}
                target="_blank"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
              >
                Muat Turun
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
