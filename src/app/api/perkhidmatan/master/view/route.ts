import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.levelAkses !== "1") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
  }

  // Find all kumpulan_perkhidmatan that use this perkhidmatan id in their id_perkhidmatan field
  const data = await prisma.$queryRawUnsafe<
    Array<{ keterangan: string | null; id_cawangan: string | null; nama_cawangan: string }>
  >(
    `SELECT kp.keterangan, kp.id_cawangan, c.nama_cawangan
     FROM kumpulan_perkhidmatan kp
     LEFT JOIN cawangan c ON kp.id_cawangan = c.id_cawangan
     WHERE FIND_IN_SET(?, kp.id_perkhidmatan) > 0
     ORDER BY c.nama_cawangan, kp.keterangan`,
    id
  );

  return NextResponse.json({
    data: data.map((r) => ({
      keterangan: r.keterangan || "-",
      id_cawangan: r.id_cawangan || "-",
      nama_cawangan: r.nama_cawangan || "-",
    })),
  });
}
