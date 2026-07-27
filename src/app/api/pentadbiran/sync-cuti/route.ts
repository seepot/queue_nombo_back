import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Malaysia Public Holidays - can be updated yearly
// Source: Malaysian Government Gazette
const HOLIDAYS: Record<number, Array<{ date: string; name: string }>> = {
  2025: [
    { date: "2025-01-01", name: "Tahun Baru" },
    { date: "2025-01-14", name: "Hari Keputeraan Sultan Negeri Sembilan" },
    { date: "2025-01-27", name: "Thaipusam" },
    { date: "2025-01-29", name: "Tahun Baru Cina" },
    { date: "2025-01-30", name: "Tahun Baru Cina (Hari Kedua)" },
    { date: "2025-02-01", name: "Hari Wilayah Persekutuan" },
    { date: "2025-02-12", name: "Israk dan Mikraj" },
    { date: "2025-03-01", name: "Maulidur Rasul (Nuzul Al-Quran)" },
    { date: "2025-03-17", name: "Nuzul Al-Quran" },
    { date: "2025-03-31", name: "Hari Raya Aidilfitri" },
    { date: "2025-04-01", name: "Hari Raya Aidilfitri (Hari Kedua)" },
    { date: "2025-05-01", name: "Hari Pekerja" },
    { date: "2025-05-12", name: "Hari Wesak" },
    { date: "2025-06-02", name: "Hari Keputeraan YDP Agong" },
    { date: "2025-06-07", name: "Hari Raya Haji" },
    { date: "2025-06-08", name: "Hari Raya Haji (Hari Kedua)" },
    { date: "2025-06-27", name: "Awal Muharram" },
    { date: "2025-08-31", name: "Hari Kebangsaan" },
    { date: "2025-09-05", name: "Maulidur Rasul" },
    { date: "2025-09-16", name: "Hari Malaysia" },
    { date: "2025-10-20", name: "Deepavali" },
    { date: "2025-12-25", name: "Hari Krismas" },
  ],
  2026: [
    { date: "2026-01-01", name: "Tahun Baru" },
    { date: "2026-01-14", name: "Hari Keputeraan Sultan Negeri Sembilan" },
    { date: "2026-01-16", name: "Thaipusam" },
    { date: "2026-02-01", name: "Hari Wilayah Persekutuan" },
    { date: "2026-02-02", name: "Israk dan Mikraj" },
    { date: "2026-02-17", name: "Tahun Baru Cina" },
    { date: "2026-02-18", name: "Tahun Baru Cina (Hari Kedua)" },
    { date: "2026-03-06", name: "Nuzul Al-Quran" },
    { date: "2026-03-20", name: "Hari Raya Aidilfitri" },
    { date: "2026-03-21", name: "Hari Raya Aidilfitri (Hari Kedua)" },
    { date: "2026-05-01", name: "Hari Pekerja" },
    { date: "2026-05-02", name: "Hari Wesak" },
    { date: "2026-05-27", name: "Hari Raya Haji" },
    { date: "2026-05-28", name: "Hari Raya Haji (Hari Kedua)" },
    { date: "2026-06-01", name: "Hari Keputeraan YDP Agong" },
    { date: "2026-06-17", name: "Awal Muharram" },
    { date: "2026-08-26", name: "Maulidur Rasul" },
    { date: "2026-08-31", name: "Hari Kebangsaan" },
    { date: "2026-09-16", name: "Hari Malaysia" },
    { date: "2026-11-08", name: "Deepavali" },
    { date: "2026-12-25", name: "Hari Krismas" },
  ],
  2027: [
    { date: "2027-01-01", name: "Tahun Baru" },
    { date: "2027-02-01", name: "Hari Wilayah Persekutuan" },
    { date: "2027-02-06", name: "Tahun Baru Cina" },
    { date: "2027-02-07", name: "Tahun Baru Cina (Hari Kedua)" },
    { date: "2027-01-22", name: "Israk dan Mikraj" },
    { date: "2027-02-23", name: "Nuzul Al-Quran" },
    { date: "2027-03-10", name: "Hari Raya Aidilfitri" },
    { date: "2027-03-11", name: "Hari Raya Aidilfitri (Hari Kedua)" },
    { date: "2027-05-01", name: "Hari Pekerja" },
    { date: "2027-05-16", name: "Hari Raya Haji" },
    { date: "2027-05-17", name: "Hari Raya Haji (Hari Kedua)" },
    { date: "2027-05-22", name: "Hari Wesak" },
    { date: "2027-06-06", name: "Awal Muharram" },
    { date: "2027-06-07", name: "Hari Keputeraan YDP Agong" },
    { date: "2027-08-15", name: "Maulidur Rasul" },
    { date: "2027-08-31", name: "Hari Kebangsaan" },
    { date: "2027-09-16", name: "Hari Malaysia" },
    { date: "2027-10-29", name: "Deepavali" },
    { date: "2027-12-25", name: "Hari Krismas" },
  ],
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["1", "2"].includes(session.user.levelAkses)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const year = body.year || new Date(Date.now() + 8 * 60 * 60 * 1000).getFullYear();
  const cawangan = session.user.idCawangan;

  const holidays = HOLIDAYS[year];
  if (!holidays) {
    return NextResponse.json(
      { error: `Data cuti umum untuk tahun ${year} tidak tersedia` },
      { status: 404 }
    );
  }

  // Get existing cuti for this year to avoid duplicates
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;
  const existing = await prisma.cutiUmum.findMany({
    where: {
      cawangan,
      tarikh1: { gte: new Date(startOfYear), lte: new Date(endOfYear) },
    },
  });
  const existingDates = new Set(
    existing.map((c) => c.tarikh1?.toISOString().slice(0, 10))
  );

  // Insert only new holidays
  let added = 0;
  for (const holiday of holidays) {
    if (!existingDates.has(holiday.date)) {
      await prisma.cutiUmum.create({
        data: {
          cawangan,
          tarikh1: new Date(holiday.date),
          keterangan: holiday.name,
        },
      });
      added++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `${added} cuti umum ditambah untuk tahun ${year}. ${holidays.length - added} sudah wujud.`,
    total: holidays.length,
    added,
    skipped: holidays.length - added,
  });
}
