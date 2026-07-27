import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const negeri = searchParams.get("negeri");

  if (!negeri) {
    return NextResponse.json({ error: "Negeri diperlukan" }, { status: 400 });
  }

  const data = await prisma.$queryRawUnsafe<
    Array<{ id_cawangan: string; nama_cawangan: string }>
  >(
    `SELECT id_cawangan, nama_cawangan FROM cawangan WHERE id_cawangan LIKE ? ORDER BY nama_cawangan`,
    `01${negeri}%`
  );

  return NextResponse.json({ data });
}
