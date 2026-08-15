import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireBranchAdmin() {
  const session = await auth();
  if (!session || session.user.levelAkses !== "2") return null;
  return session;
}

export async function PATCH(req: NextRequest) {
  const session = await requireBranchAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const id = Number(body.id);
  const bilangan = Math.max(Number(body.bilangan || 0), 0);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Slot tidak sah" }, { status: 400 });
  }

  const slot = await prisma.tempahanMasa.findFirst({
    where: {
      id,
      cawangan: session.user.idCawangan,
      status: 0,
      bukaTempahan: null,
    },
    select: {
      id: true,
      bilangan: true,
      kumpPerkhidmatan: true,
    },
  });

  if (!slot) {
    return NextResponse.json({ error: "Slot tidak ditemui" }, { status: 404 });
  }

  const bilAsal = Number(slot.bilangan || 0);
  const beza = bilangan - bilAsal;

  await prisma.tempahanMasa.update({
    where: { id },
    data: { bilangan },
  });

  if (beza > 0) {
    for (let i = 0; i < beza; i += 1) {
      await prisma.tempahanList.create({
        data: {
          tempahanMasaId: id,
          cawangan: session.user.idCawangan,
          urusniaga: slot.kumpPerkhidmatan ? Number(slot.kumpPerkhidmatan) : null,
        },
      });
    }
  } else if (beza < 0) {
    for (let i = 0; i < Math.abs(beza); i += 1) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM tempahan_list
         WHERE tempahan_masa_id = ? AND cawangan = ? AND nama IS NULL
         LIMIT 1`,
        id,
        session.user.idCawangan
      );
    }
  }

  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const session = await requireBranchAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const action = String(body.action || "");
  const tarikh = Array.isArray(body.tarikh)
    ? body.tarikh.map(String).filter(Boolean)
    : [];

  if (!["publish", "jana_semula"].includes(action)) {
    return NextResponse.json({ error: "Tindakan tidak sah" }, { status: 400 });
  }

  if (tarikh.length === 0) {
    return NextResponse.json({ error: "Sila pilih tarikh" }, { status: 400 });
  }

  for (const date of tarikh) {
    if (action === "publish") {
      await prisma.tempahanMasa.updateMany({
        where: {
          cawangan: session.user.idCawangan,
          tarikh: date,
          status: 0,
          bukaTempahan: null,
        },
        data: {
          status: 1,
          bukaTempahan: 1,
        },
      });
      await prisma.tempahanTarikh.updateMany({
        where: {
          cawangan: session.user.idCawangan,
          tarikh: date,
          status: 0,
          bukaTempahan: null,
        },
        data: {
          status: 1,
          bukaTempahan: 1,
        },
      });
    } else {
      await prisma.tempahanMasa.deleteMany({
        where: {
          cawangan: session.user.idCawangan,
          tarikh: date,
          status: 0,
        },
      });
      await prisma.tempahanTarikh.deleteMany({
        where: {
          cawangan: session.user.idCawangan,
          tarikh: date,
          status: 0,
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await requireBranchAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Slot tidak sah" }, { status: 400 });
  }

  await prisma.tempahanMasa.deleteMany({
    where: {
      id,
      cawangan: session.user.idCawangan,
      status: 0,
    },
  });

  return NextResponse.json({ success: true });
}
