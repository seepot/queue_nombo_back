import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cawangan = searchParams.get("cawangan") || "";
  const skip = Number(searchParams.get("skip") || 0);
  const take = Number(searchParams.get("take") || 10);

  let where: Record<string, unknown> = {};

  if (cawangan.startsWith("negeri:")) {
    // Filter by negeri (all branches in that state)
    const negeriCode = cawangan.replace("negeri:", "");
    where = {
      idCawangan: { startsWith: `01${negeriCode}` },
    };
  } else if (cawangan) {
    where = { idCawangan: cawangan };
  } else {
    return NextResponse.json({ users: [], total: 0 });
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { nama: "asc" },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      id: Number(u.id),
      nama: u.nama,
      uname: u.uname,
      nokp: u.nokp,
      levelAkses: u.levelAkses,
      catatan: u.catatan,
      idCawangan: u.idCawangan,
    })),
    total,
  });
}
