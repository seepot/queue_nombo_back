import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tickets } = body;

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tiada data tiket dibekalkan untuk penyegerakan." },
        { status: 400 }
      );
    }

    const syncedIds: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const item of tickets) {
        // Dapatkan cawangan dan maklumat kategori
        const category = await tx.serviceCategory.findUnique({
          where: { id: item.categoryId },
          include: { branch: true },
        });

        if (!category) {
          continue; // Langkau jika kategori tidak wujud
        }

        // Ekstrak seqNumber daripada ticketNo (cth: "A1002" -> 1002)
        const seqMatch = item.ticketNo.match(/\d+$/);
        const seqNum = seqMatch ? parseInt(seqMatch[0], 10) : category.currentSeq + 1;

        // Semak jika tiket dengan nombor yang sama pada hari ini sudah wujud
        const existingTicket = await tx.ticket.findFirst({
          where: {
            branchId: category.branchId,
            ticketNo: item.ticketNo,
            createdAt: {
              gte: new Date(new Date(item.createdAt).setHours(0, 0, 0, 0)),
            },
          },
        });

        if (!existingTicket) {
          // Cipta tiket dalam PostgreSQL
          await tx.ticket.create({
            data: {
              tenantId: category.branch.tenantId,
              branchId: category.branchId,
              categoryId: category.id,
              ticketNo: item.ticketNo,
              seqNumber: seqNum,
              phoneNo: item.phoneNo || null,
              status: "WAITING",
              requestType: "KIOSK",
              createdAt: new Date(item.createdAt),
            },
          });

          // Kemas kini currentSeq kategori jika lebih tinggi
          if (seqNum > category.currentSeq) {
            await tx.serviceCategory.update({
              where: { id: category.id },
              data: { currentSeq: seqNum },
            });
          }
        }

        syncedIds.push(item.id);
      }

      // Catat log audit rasmi
      if (syncedIds.length > 0) {
        const firstBranch = await tx.branch.findFirst({
          where: { id: tickets[0]?.branchId },
        });

        if (firstBranch) {
          await tx.auditLog.create({
            data: {
              tenantId: firstBranch.tenantId,
              action: "OFFLINE_BATCH_SYNC",
              details: { syncedCount: syncedIds.length, tickets: tickets.map((t: any) => t.ticketNo) },
              status: "SUCCESS",
            },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `${syncedIds.length} rekod tiket luar talian berjaya disegerakkan ke pangkalan data awan.`,
      syncedIds,
    });
  } catch (error: any) {
    console.error("[Offline Batch Sync Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Ralat pelayan semasa penyegerakan luar talian." },
      { status: 500 }
    );
  }
}
