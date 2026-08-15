import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface HadLimitRow {
  id?: number | null;
  kumpulanPerkhidmatan?: string | null;
  hadPelanggan1: number;
  hadPelanggan2: number;
  hadPelanggan3: number;
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.levelAkses !== "2") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const idCawangan = session.user.idCawangan;
  const jenisLimit = Number(body.jenisLimit);
  const rows = Array.isArray(body.rows) ? (body.rows as HadLimitRow[]) : [];
  const tempohMulaScan = Math.max(Number(body.tempohMulaScan || 0), 0);
  const tempohMenungguSelepasImbas = Math.max(
    Number(body.tempohMenungguSelepasImbas || 0),
    0
  );

  if (![1, 2].includes(jenisLimit)) {
    return NextResponse.json({ error: "Jenis had limit tidak sah" }, { status: 400 });
  }

  await prisma.cawangan.updateMany({
    where: { idCawangan },
    data: {
      jenisLimit,
      selaMasa: tempohMenungguSelepasImbas * 60,
    },
  });

  for (const row of rows) {
    const data = {
      hadPelanggan1: Number(row.hadPelanggan1 || 0),
      hadPelanggan2: Number(row.hadPelanggan2 || 0),
      hadPelanggan3: Number(row.hadPelanggan3 || 0),
      jenisLimit,
      tempohMulaScan,
    };

    if (row.id) {
      await prisma.hadPelanggan.updateMany({
        where: { id: Number(row.id), cawangan: idCawangan },
        data,
      });
      continue;
    }

    const kumpulanPerkhidmatan =
      jenisLimit === 2 && row.kumpulanPerkhidmatan
        ? String(row.kumpulanPerkhidmatan)
        : null;

    const existing = await prisma.hadPelanggan.findFirst({
      where: { cawangan: idCawangan, kumpulanPerkhidmatan },
      select: { id: true },
    });

    if (existing) {
      await prisma.hadPelanggan.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.hadPelanggan.create({
        data: {
          cawangan: idCawangan,
          kumpulanPerkhidmatan,
          bilanganPelanggan: 0,
          statusAktif: 1,
          ...data,
        },
      });
    }
  }

  await prisma.hadPelanggan.updateMany({
    where: { cawangan: idCawangan },
    data: { tempohMulaScan },
  });

  return NextResponse.json({ success: true });
}
