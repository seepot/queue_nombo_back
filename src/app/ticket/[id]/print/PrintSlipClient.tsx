"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface TicketPrintData {
  ticketNo: string;
  categoryName: string;
  branchName: string;
  tenantName: string;
  waitingAhead: number;
  estimatedMinutes: number;
  createdAt: string;
  ticketId: string;
}

export default function PrintSlipClient({ ticket }: { ticket: TicketPrintData }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    const origin = window.location.origin;
    const trackerUrl = `${origin}/ticket/${ticket.ticketId}`;

    QRCode.toDataURL(trackerUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((url) => {
        setQrDataUrl(url);
        // Cetak secara automatik apabila kod QR sedia
        setTimeout(() => {
          window.print();
        }, 400);
      })
      .catch((err) => console.error("Error generating slip QR:", err));
  }, [ticket.ticketId]);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col items-center justify-center p-4 font-mono text-black print:bg-white print:p-0">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="mb-4 print:hidden flex gap-2">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
        >
          🖨️ Cetak Semula Slip
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-gray-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
        >
          ✕ Tutup
        </button>
      </div>

      {/* Standard 58mm / 80mm Thermal Receipt Slip */}
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-300 w-72 text-center space-y-3 print:shadow-none print:border-none print:p-2 print:w-[58mm] print:mx-auto">
        {/* Header */}
        <div className="border-b border-dashed border-gray-400 pb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider">{ticket.tenantName}</p>
          <p className="text-xs font-black uppercase mt-0.5">{ticket.branchName}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">SLIP NOMBOR GILIRAN</p>
        </div>

        {/* Big Ticket Number */}
        <div className="py-2">
          <p className="text-[11px] font-bold uppercase text-gray-600">{ticket.categoryName}</p>
          <div className="text-4xl font-black tracking-tight my-1 font-mono">
            {ticket.ticketNo}
          </div>
          <p className="text-[10px] text-gray-500">
            {new Date(ticket.createdAt).toLocaleDateString("ms-MY")} {new Date(ticket.createdAt).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>

        {/* Waiting Status Box */}
        <div className="border-y border-dashed border-gray-400 py-2 space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span>Giliran Di Hadapan:</span>
            <span className="font-bold">{ticket.waitingAhead} orang</span>
          </div>
          <div className="flex justify-between">
            <span>Anggaran Menunggu:</span>
            <span className="font-bold">~{ticket.estimatedMinutes} min</span>
          </div>
        </div>

        {/* QR Code Tracker */}
        <div className="py-1">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL kod QR dijana di klien; next/image tidak sesuai
            <img src={qrDataUrl} alt="QR Code" className="w-28 h-28 mx-auto" />
          ) : (
            <div className="w-28 h-28 bg-gray-100 mx-auto flex items-center justify-center text-[10px]">
              Menjana QR...
            </div>
          )}
          <p className="text-[9px] text-gray-500 mt-1 leading-tight">
            Imbas kod QR di atas untuk pantau giliran secara langsung dari telefon pintar anda.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-dashed border-gray-400 pt-2 text-[9px] text-gray-500">
          <p>Terima kasih atas kesabaran anda.</p>
          <p className="font-bold text-gray-700 mt-0.5">Dikuasakan oleh QueNombo</p>
        </div>
      </div>
    </div>
  );
}
