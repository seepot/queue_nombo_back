import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata = {
  title: "Tetap Semula Kata Laluan | QueNombo SaaS",
  description: "Tetapkan kata laluan baharu untuk akaun QueNombo anda.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-slate-400">Memuatkan...</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
