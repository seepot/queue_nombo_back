import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextTicketSequence } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, phone } = body;

    if (!appointmentId && !phone) {
      return NextResponse.json(
        { success: false, message: "ID temujanji atau nombor telefon diperlukan." },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        ...(appointmentId ? { id: appointmentId } : {}),
        ...(phone ? { customerPhone: phone } : {}),
        status: "CONFIRMED",
      },
      include: {
        branch: { include: { tenant: true } },
        category: true,
      },
      orderBy: { appointmentDate: "asc" },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, message: "Tiada rekod temujanji yang disahkan ditemui." },
        { status: 404 }
      );
    }

    // 1. Dapatkan nombor giliran automatik
    const seq = await getNextTicketSequence(
      appointment.tenantId,
      appointment.branchId,
      appointment.categoryId,
      appointment.category.prefixCode
    );

    // 2. Jana tiket giliran keutamaan temujanji
    const ticket = await prisma.ticket.create({
      data: {
        tenantId: appointment.tenantId,
        branchId: appointment.branchId,
        categoryId: appointment.categoryId,
        ticketNo: seq.ticketNo,
        seqNumber: seq.seqNumber,
        customerName: appointment.customerName,
        phoneNo: appointment.customerPhone,
        requestType: "APPOINTMENT",
        status: "WAITING",
        notes: `Temujanji: ${appointment.timeSlot}`,
      },
      include: {
        category: true,
        branch: true,
      },
    });

    // 3. Kemas kini status temujanji kepada CHECKED_IN
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CHECKED_IN",
        ticketId: ticket.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Daftar masuk berjaya! Nombor Giliran Keutamaan anda: ${ticket.ticketNo}`,
      ticket,
      appointment,
    });
  } catch (error) {
    console.error("[Appointment Check-In Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa daftar masuk temujanji." },
      { status: 500 }
    );
  }
}
