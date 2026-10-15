import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      branchId,
      categoryId,
      appointmentDate: rawDate,
      timeSlot,
      customerName,
      customerEmail,
      customerPhone,
      notes,
    } = body;

    if (!branchId || !categoryId || !rawDate || !timeSlot || !customerName || !customerPhone) {
      return NextResponse.json(
        { success: false, message: "Semua medan bertanda * wajib diisi." },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { tenant: true },
    });

    if (!branch) {
      return NextResponse.json(
        { success: false, message: "Cawangan tidak ditemui." },
        { status: 404 }
      );
    }

    const appointmentDate = new Date(`${rawDate}T00:00:00.000Z`);

    // 1. Semak had kuota slot (Maksimum 5 temujanji bagi slot yang sama)
    const slotCount = await prisma.appointment.count({
      where: {
        branchId,
        appointmentDate,
        timeSlot,
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
    });

    if (slotCount >= 5) {
      return NextResponse.json(
        { success: false, message: `Slot masa ${timeSlot} pada tarikh tersebut telah penuh. Sila pilih slot lain.` },
        { status: 400 }
      );
    }

    // 2. Cipta rekod temujanji
    const appointment = await prisma.appointment.create({
      data: {
        tenantId: branch.tenantId,
        branchId: branch.id,
        categoryId,
        appointmentDate,
        timeSlot,
        customerName,
        customerEmail: customerEmail || null,
        customerPhone,
        notes: notes || null,
        status: "CONFIRMED",
      },
      include: {
        category: true,
        branch: {
          include: { tenant: true },
        },
      },
    });

    // 3. Bina pautan Google Calendar
    const [hours, minutes] = timeSlot.split(":").map(Number);
    const startDateTime = new Date(appointmentDate);
    startDateTime.setUTCHours(hours || 9, minutes || 0, 0, 0);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000); // 30 minit

    const formatDateForGCal = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");
    const gCalTitle = encodeURIComponent(`Temujanji QueNombo: ${appointment.category.name} @ ${branch.name}`);
    const gCalDetails = encodeURIComponent(`Temujanji ${appointment.category.name} untuk ${customerName}.\nLokasi: ${branch.address || branch.name}`);
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gCalTitle}&dates=${formatDateForGCal(startDateTime)}/${formatDateForGCal(endDateTime)}&details=${gCalDetails}`;

    return NextResponse.json({
      success: true,
      message: `Temujanji anda pada ${rawDate} (${timeSlot}) telah disahkan!`,
      appointment,
      calendar: {
        googleCalendarUrl: gCalUrl,
      },
    });
  } catch (error) {
    console.error("[Appointment Booking Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa memproses tempahan temujanji." },
      { status: 500 }
    );
  }
}
