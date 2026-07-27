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
  const { id, nokp } = body;

  if (!id || !nokp) {
    return NextResponse.json({ error: "ID dan No KP diperlukan" }, { status: 400 });
  }

  // Reset password to SHA1 of nokp (same as old PHP: sha1($id) where $id is nokp)
  const newPassword = createHash("sha1").update(nokp).digest("hex");

  await prisma.user.update({
    where: { id: Number(id) },
    data: { pass: newPassword },
  });

  return NextResponse.json({ success: true });
}
