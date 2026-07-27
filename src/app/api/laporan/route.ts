import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cawangan = session.user.idCawangan;
  const tarikhmula = searchParams.get("tarikhmula");
  const tarikhakhir = searchParams.get("tarikhakhir");
  const jenis = searchParams.get("jenis") || "tiket";

  if (!tarikhmula || !tarikhakhir) {
    return NextResponse.json({ error: "Dates required" }, { status: 400 });
  }

  if (jenis === "tiket") {
    const tikets = await prisma.$queryRawUnsafe<
      Array<{
        id: number;
        no_tiket: number | null;
        no_siri: number;
        tarikh: Date | null;
        status_tiket: number | null;
        create_date: Date | null;
      }>
    >(
      `SELECT id, no_tiket, no_siri, tarikh, status_tiket, create_date
       FROM log_tiket
       WHERE cawangan = ? AND DATE(tarikh) BETWEEN ? AND ?
       ORDER BY id ASC`,
      cawangan,
      tarikhmula,
      tarikhakhir
    );

    // Aggregate by no_siri
    const summary: Record<
      string,
      { total: number; served: number; cancelled: number }
    > = {};
    for (const t of tikets) {
      const key = String(t.no_siri || "UNKNOWN");
      if (!summary[key]) summary[key] = { total: 0, served: 0, cancelled: 0 };
      summary[key].total++;
      if (t.status_tiket === 4) summary[key].served++;
      if (t.status_tiket === 5) summary[key].cancelled++;
    }

    return NextResponse.json({
      tikets: tikets.map((t) => ({ ...t, id: Number(t.id) })),
      summary,
    });
  }

  if (jenis === "temujanji") {
    const appointments = await prisma.$queryRawUnsafe<
      Array<{
        id: number;
        nama: string | null;
        nopengenalan: string | null;
        notelefon: string | null;
        tarikh: string | null;
        masa: string | null;
        create_date: Date | null;
      }>
    >(
      `SELECT tl.id, tl.nama, tl.nopengenalan, tl.notelefon, tm.tarikh, tm.masa, tl.create_date
       FROM tempahan_list tl
       INNER JOIN tempahan_masa tm ON tl.tempahan_masa_id = tm.id
       WHERE tl.cawangan = ? AND tm.tarikh BETWEEN ? AND ? AND tl.nama IS NOT NULL
       ORDER BY tl.id ASC`,
      cawangan,
      tarikhmula,
      tarikhakhir
    );

    return NextResponse.json({
      appointments: appointments.map((a) => ({ ...a, id: Number(a.id) })),
      total: appointments.length,
    });
  }

  return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
}
