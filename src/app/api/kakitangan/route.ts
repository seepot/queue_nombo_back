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
  const { nama, nokp, username, cawangan, akses } = body;

  if (!nama || !nokp || !username) {
    return NextResponse.json(
      { error: "Sila lengkapkan semua maklumat" },
      { status: 400 }
    );
  }

  // Check if username already exists
  const existing = await prisma.user.findFirst({
    where: { uname: username },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Username telah wujud dalam sistem" },
      { status: 409 }
    );
  }

  // Check if nokp already registered
  const existingNokp = await prisma.user.findFirst({
    where: { nokp },
  });
  if (existingNokp) {
    return NextResponse.json(
      { error: "No KP Pengguna pernah didaftarkan" },
      { status: 409 }
    );
  }

  // Default password = SHA1 of nokp (matching old PHP: $password = sha1($_POST['nokp']))
  const password = createHash("sha1").update(nokp).digest("hex");

  await prisma.user.create({
    data: {
      nama,
      nokp,
      uname: username,
      pass: password,
      idCawangan: cawangan || session.user.idCawangan,
      levelAkses: akses || 3,
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

// PUT: Update kakitangan details
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || !["1", "2"].includes(session.user.levelAkses)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, nama, nokp, uname } = body;

  if (!id || !nama || !nokp || !uname) {
    return NextResponse.json(
      { error: "Sila lengkapkan semua maklumat" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: Number(id) },
    data: { nama, nokp, uname },
  });

  return NextResponse.json({ success: true });
}

// DELETE: Remove kakitangan
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || !["1", "2"].includes(session.user.levelAkses)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!id) {
    return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

// PATCH: Toggle active/inactive status
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || !["1", "2"].includes(session.user.levelAkses)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, active } = body;

  if (!id) {
    return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
  }

  // catatan = null means active, "inactive" means deactivated
  await prisma.user.update({
    where: { id: Number(id) },
    data: { catatan: active ? null : "inactive" },
  });

  return NextResponse.json({ success: true, active });
}
