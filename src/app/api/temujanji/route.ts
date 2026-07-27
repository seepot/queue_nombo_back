import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: List appointments for a branch
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tarikh = searchParams.get("tarikh");
  const cawangan = session.user.idCawangan;

  if (tarikh) {
    // Get appointments for a specific date using raw query (no relation between tables)
    const appointments = await prisma.$queryRawUnsafe<
      Array<{
        id: number;
        nama: string | null;
        nopengenalan: string | null;
        notelefon: string | null;
        masa: string | null;
        create_date: Date | null;
      }>
    >(
      `SELECT tl.id, tl.nama, tl.nopengenalan, tl.notelefon, tm.masa, tl.create_date
       FROM tempahan_list tl
       INNER JOIN tempahan_masa tm ON tl.tempahan_masa_id = tm.id
       WHERE tl.cawangan = ? AND tm.tarikh = ? AND tl.nama IS NOT NULL
       ORDER BY tl.id ASC`,
      cawangan,
      tarikh
    );

    return NextResponse.json(
      appointments.map((a) => ({ ...a, id: Number(a.id) }))
    );
  }

  // Get tempahan_tarikh (appointment dates calendar)
  const tarikhList = await prisma.tempahanTarikh.findMany({
    where: { cawangan, status: 1 },
    orderBy: { tarikh: "asc" },
  });

  return NextResponse.json(tarikhList);
}

// POST: Create appointment slots
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const cawangan = session.user.idCawangan;

  const { tarikh1, tarikh2, kump, bilSlot, bilMax } = body;

  const startDate = new Date(tarikh1);
  const endDate = new Date(tarikh2);

  // Get holidays and off days
  const hariCuti = await prisma.hariCuti.findMany({
    where: { cawangan },
  });
  const cutiUmum = await prisma.cutiUmum.findMany({
    where: { cawangan },
  });

  // Get operating hours
  const waktuOperasi = await prisma.waktuOperasi.findMany({
    where: { cawangan, statusAktif: 1 },
    orderBy: { id: "asc" },
  });

  const dayMap: Record<string, string> = {
    Monday: "MON",
    Tuesday: "TUE",
    Wednesday: "WED",
    Thursday: "THU",
    Friday: "FRI",
    Saturday: "SAT",
    Sunday: "SUN",
  };

  let created = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dayName = currentDate.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const dayCode = dayMap[dayName];

    // Check if date already exists
    const existing = await prisma.tempahanTarikh.findFirst({
      where: { cawangan, tarikh: dateStr, kumpPerkhidmatan: String(kump) },
    });

    // Check public holiday
    const isPublicHoliday = cutiUmum.some(
      (c) => c.tarikh1?.toISOString().split("T")[0] === dateStr
    );

    // Check weekly off day
    const isOffDay = hariCuti.some((h) => h.namaHari === dayCode);

    if (!existing && !isPublicHoliday && !isOffDay) {
      // Create tempahan_tarikh
      await prisma.tempahanTarikh.create({
        data: {
          cawangan,
          tarikh: dateStr,
          kumpPerkhidmatan: String(kump),
          hadMax: String(bilMax),
          status: 1,
        },
      });

      // Get sessions for this day
      const daySessions = waktuOperasi.filter((w) => w.namaHari === dayCode);

      for (const s of daySessions) {
        if (!s.waktuMula || !s.waktuTamat) continue;

        const startTime = s.waktuMula.toISOString().slice(11, 16);
        const endTime = s.waktuTamat.toISOString().slice(11, 16);

        let currentTime = parseTime(startTime);
        const endMinutes = parseTime(endTime);

        while (currentTime <= endMinutes) {
          const timeStr = formatTime(currentTime);

          // Create tempahan_masa
          const masa = await prisma.tempahanMasa.create({
            data: {
              cawangan,
              kumpPerkhidmatan: String(kump),
              tarikh: dateStr,
              masa: timeStr,
              bilangan: bilSlot,
              status: 1,
            },
          });

          // Create tempahan_list slots
          for (let i = 0; i < bilSlot; i++) {
            await prisma.tempahanList.create({
              data: {
                tempahanMasaId: masa.id,
                cawangan,
                urusniaga: Number(kump),
              },
            });
          }

          currentTime += 30; // 30 minutes
          created++;
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return NextResponse.json({ success: true, slotsCreated: created });
}

// DELETE: Cancel/deactivate appointment dates
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const cawangan = session.user.idCawangan;
  const { tarikh1, tarikh2, catatan } = body;

  const endTarikh = tarikh2 || tarikh1;

  // Deactivate tempahan_tarikh (tarikh is a string field)
  await prisma.$queryRawUnsafe(
    `UPDATE tempahan_tarikh SET status = 0, cttn_batal = ?, nyahaktif = 1
     WHERE cawangan = ? AND tarikh BETWEEN ? AND ? AND status = 1`,
    catatan || "",
    cawangan,
    tarikh1,
    endTarikh
  );

  // Deactivate tempahan_masa
  await prisma.$queryRawUnsafe(
    `UPDATE tempahan_masa SET status = 5
     WHERE cawangan = ? AND tarikh BETWEEN ? AND ? AND status = 1`,
    cawangan,
    tarikh1,
    endTarikh
  );

  return NextResponse.json({ success: true });
}

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
