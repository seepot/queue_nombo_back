import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

// GET: Get queue status / ticket info
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cawangan = session.user.idCawangan;
  const transId = searchParams.get("transId");

  if (transId) {
    const tiket = await prisma.logTiket.findFirst({
      where: { transid: transId },
    });
    return NextResponse.json(tiket ? { ...tiket, id: Number(tiket.id) } : null);
  }

  // Get today's tickets for counter display
  const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split("T")[0];

  const tickets = await prisma.$queryRawUnsafe<
    Array<{
      id: number;
      transid: string | null;
      no_tiket: number | null;
      no_siri: number;
      status_tiket: number | null;
      kaunter: number | null;
      create_date: Date | null;
      call_date: Date | null;
    }>
  >(
    `SELECT id, transid, no_tiket, no_siri, status_tiket, kaunter, create_date, call_date
     FROM log_tiket
     WHERE cawangan = ? AND DATE(tarikh) = ?
     ORDER BY id DESC LIMIT 50`,
    cawangan,
    today
  );

  return NextResponse.json(tickets.map((t) => ({ ...t, id: Number(t.id) })));
}

// POST: Issue a new ticket (public API for mobile app)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { cawangan, idKumpulanPerkhidmatan, playerId, tarikh, token } = body;

  // Verify token
  const expectedToken = createHash("sha256")
    .update(
      cawangan + playerId + tarikh + "jpjit2020" + idKumpulanPerkhidmatan
    )
    .digest("hex");

  if (token !== expectedToken) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  // Get current ticket number
  const perkhidmatan = await prisma.kumpulanPerkhidmatan.findFirst({
    where: { id: Number(idKumpulanPerkhidmatan), idCawangan: String(cawangan) },
  });

  if (!perkhidmatan) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const noTiket = perkhidmatan.noTerkini || 0;
  const newNoTiket = noTiket + 1;
  const noSiri = perkhidmatan.noSiri;

  const transId = createHash("sha1")
    .update(
      playerId +
        idKumpulanPerkhidmatan +
        cawangan +
        new Date().toISOString() +
        Math.random()
    )
    .digest("hex");

  // Create ticket in log_tiket
  await prisma.logTiket.create({
    data: {
      transid: transId,
      noTiket: newNoTiket,
      noSiri: noSiri,
      tarikh: new Date(Date.now() + 8 * 60 * 60 * 1000),
      cawangan: String(cawangan),
      kumpulanPerkhidmatan: Number(idKumpulanPerkhidmatan),
      playerId: playerId,
      statusTiket: 0,
      createDate: new Date(Date.now() + 8 * 60 * 60 * 1000),
      sesi: 1,
      updateDate: new Date(Date.now() + 8 * 60 * 60 * 1000),
    },
  });

  // Update no_terkini
  await prisma.kumpulanPerkhidmatan.update({
    where: { id: Number(idKumpulanPerkhidmatan) },
    data: { noTerkini: newNoTiket },
  });

  // Get current serving number
  const currentServing = await prisma.logTiket.findFirst({
    where: {
      cawangan: String(cawangan),
      noSiri: noSiri,
      statusTiket: 4,
    },
    orderBy: { callDate: "desc" },
  });

  return NextResponse.json({
    no_tiket_anda: newNoTiket,
    no_sekarang: currentServing?.noTiket || 0,
    no_siri: noSiri,
    transid: transId,
  });
}

// PUT: Update ticket status (call/complete)
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { transId, status } = body;

  const updateData: Record<string, unknown> = {
    statusTiket: Number(status),
  };

  if (Number(status) === 2) {
    // Called
    updateData.callDate = new Date();
    updateData.kaunter = session.user.noKaunter
      ? Number(session.user.noKaunter)
      : null;
  } else if (Number(status) === 4) {
    // Completed
    updateData.endDate = new Date();
  }

  await prisma.logTiket.updateMany({
    where: { transid: transId },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}
