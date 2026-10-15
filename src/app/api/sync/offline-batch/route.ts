import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { assertTenantOperational, subscriptionBlockedResponse } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Akses tidak dibenarkan. Sila log masuk." },
        { status: 401 }
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const isSuperadmin = user.role === "SUPERADMIN";

    if (!isSuperadmin && user.tenantId) {
      const gate = await assertTenantOperational(user.tenantId);
      if (!gate.ok) return subscriptionBlockedResponse(gate);
    }

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

        // Pengasingan tenant: hanya kategori milik tenant pengguna dibenarkan
        if (!isSuperadmin && category.branch.tenantId !== user.tenantId) {
          continue;
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
