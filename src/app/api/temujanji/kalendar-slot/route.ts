import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getBranchAdmin() {
  const session = await auth();
  if (!session || session.user.levelAkses !== "2") return null;
  return session;
}

function nullableString(value: unknown) {
  const text = String(value || "").trim();
  return text || null;
}

async function getSlot(listId: number, cawangan: string) {
  return prisma.$queryRawUnsafe<
    Array<{
      id: number;
      tempahan_masa_id: number | null;
      nama: string | null;
      urusniaga: number | null;
      slot_urusniaga: string | null;
    }>
  >(
    `SELECT
       tl.id,
       tl.tempahan_masa_id,
       tl.nama,
       tl.urusniaga,
       tm.kump_perkhidmatan AS slot_urusniaga
     FROM tempahan_list tl
     INNER JOIN tempahan_masa tm ON tm.id = tl.tempahan_masa_id
     WHERE tl.id = ? AND tl.cawangan = ? AND tm.cawangan = ?
     LIMIT 1`,
    listId,
    cawangan,
    cawangan
  );
}

export async function PATCH(req: NextRequest) {
  const session = await getBranchAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Slot tidak sah" }, { status: 400 });
  }

  const [slot] = await getSlot(id, session.user.idCawangan);
  if (!slot || !slot.tempahan_masa_id) {
    return NextResponse.json({ error: "Slot tidak ditemui" }, { status: 404 });
  }
  const tempahanMasaId = slot.tempahan_masa_id;

  const nama = nullableString(body.nama);
  const nopengenalan = nullableString(body.nopengenalan);
  const notelefon = nullableString(body.notelefon);
  const emel = nullableString(body.emel);
  const tujuanTransaksi = nullableString(body.tujuanTransaksi);
  const kategori = body.kategori === "" || body.kategori == null ? null : Number(body.kategori);
  const urusniaga =
    body.urusniaga === "" || body.urusniaga == null
      ? slot.slot_urusniaga
        ? Number(slot.slot_urusniaga)
        : slot.urusniaga
      : Number(body.urusniaga);

  if (!nama || !nopengenalan || !notelefon) {
    return NextResponse.json(
      { error: "Nama, no pengenalan dan no telefon diperlukan" },
      { status: 400 }
    );
  }

  const wasEmpty = !slot.nama;

  await prisma.$transaction(async (tx) => {
    await tx.tempahanList.update({
      where: { id },
      data: {
        urusniaga,
        kategori: Number.isFinite(kategori) ? kategori : null,
        nopengenalan,
        nama,
        notelefon,
        emel,
        tujuanTransaksi,
        isPending: 2,
        createDate: new Date(),
        playerId: "manual",
        webToken: "manual",
      },
    });

    if (wasEmpty) {
      await tx.tempahanMasa.update({
        where: { id: tempahanMasaId },
        data: { bilTlhIsi: { increment: 1 } },
      });
    }

    await tx.$executeRawUnsafe(
      `UPDATE tempahan_masa
       SET status = CASE WHEN COALESCE(bil_tlh_isi, 0) >= COALESCE(bilangan, 0) THEN 0 ELSE 1 END
      WHERE id = ?`,
      tempahanMasaId
    );
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getBranchAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Slot tidak sah" }, { status: 400 });
  }

  const [slot] = await getSlot(id, session.user.idCawangan);
  if (!slot || !slot.tempahan_masa_id) {
    return NextResponse.json({ error: "Slot tidak ditemui" }, { status: 404 });
  }
  const tempahanMasaId = slot.tempahan_masa_id;

  const wasFilled = Boolean(slot.nama);

  await prisma.$transaction(async (tx) => {
    await tx.tempahanList.update({
      where: { id },
      data: {
        urusniaga: null,
        kategori: null,
        nopengenalan: null,
        nama: null,
        notelefon: null,
        emel: null,
        playerId: null,
        hash: null,
        isPending: null,
        createDate: null,
        tujuanTransaksi: null,
        webToken: null,
        firstId: null,
        firstMasaId: null,
        tempId: null,
      },
    });

    if (wasFilled) {
      await tx.$executeRawUnsafe(
        `UPDATE tempahan_masa
         SET bil_tlh_isi = GREATEST(COALESCE(bil_tlh_isi, 0) - 1, 0)
         WHERE id = ?`,
        tempahanMasaId
      );
    }

    await tx.$executeRawUnsafe(
      `UPDATE tempahan_masa
       SET status = CASE WHEN COALESCE(bil_tlh_isi, 0) >= COALESCE(bilangan, 0) THEN 0 ELSE 1 END
       WHERE id = ?`,
      tempahanMasaId
    );
  });

  return NextResponse.json({ success: true });
}
