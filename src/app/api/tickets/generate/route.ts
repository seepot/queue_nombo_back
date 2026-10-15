import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextTicketSequence } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      branchId,
      categoryId,
      phoneNo,
      customerName,
      requestType = "QR_WEB",
      notes,
    } = body;

    if (!branchId || !categoryId) {
      return NextResponse.json(
        { success: false, message: "branchId dan categoryId diperlukan" },
        { status: 400 }
      );
    }

    // 1. Dapatkan info cawangan & kategori servis
    const category = await prisma.serviceCategory.findUnique({
      where: { id: categoryId },
      include: {
        branch: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!category || category.branchId !== branchId) {
      return NextResponse.json(
        { success: false, message: "Kategori perkhidmatan tidak ditemui untuk cawangan ini." },
        { status: 404 }
      );
    }

    const branch = category.branch;
    const tenant = branch.tenant;

    // 2. Jana nombor giliran secara atomik melalui Redis (<1ms)
    const { ticketNo, seqNumber } = await getNextTicketSequence(
      tenant.id,
      branch.id,
      category.id,
      category.prefixCode,
      category.startNumber
    );

    // 3. Kira jumlah orang yang sedang menunggu di hadapan
    const waitingCount = await prisma.ticket.count({
      where: {
        branchId: branch.id,
        categoryId: category.id,
        status: "WAITING",
      },
    });

    const estimatedWaitMinutes = (waitingCount + 1) * category.estimatedMinutes;

    // 4. Simpan rekod tiket ke dalam pangkalan data PostgreSQL
    const ticket = await prisma.ticket.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        categoryId: category.id,
        ticketNo,
        seqNumber,
        phoneNo: phoneNo || null,
        customerName: customerName || null,
        status: "WAITING",
        requestType,
        notes: notes || null,
      },
    });

    // 5. Kemas kini turutan nombor semasa dalam jadual kategori
    await prisma.serviceCategory.update({
      where: { id: category.id },
      data: { currentSeq: seqNumber },
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNo: ticket.ticketNo,
        seqNumber: ticket.seqNumber,
        categoryName: category.name,
        branchName: branch.name,
        tenantName: tenant.name,
        status: ticket.status,
        waitingCount,
        estimatedWaitMinutes,
        createdAt: ticket.createdAt,
        ticketUrl: `/ticket/${ticket.id}`,
      },
    });
  } catch (error) {
    console.error("[Ticket Generate Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa menjana nombor giliran" },
      { status: 500 }
    );
  }
}
