import Link from "next/link";
import type { SubscriptionState } from "@/lib/subscription";

/** Panel penuh yang menggantikan kandungan halaman operasi apabila langganan tidak aktif. */
export default function SubscriptionBlocked({
  state,
  role,
  publicView = false,
}: {
  state: SubscriptionState;
  role?: string | null;
  publicView?: boolean;
}) {
  const suspended = state.status === "SUSPENDED";

  if (publicView) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/70">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">🛠️</div>
          <h1 className="text-lg font-black text-slate-900">Perkhidmatan Tidak Tersedia</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sistem giliran premis ini tidak aktif buat masa ini. Sila dapatkan nombor giliran terus di kaunter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-2xl">⛔</div>
      <h2 className="text-lg font-black text-slate-900">
        {suspended ? "Akaun Organisasi Digantung" : "Langganan Tidak Aktif"}
      </h2>
      <p className="mt-2 text-sm text-slate-600">{state.message}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {!suspended && role === "TENANT_ADMIN" && (
          <Link
            href="/langganan"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            Pilih Pelan & Bayar
          </Link>
        )}
        <Link
          href="/dashboard"
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
