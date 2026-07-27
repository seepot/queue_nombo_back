"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  idCawangan: string;
  namaCawangan: string;
  gambarQR: string | null;
  tarikhJana: string | null;
}

export default function QRCodeClient({
  idCawangan,
  namaCawangan,
  gambarQR,
  tarikhJana,
}: Props) {
  const router = useRouter();
  const [qr1, setQr1] = useState<string>("");
  const [qr2, setQr2] = useState<string>("");
  const [qr3, setQr3] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState("");

  // Generate QR codes on mount
  useEffect(() => {
    generateQRImages();
  }, []);

  const generateQRImages = async () => {
    // Kategori 1: Warga Emas/OKU/Wanita Mengandung
    const text1 = JSON.stringify({
      id_cawangan: idCawangan,
      nama: namaCawangan,
      kategori: "1",
    });
    setQr1(
      `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text1)}&color=169F2E`
    );

    // Kategori 2: Orang Awam (use stored gambar_qr if available)
    if (gambarQR) {
      setQr2(`data:image/png;base64,${gambarQR}`);
    } else {
      const text2 = JSON.stringify({
        id_cawangan: idCawangan,
        nama: namaCawangan,
        kategori: "2",
      });
      setQr2(
        `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text2)}&color=0000ff`
      );
    }

    // Kategori 3: Urusan Online
    const text3 = JSON.stringify({
      id_cawangan: idCawangan,
      nama: namaCawangan,
      kategori: "3",
    });
    setQr3(
      `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text3)}&color=C24641`
    );
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setMsg("");
    try {
      const res = await fetch("/api/qrcode/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idCawangan }),
      });
      if (res.ok) {
        setMsg("QR CODE baru berjaya dijana!");
        router.refresh();
      } else {
        setMsg("Gagal menjana QR Code");
      }
    } catch {
      setMsg("Ralat rangkaian");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = (kategori: number) => {
    let imgSrc = "";
    if (kategori === 1) imgSrc = qr1;
    if (kategori === 2) imgSrc = qr2;
    if (kategori === 3) imgSrc = qr3;

    const kategoriLabel =
      kategori === 1
        ? "Warga Emas / OKU / Wanita Mengandung"
        : kategori === 2
        ? "Orang Awam"
        : "Urusan Online";

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>QR Code - ${namaCawangan}</title></head>
          <body style="text-align:center; padding:40px; font-family:Arial,sans-serif;">
            <h2>JPJeQ - ${namaCawangan}</h2>
            <p style="font-size:18px; font-weight:bold;">${kategoriLabel}</p>
            <img src="${imgSrc}" style="width:300px; height:300px; margin:20px auto;" />
            <p>Sila imbas QR Code untuk mendapatkan nombor giliran</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    const match = iso.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (match) return `${match[3]}-${match[2]}-${match[1]} ${match[4]}:${match[5]}:${match[6]}`;
    return iso;
  };

  return (
    <div>
      {msg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kategori 1: Warga Emas */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 flex justify-center bg-gray-50">
            {qr1 && (
              <img src={qr1} alt="QR Kategori 1" className="w-48 h-48 object-contain" />
            )}
          </div>
          <div className="p-4 text-center">
            <h3 className="font-semibold text-gray-800 mb-2">
              Cawangan {namaCawangan}
            </h3>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              <li>Warga Emas</li>
              <li>OKU</li>
              <li>Wanita Mengandung</li>
            </ul>
            <button
              onClick={() => handlePrint(1)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
            >
              Cetak
            </button>
          </div>
        </div>

        {/* Kategori 2: Orang Awam */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 flex justify-center bg-gray-50">
            {qr2 && (
              <img src={qr2} alt="QR Kategori 2" className="w-48 h-48 object-contain" />
            )}
          </div>
          <div className="p-4 text-center">
            <h3 className="font-semibold text-gray-800 mb-2">
              Cawangan {namaCawangan}
            </h3>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              <li>Orang Awam</li>
            </ul>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handlePrint(2)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
              >
                Cetak
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition"
              >
                {generating ? "Menjana..." : "Jana KodQR Baru"}
              </button>
              <p className="text-xs text-gray-400 italic">
                Janaan Terakhir: {formatDate(tarikhJana)}
              </p>
            </div>
          </div>
        </div>

        {/* Kategori 3: Urusan Online */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 flex justify-center bg-gray-50">
            {qr3 && (
              <img src={qr3} alt="QR Kategori 3" className="w-48 h-48 object-contain" />
            )}
          </div>
          <div className="p-4 text-center">
            <h3 className="font-semibold text-gray-800 mb-2">
              Cawangan {namaCawangan}
            </h3>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              <li>Urusan Online</li>
            </ul>
            <button
              onClick={() => handlePrint(3)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
            >
              Cetak
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
