import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import QRCodeClient from "./QRCodeClient";

export default async function QRCodePage() {
  const session = await auth();
  if (!session) return null;

  const cawangan = await prisma.cawangan.findFirst({
    where: { idCawangan: session.user.idCawangan },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Paparan QR Code</h1>
        <p className="text-gray-500 mt-1">
          QR Code untuk cawangan {cawangan?.namaCawangan}
        </p>
      </div>

      <QRCodeClient
        idCawangan={session.user.idCawangan}
        namaCawangan={cawangan?.namaCawangan || ""}
        gambarQR={cawangan?.gambarQr || null}
        tarikhJana={cawangan?.tarikhJana ? cawangan.tarikhJana.toISOString() : null}
      />
    </div>
  );
}
