import { getEmailVerificationStatus } from "@/lib/email-verification";
import ResendVerificationButton from "@/components/ResendVerificationButton";

/**
 * Sepanduk peringatan pengesahan e-mel (komponen pelayan).
 * Dipaparkan kepada TENANT_ADMIN selagi e-mel akaun belum disahkan; tindakan bil
 * (checkout, pembatalan) disekat sehingga pengesahan selesai.
 */
export default async function EmailVerificationBanner({
  userId,
  role,
}: {
  userId?: string | null;
  role?: string | null;
}) {
  if (!userId || role !== "TENANT_ADMIN") return null;

  let status;
  try {
    status = await getEmailVerificationStatus(userId);
  } catch {
    return null;
  }

  if (!status || status.verified) return null;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none">✉️</span>
        <div>
          <p className="font-black">Sahkan E-mel Anda</p>
          <p className="text-xs opacity-90">
            {status.email ? (
              <>
                Pautan pengesahan telah dihantar ke <strong>{status.email}</strong>. Sahkan e-mel untuk
                membolehkan pengurusan langganan &amp; pembayaran.
              </>
            ) : (
              "Akaun anda tiada alamat e-mel berdaftar. Hubungi sokongan QueNombo untuk mengemas kini e-mel sebelum menguruskan langganan."
            )}
          </p>
        </div>
      </div>
      {status.email && <ResendVerificationButton />}
    </div>
  );
}
