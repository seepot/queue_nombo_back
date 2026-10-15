"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import QRCode from "qrcode";
import Link from "next/link";

interface BranchData {
  id: string;
  name: string;
  code: string;
  address: string | null;
  tenantName: string;
  tenantSlug: string;
}

// Asal (origin) pelayar hanya diketahui di klien; semasa SSR dan penghidratan nilainya kosong.
const subscribeToNothing = () => () => {};
const getBrowserOrigin = () => window.location.origin;
const getServerOrigin = () => "";

export default function PrintPosterClient({ branch }: { branch: BranchData }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const origin = useSyncExternalStore(subscribeToNothing, getBrowserOrigin, getServerOrigin);
  const scanUrl = origin ? `${origin}/scan/${branch.tenantSlug}` : "";

  useEffect(() => {
    if (!scanUrl) return;

    QRCode.toDataURL(scanUrl, {
      width: 450,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch((err) => console.error("Error generating QR code:", err));
  }, [scanUrl]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start p-4 sm:p-8 font-sans print:bg-white print:p-0">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="max-w-xl w-full flex items-center justify-between mb-6 print:hidden">
        <Link
          href="/qrcode"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
        >
          ← Kembali ke Dashboard
        </Link>
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>🖨️</span> Cetak Poster A4
        </button>
      </div>

      {/* Printable A4 Poster Sheet */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-10 max-w-xl w-full text-center flex flex-col justify-between items-center space-y-6 print:shadow-none print:border-none print:p-8 print:max-w-none print:w-full print:h-screen">
        {/* Header Branding */}
        <div>
          <div className="inline-block px-4 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-black rounded-full uppercase tracking-widest mb-3">
            SISTEM GILIRAN PINTAR • SMART QUEUE
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
            {branch.tenantName}
          </h1>
          <h2 className="text-xl font-bold text-blue-600 mt-1">{branch.name}</h2>
          {branch.address && (
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{branch.address}</p>
          )}
        </div>

        {/* Big Crisp QR Code */}
        <div className="p-4 bg-white rounded-3xl border-4 border-slate-900 shadow-lg inline-block my-2">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL kod QR dijana di klien; next/image tidak sesuai
            <img src={qrDataUrl} alt="Scan QR Code" className="w-64 h-64 sm:w-72 sm:h-72 mx-auto" />
          ) : (
            <div className="w-64 h-64 sm:w-72 sm:h-72 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
              Menjana Kod QR...
            </div>
          )}
        </div>

        {/* Action Title */}
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wide">
            IMBAS DI SINI UNTUK AMBIL GILIRAN
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Tanpa perlu pasang aplikasi • Pantau giliran terus dari telefon pintar anda
          </p>
        </div>

        {/* 3 Step Instructions */}
        <div className="grid grid-cols-3 gap-3 w-full text-left bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="space-y-1">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <p className="text-xs font-bold text-slate-900">Buka Kamera</p>
            <p className="text-[11px] text-slate-500 leading-tight">
              Arahkan kamera telefon anda ke kod QR di atas.
            </p>
          </div>

          <div className="space-y-1">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
            <p className="text-xs font-bold text-slate-900">Pilih Urusan</p>
            <p className="text-[11px] text-slate-500 leading-tight">
              Pilih kategori perkhidmatan yang anda perlukan.
            </p>
          </div>

          <div className="space-y-1">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              3
            </span>
            <p className="text-xs font-bold text-slate-900">Pantau Giliran</p>
            <p className="text-[11px] text-slate-500 leading-tight">
              Duduk berehat & terima amaran bila giliran dipanggil.
            </p>
          </div>
        </div>

        {/* Footer URL & Branding */}
        <div className="border-t border-slate-100 pt-4 w-full flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">{scanUrl}</span>
          <span>
            Dikuasakan oleh <strong className="text-slate-700">QueNombo</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
