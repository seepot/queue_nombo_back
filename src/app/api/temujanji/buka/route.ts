import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAY_MAP: Record<number, string> = {
  0: "SUN",
  1: "MON",
  2: "TUE",
  3: "WED",
  4: "THU",
  5: "FRI",
  6: "SAT",
};

const SLOT_INTERVAL_MINUTES = 30;

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDbDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function formatTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function timeFromDb(value: Date) {
  return value.toISOString().slice(11, 16);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.levelAkses !== "2") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const cawangan = session.user.idCawangan;
  const tarikh1 = String(body.tarikh1 || "");
  const tarikh2 = String(body.tarikh2 || tarikh1);
  const kump = String(body.kump || "");
  const bilSlot = Math.max(Number(body.bilSlot || 0), 0);
  const bilMax = Math.max(Number(body.bilMax || 0), 0);

  if (!tarikh1 || !tarikh2 || !kump || bilSlot <= 0) {
    return NextResponse.json(
      { error: "Tarikh, kumpulan perkhidmatan dan bilangan slot diperlukan" },
      { status: 400 }
    );
  }

  const startDate = parseDateInput(tarikh1);
  const endDate = parseDateInput(tarikh2);

  if (startDate > endDate) {
    return NextResponse.json(
      { error: "Tarikh mula tidak boleh melebihi tarikh hingga" },
      { status: 400 }
    );
  }

  const [hariCuti, cutiUmum, waktuOperasi] = await Promise.all([
    prisma.hariCuti.findMany({ where: { cawangan } }),
    prisma.cutiUmum.findMany({ where: { cawangan } }),
    prisma.waktuOperasi.findMany({
      where: { cawangan, statusAktif: 1 },
      orderBy: [{ namaHari: "asc" }, { sesi: "asc" }, { id: "asc" }],
    }),
  ]);

  let daysCreated = 0;
  let slotsCreated = 0;
  let placeholdersCreated = 0;
  let skippedExisting = 0;
  let skippedClosed = 0;

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = formatDate(current);
    const dayCode = DAY_MAP[current.getDay()];

    const existingDate = await prisma.tempahanTarikh.findFirst({
      where: { cawangan, tarikh: dateStr },
      select: { id: true },
    });
    const existingSlot = await prisma.tempahanMasa.findFirst({
      where: { cawangan, tarikh: dateStr },
      select: { id: true },
    });
    const isPublicHoliday = cutiUmum.some(
      (cuti) => cuti.tarikh1 && formatDbDate(cuti.tarikh1) === dateStr
    );
    const isWeeklyOff = hariCuti.some((cuti) => cuti.namaHari === dayCode);

    if (existingDate || existingSlot) {
      skippedExisting += 1;
      current.setDate(current.getDate() + 1);
      continue;
    }

    if (isPublicHoliday || isWeeklyOff) {
      skippedClosed += 1;
      current.setDate(current.getDate() + 1);
      continue;
    }

    const sessions = waktuOperasi.filter((row) => row.namaHari === dayCode);
    if (sessions.length === 0) {
      skippedClosed += 1;
      current.setDate(current.getDate() + 1);
      continue;
    }

    await prisma.tempahanTarikh.create({
      data: {
        cawangan,
        tarikh: dateStr,
        kumpPerkhidmatan: kump,
        hadMax: bilMax > 0 ? String(bilMax) : null,
        status: 0,
      },
    });

    let dailyPlaceholders = 0;

    for (const sesi of sessions) {
      if (!sesi.waktuMula || !sesi.waktuTamat) continue;

      let currentMinutes = parseTime(timeFromDb(sesi.waktuMula));
      const endMinutes = parseTime(timeFromDb(sesi.waktuTamat));

      while (currentMinutes + SLOT_INTERVAL_MINUTES <= endMinutes) {
        const masa = formatTime(currentMinutes);
        const slot = await prisma.tempahanMasa.create({
          data: {
            cawangan,
            kumpPerkhidmatan: kump,
            tarikh: dateStr,
            masa,
            bilangan: bilSlot,
            status: 0,
          },
        });

        slotsCreated += 1;

        const remainingDaily =
          bilMax > 0 ? Math.max(bilMax - dailyPlaceholders, 0) : bilSlot;
        const placeholderCount = bilMax > 0 ? Math.min(bilSlot, remainingDaily) : bilSlot;

        for (let i = 0; i < placeholderCount; i += 1) {
          await prisma.tempahanList.create({
            data: {
              tempahanMasaId: slot.id,
              cawangan,
              urusniaga: Number(kump),
            },
          });
        }

        dailyPlaceholders += placeholderCount;
        placeholdersCreated += placeholderCount;

        if (bilMax > 0 && dailyPlaceholders >= bilMax) break;
        currentMinutes += SLOT_INTERVAL_MINUTES;
      }

      if (bilMax > 0 && dailyPlaceholders >= bilMax) break;
    }

    daysCreated += 1;
    current.setDate(current.getDate() + 1);
  }

  return NextResponse.json({
    success: true,
    daysCreated,
    slotsCreated,
    placeholdersCreated,
    skippedExisting,
    skippedClosed,
  });
}
