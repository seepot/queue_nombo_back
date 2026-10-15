"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  idCawangan: string;
  namaCawangan: string;
  gambarQR: string | null;
  kodQR: string | null;
  tarikhJana: string | null;
}

export default function QRCodeClient({
  idCawangan,
  namaCawangan,
  gambarQR,
  kodQR,
  tarikhJana,
}: Props) {
  const [msg, setMsg] = useState("");

  // Kategori 1: Warga Emas/OKU/Wanita Mengandung
  const text1 = JSON.stringify({
    id_cawangan: idCawangan,
    nama: namaCawangan,
    kategori: "1",
  });
  const qr1 = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text1)}&color=15803d`;

  // Kategori 2: Orang Awam (use stored gambar_qr if available)
  const value2 = kodQR
    ? JSON.stringify({ param: kodQR, id_cawangan: idCawangan })
    : JSON.stringify({
        id_cawangan: idCawangan,
        nama: namaCawangan,
        kategori: "2",
      });
  const qr2 = gambarQR
    ? `data:image/png;base64,${gambarQR}`
    : `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(value2)}&color=1d4ed8`;

  // Kategori 3: Urusan Online
  const text3 = JSON.stringify({
    id_cawangan: idCawangan,
    nama: namaCawangan,
    kategori: "3",
  });
  const qr3 = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text3)}&color=b91c1c`;

  const handleCopy = async (value: string, label: string) => {
    if (!value) {
      setMsg("Tiada data Kod QR dijumpai.");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setMsg(`Payload ${label} berjaya disalin ke papan keratan!`);
    } catch {
      setMsg("Gagal menyalin data Kod QR");
    }
  };

  // High quality print template
  const handlePrintPoster = (kategori: number) => {
    let imgSrc = "";
    let kategoriLabel = "";
    let themeColor = "";
    let bgAccent = "";
    let descriptionText = "";

    if (kategori === 1) {
      imgSrc = qr1;
      kategoriLabel = "WARGA EMAS / OKU / WANITA MENGANDUNG";
      themeColor = "#15803d"; // emerald-700
      bgAccent = "#f0fdf4";
      descriptionText = "Khusus bagi kategori keutamaan khas untuk layanan pantas di kaunter mesra pelanggan.";
    } else if (kategori === 2) {
      imgSrc = qr2;
      kategoriLabel = "ORANG AWAM / URUSAN AM";
      themeColor = "#1d4ed8"; // blue-700
      bgAccent = "#eff6ff";
      descriptionText = "Lesen Memandu, Cukai Jalan (LKM), Pendaftaran Kenderaan, Pertukaran Hakmilik & Urusan Kaunter Am.";
    } else {
      imgSrc = qr3;
      kategoriLabel = "URUSAN DALAM TALIAN / TEMUJANJI";
      themeColor = "#b91c1c"; // rose-700
      bgAccent = "#fff1f2";
      descriptionText = "Pengesahan kehadiran janji temu dalam talian dan urusan transaksi portal digital JPJ mySIKAP.";
    }

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Poster Kod QR - ${namaCawangan}</title>
            <style>
              @page { size: A4 portrait; margin: 12mm; }
              body { margin: 0; padding: 0; font-family: sans-serif; background: #ffffff; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .poster-container { border: 4px solid ${themeColor}; border-radius: 24px; padding: 30px 24px; text-align: center; min-height: 94vh; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; background: #ffffff; }
              .header-badge { display: inline-block; background: ${themeColor}; color: #ffffff; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 6px 20px; border-radius: 50px; margin-bottom: 12px; }
              .agency-title { font-size: 26px; font-weight: 900; margin: 0 0 4px 0; }
              .branch-title { font-size: 18px; font-weight: 800; color: ${themeColor}; margin: 0 0 20px 0; text-transform: uppercase; }
              .category-banner { background: ${bgAccent}; border: 2px solid ${themeColor}; border-radius: 16px; padding: 14px 20px; margin: 0 auto 24px auto; max-width: 90%; }
              .category-title { font-size: 20px; font-weight: 900; color: ${themeColor}; margin: 0; text-transform: uppercase; }
              .category-desc { font-size: 11px; font-weight: 600; color: #475569; margin: 6px 0 0 0; }
              .qr-box { background: #ffffff; border: 3px dashed ${themeColor}; border-radius: 20px; padding: 20px; display: inline-block; margin: 0 auto; }
              .qr-image { width: 280px; height: 280px; display: block; margin: 0 auto; }
              .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px auto 16px auto; max-width: 92%; }
              .step-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 10px; }
              .step-num { display: inline-block; width: 24px; height: 24px; background: ${themeColor}; color: #ffffff; font-size: 12px; font-weight: 900; border-radius: 50%; margin-bottom: 6px; }
              .step-text { font-size: 11px; font-weight: 700; color: #1e293b; line-height: 1.3; }
              .footer-notice { border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #64748b; }
            </style>
          </head>
          <body>
            <div class="poster-container">
              <div>
                <div class="header-badge">Sistem Pengurusan Giliran Pintar JPJeQ</div>
                <h1 class="agency-title">JABATAN PENGANGKUTAN JALAN</h1>
                <h2 class="branch-title">Cawangan ${namaCawangan}</h2>
                <div class="category-banner">
                  <h3 class="category-title">${kategoriLabel}</h3>
                  <p class="category-desc">${descriptionText}</p>
                </div>
                <div class="qr-box"><img class="qr-image" src="${imgSrc}" alt="QR" /></div>
              </div>
              <div>
                <div class="steps-grid">
                  <div class="step-card"><span class="step-num">1</span><p class="step-text">Buka Kamera / MyJPJ</p></div>
                  <div class="step-card"><span class="step-num">2</span><p class="step-text">Imbas Kod QR</p></div>
                  <div class="step-card"><span class="step-num">3</span><p class="step-text">Ambil Giliran</p></div>
                </div>
                <div class="footer-notice">Pastikan fungsi GPS telefon diaktifkan semasa mengimbas untuk pengesahan lokasi.</div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); }, 300);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "Belum direkodkan";
    const match = iso.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (match) return `${match[3]}-${match[2]}-${match[1]} ${match[4]}:${match[5]}:${match[6]}`;
    return iso;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 sm:p-7 rounded-3xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 border border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase text-blue-300 bg-blue-900/60 px-2.5 py-0.5 rounded-full border border-blue-700/60">
              Paparan Kod QR Rasmi (Level 1)
            </span>
            <span className="text-xs text-slate-300 font-mono bg-white/10 px-2 py-0.5 rounded-md">
              ID: {idCawangan}
            </span>
            <span className="text-xs text-emerald-300 font-bold bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Token Aktif
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
            {namaCawangan}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Paparan rasmi 3 kategori Kod QR cawangan bagi kegunaan pengesahan sistem giliran pintar dan cetakan poster fizikal dewan menunggu.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-right shrink-0">
          <span className="text-[10px] uppercase font-bold text-blue-200 block">
            Janaan Terakhir Sistem
          </span>
          <span className="text-xs font-mono font-bold text-white block mt-0.5">
            {formatDate(tarikhJana)}
          </span>
        </div>
      </div>

      {msg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{msg}</span>
          </div>
          <button type="button" onClick={() => setMsg("")} className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold text-sm">&times;</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kategori 1 */}
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="bg-emerald-700 p-4 text-white text-center">
              <span className="text-[10px] font-mono uppercase font-bold tracking-widest bg-emerald-800/90 px-2.5 py-0.5 rounded-full border border-emerald-600/50">Kategori 1</span>
              <h3 className="text-sm sm:text-base font-black mt-1">Warga Emas / OKU / Ibu Hamil</h3>
            </div>
            <div className="p-6 flex justify-center bg-emerald-50/40">
              <div className="bg-white p-3 rounded-2xl border-2 border-dashed border-emerald-300 shadow-2xs">
                {qr1 && <Image src={qr1} alt="QR 1" width={200} height={200} className="w-44 h-44 object-contain" unoptimized />}
              </div>
            </div>
            <div className="p-5 text-center space-y-2 text-xs">
              <p className="text-slate-500 font-medium leading-relaxed">Khusus untuk kaunter mesra pelanggan bagi urusan warga emas, orang kurang upaya, dan wanita mengandung.</p>
            </div>
          </div>
          <div className="p-5 pt-0 space-y-2">
            <button type="button" onClick={() => handlePrintPoster(1)} className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">🖨️ Cetak Poster A4</button>
            <button type="button" onClick={() => handleCopy(text1, "Kategori 1")} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5">📋 Salin Payload</button>
          </div>
        </div>

        {/* Kategori 2 */}
        <div className="bg-white rounded-3xl border-2 border-blue-500 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between ring-4 ring-blue-100/60">
          <div>
            <div className="bg-blue-600 p-4 text-white text-center">
              <span className="text-[10px] font-mono uppercase font-bold tracking-widest bg-blue-700/90 px-2.5 py-0.5 rounded-full border border-blue-500/50">Kategori 2</span>
              <h3 className="text-sm sm:text-base font-black mt-1">Orang Awam / Urusan Am</h3>
            </div>
            <div className="p-6 flex justify-center bg-blue-50/40">
              <div className="bg-white p-3 rounded-2xl border-2 border-dashed border-blue-300 shadow-2xs">
                {qr2 && <Image src={qr2} alt="QR 2" width={200} height={200} className="w-44 h-44 object-contain" unoptimized />}
              </div>
            </div>
            <div className="p-5 text-center space-y-2 text-xs">
              <p className="text-slate-500 font-medium leading-relaxed">Lesen Memandu, Cukai Jalan (LKM), Tukar Hakmilik, Pendaftaran Kenderaan, dan pelbagai urusan kaunter am.</p>
            </div>
          </div>
          <div className="p-5 pt-0 space-y-2">
            <button type="button" onClick={() => handlePrintPoster(2)} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">🖨️ Cetak Poster A4</button>
            <button type="button" onClick={() => handleCopy(value2, "Kategori 2")} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5">📋 Salin Payload</button>
          </div>
        </div>

        {/* Kategori 3 */}
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="bg-rose-700 p-4 text-white text-center">
              <span className="text-[10px] font-mono uppercase font-bold tracking-widest bg-rose-800/90 px-2.5 py-0.5 rounded-full border border-rose-600/50">Kategori 3</span>
              <h3 className="text-sm sm:text-base font-black mt-1">Urusan Online / mySIKAP</h3>
            </div>
            <div className="p-6 flex justify-center bg-rose-50/40">
              <div className="bg-white p-3 rounded-2xl border-2 border-dashed border-rose-300 shadow-2xs">
                {qr3 && <Image src={qr3} alt="QR 3" width={200} height={200} className="w-44 h-44 object-contain" unoptimized />}
              </div>
            </div>
            <div className="p-5 text-center space-y-2 text-xs">
              <p className="text-slate-500 font-medium leading-relaxed">Pengesahan kehadiran janji temu dalam talian dan urusan transaksi portal digital JPJ mySIKAP.</p>
            </div>
          </div>
          <div className="p-5 pt-0 space-y-2">
            <button type="button" onClick={() => handlePrintPoster(3)} className="w-full py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">🖨️ Cetak Poster A4</button>
            <button type="button" onClick={() => handleCopy(text3, "Kategori 3")} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5">📋 Salin Payload</button>
          </div>
        </div>
      </div>
    </div>
  );
}
