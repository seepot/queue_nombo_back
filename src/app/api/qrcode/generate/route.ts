import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["1", "2"].includes(session.user.levelAkses)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const idCawangan = body.idCawangan || session.user.idCawangan;

  // Generate new QR code hash (like old PHP: sha1($idcawangan . rand()))
  const text = idCawangan + String(Date.now()) + String(Math.random());
  const enc = createHash("sha1").update(text).digest("hex");

  // The QR code data that the mobile app will scan
  const qrData = JSON.stringify({ param: enc, id_cawangan: idCawangan });

  // Generate QR image using external API and store as base64
  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}&color=0000ff`;
    const qrRes = await fetch(qrUrl);
    if (qrRes.ok) {
      const buffer = await qrRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      const now = new Date(Date.now() + 8 * 60 * 60 * 1000);

      // Update cawangan with new QR data
      await prisma.cawangan.updateMany({
        where: { idCawangan },
        data: {
          kodQR: enc,
          gambarQr: base64,
          tarikhJana: now,
        },
      });

      return NextResponse.json({ success: true });
    }
  } catch {
    // Fallback: just update the hash without image
    const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await prisma.cawangan.updateMany({
      where: { idCawangan },
      data: {
        kodQR: enc,
        tarikhJana: now,
      },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Gagal" }, { status: 500 });
}
