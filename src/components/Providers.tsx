"use client";

import { SessionProvider } from "next-auth/react";
import { ToastConfirmProvider } from "./ToastProvider";
import { LanguageProvider } from "@/context/LanguageContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <ToastConfirmProvider>{children}</ToastConfirmProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
