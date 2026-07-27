import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { oldPassword, newPassword } = body;

  if (!oldPassword || !newPassword) {
    return NextResponse.json({ error: "Sila lengkapkan semua maklumat" }, { status: 400 });
  }

  // Get current user
  const user = await prisma.user.findFirst({
    where: { id: Number(session.user.id) },
  });

  if (!user) {
    return NextResponse.json({ error: "Pengguna tidak dijumpai" }, { status: 404 });
  }

  // Verify old password
  const oldHash = createHash("sha1").update(oldPassword).digest("hex");
  if (user.pass !== oldHash) {
    return NextResponse.json({ error: "Kata laluan lama tidak betul" }, { status: 400 });
  }

  // Update to new password
  const newHash = createHash("sha1").update(newPassword).digest("hex");
  await prisma.user.update({
    where: { id: Number(session.user.id) },
    data: { pass: newHash },
  });

  return NextResponse.json({ success: true });
}
