"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  qrImage: string | null;
  namaCawangan: string;
}

const REFRESH_SECONDS = 35;

export default function QRDisplayClient({ qrImage, namaCawangan }: Props) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(REFRESH_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.refresh();
          return REFRESH_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      {qrImage ? (
        <img
          src={qrImage}
          alt="QR Code"
          className="w-[400px] h-[400px] object-contain"
        />
      ) : (
        <div className="text-center">
          <p className="text-gray-400 text-lg">QR Code belum dijana</p>
        </div>
      )}
      <p className="mt-4 text-sm text-gray-400">
        {namaCawangan}
      </p>
      <p className="mt-2 text-xs text-gray-300">
        Refresh dalam {countdown} saat
      </p>
    </div>
  );
}
