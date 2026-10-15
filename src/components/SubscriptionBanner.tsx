import Link from "next/link";
import { getSubscriptionState } from "@/lib/subscription";

/**
 * Sepanduk status langganan (komponen pelayan).
 * Dipaparkan hanya apabila ada amaran: percubaan hampir tamat, tempoh ihsan,
 * langganan tamat, atau akaun digantung.
 */
export default async function SubscriptionBanner({
  tenantId,
  role,
}: {
  tenantId?: string | null;
  role?: string | null;
}) {
  if (!tenantId || role === "SUPERADMIN") return null;

  let state;
  try {
    state = await getSubscriptionState(tenantId);
  } catch {
    return null;
  }

  if (!state.warning || !state.message) return null;

  const blocked = !state.operational;
  const tone = blocked
    ? "border-rose-200 bg-rose-50 text-rose-900"
    : state.status === "PAST_DUE"
    ? "border-orange-200 bg-orange-50 text-orange-900"
    : "border-amber-200 bg-amber-50 text-amber-900";
  const icon = blocked ? "⛔" : state.status === "PAST_DUE" ? "⚠️" : "⏳";
  const title = blocked
    ? state.status === "SUSPENDED"
      ? "Akaun Digantung"
      : "Langganan Tamat"
    : state.status === "PAST_DUE"
    ? "Tempoh Ihsan Pembayaran"
    : state.status === "TRIAL"
    ? "Percubaan Hampir Tamat"
    : "Pembaharuan Langganan";

  const canManageBilling = role === "TENANT_ADMIN";

  return (
    <div className={`mb-4 flex flex-col gap-3 rounded-2xl border p-4 text-sm shadow-xs sm:flex-row sm:items-center sm:justify-between ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none">{icon}</span>
        <div>
          <p className="font-black">{title}</p>
          <p className="text-xs opacity-90">{state.message}</p>
        </div>
      </div>
      {canManageBilling && state.status !== "SUSPENDED" && (
        <Link
          href="/langganan"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
        >
          {blocked ? "Langgan Sekarang" : "Urus Langganan"}
        </Link>
      )}
    </div>
  );
}
