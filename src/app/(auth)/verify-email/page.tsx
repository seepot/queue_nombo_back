import { Suspense } from "react";
import VerifyEmailClient from "./VerifyEmailClient";

export const metadata = {
  title: "Sahkan E-mel | QueNombo SaaS",
  description: "Sahkan alamat e-mel akaun QueNombo anda.",
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-slate-400">Memuatkan...</div>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
