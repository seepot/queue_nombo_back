import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import OfflineIndicator from "@/components/OfflineIndicator";
import ImpersonationBanner from "@/components/ImpersonationBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QueNombo - Sistem Pengurusan Giliran Pintar SaaS",
  description: "Platform SaaS Pengurusan Giliran Pintar & Tempahan Multi-Tenant - QueNombo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>
          <ImpersonationBanner />
          {children}
          <OfflineIndicator />
        </Providers>
      </body>
    </html>
  );
}
