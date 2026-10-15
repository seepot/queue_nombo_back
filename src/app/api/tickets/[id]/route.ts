import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        category: true,
        branch: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Tiket tidak ditemui" },
        { status: 404 }
      );
    }

    // Kira bilangan giliran di hadapan
    let waitingAhead = 0;
    if (ticket.status === "WAITING") {
      waitingAhead = await prisma.ticket.count({
        where: {
          branchId: ticket.branchId,
          categoryId: ticket.categoryId,
          status: "WAITING",
          createdAt: { lt: ticket.createdAt },
        },
      });
    }

    const estimatedMinutes = (waitingAhead + 1) * ticket.category.estimatedMinutes;

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNo: ticket.ticketNo,
        status: ticket.status,
        counterNo: ticket.counterNo,
        categoryName: ticket.category.name,
        branchName: ticket.branch.name,
        tenantName: ticket.branch.tenant.name,
        waitingAhead,
        estimatedMinutes,
        calledAt: ticket.calledAt,
        completedAt: ticket.completedAt,
        createdAt: ticket.createdAt,
      },
    });
  } catch (error) {
    console.error("[Ticket Status API Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa mendapatkan status tiket" },
      { status: 500 }
    );
  }
}
