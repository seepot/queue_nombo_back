"use client";

import { useState, useEffect, useRef } from "react";

interface ServiceRow {
  id: number;
  keterangan: string;
  idCawangan: string;
  noSiri: number;
  noTerkini: number;
  had: number;
  bilTiket: number;
  kuota: number;
  bilMenunggu: number;
}

interface Props {
  services: ServiceRow[];
  sesi: number;
  idCawangan: string;
}

export default function PrinterDashboardClient({ services: initialServices, sesi, idCawangan }: Props) {
  const [services, setServices] = useState(initialServices);
  const [printing, setPrinting] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto refresh every 10 seconds
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/kaunter/printer-stats");
        if (res.ok) {
          const data = await res.json();
          setServices(data.services);
        }
      } catch {
        // ignore
      }
    };
    pollRef.current = setInterval(fetchData, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handlePrint = async (service: ServiceRow) => {
    if (service.kuota <= 0) {
      setMsg("Kuota telah penuh");
      return;
    }
    setPrinting(service.id);
    setMsg("");
    try {
      const res = await fetch("/api/kaunter/cetak-tiket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idKumpulanPerkhidmatan: service.id,
          cawangan: idCawangan,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Tiket ${data.no_tiket} berjaya dijana`);
        // Open print window
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head><title>Tiket</title></head>
              <body style="text-align:center; padding:40px; font-family:Arial,sans-serif;">
                <h2>JPJeQ</h2>
                <p style="font-size:14px;">${service.keterangan}</p>
                <h1 style="font-size:72px; margin:20px 0;">${data.no_tiket}</h1>
                <p>Sila tunggu nombor anda dipanggil</p>
                <p style="font-size:12px; color:#666;">${new Date().toLocaleString("ms-MY")}</p>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
        // Refresh stats
        const res2 = await fetch("/api/kaunter/printer-stats");
        if (res2.ok) {
          const data2 = await res2.json();
          setServices(data2.services);
        }
      } else {
        setMsg(data.error || "Gagal menjana tiket");
      }
    } catch {
      setMsg("Ralat rangkaian");
    } finally {
      setPrinting(null);
    }
  };

  return (
    <div>
      {msg && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          {msg}
        </div>
      )}

      {/* Sesi info */}
      <div className="mb-6 bg-white rounded-xl border border-orange-300 p-4">
        <p className="text-lg font-bold text-gray-800">Sesi: {sesi}</p>
      </div>

      {/* Services table */}
      <div className="bg-white rounded-xl border border-orange-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Perkhidmatan</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Had Maksimum</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Bil Tiket Telah Jana</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Kuota</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Bil Pelanggan Menunggu</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Jana Tiket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.map((svc) => (
                <tr key={svc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 font-bold text-lg text-gray-800">
                    {svc.keterangan}
                  </td>
                  <td className="px-4 py-4 text-center text-lg">{svc.had || "-"}</td>
                  <td className="px-4 py-4 text-center text-lg">{svc.bilTiket}</td>
                  <td className="px-4 py-4 text-center text-lg">{svc.kuota}</td>
                  <td className="px-4 py-4 text-center text-lg">{svc.bilMenunggu}</td>
                  <td className="px-4 py-4 text-center">
                    {svc.kuota > 0 ? (
                      <button
                        onClick={() => handlePrint(svc)}
                        disabled={printing === svc.id}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-lg transition text-base"
                      >
                        {printing === svc.id ? "..." : "Cetak"}
                      </button>
                    ) : (
                      <span className="text-red-500 font-medium">Kuota telah penuh</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
