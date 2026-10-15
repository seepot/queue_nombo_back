import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

    const body = await req.json();
    const {
      action, // "CALL_NEXT", "RECALL", "SERVE", "COMPLETE", "TRANSFER", "NO_SHOW"
      counterId,
      counterNo,
      branchId,
      ticketId,
      transferCategoryId,
    } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const userId = user.id;
    const activeBranchId = branchId || user.branchId;

    if (!action || !activeBranchId) {
      return NextResponse.json(
        { success: false, message: "action dan branchId diperlukan" },
        { status: 400 }
      );
    }

    // Sekat operasi kaunter jika langganan tenant tamat / digantung (SUPERADMIN dikecualikan)
    if (user.role !== "SUPERADMIN") {
      const gateTenantId =
        user.tenantId ||
        (await prisma.branch.findUnique({ where: { id: activeBranchId }, select: { tenantId: true } }))?.tenantId;
      if (gateTenantId) {
        const gate = await assertTenantOperational(gateTenantId);
        if (!gate.ok) return subscriptionBlockedResponse(gate);
      }
    }

    const now = new Date();

    // -------------------------------------------------------------------------
    // 1. ACTION: CALL_NEXT (Panggil Nombor Seterusnya / Panggil Nombor Khusus)
    // -------------------------------------------------------------------------
    if (action === "CALL_NEXT") {
      const { targetTicketId, targetTicketNo, categoryId } = body;

      // Cari tiket khusus (jika doktor pilih dari senarai atau taip manual) ATAU tiket terawal dalam barisan
      const nextTicket = targetTicketId
        ? await prisma.ticket.findFirst({
            where: {
              id: targetTicketId,
              branchId: activeBranchId,
            },
            include: {
              category: true,
              branch: { include: { tenant: true } },
            },
          })
        : targetTicketNo
        ? await prisma.ticket.findFirst({
            where: {
              branchId: activeBranchId,
              ticketNo: { equals: targetTicketNo.trim(), mode: "insensitive" },
              status: "WAITING",
            },
            include: {
              category: true,
              branch: { include: { tenant: true } },
            },
          })
        : await prisma.ticket.findFirst({
            where: {
              branchId: activeBranchId,
              status: "WAITING",
              ...(categoryId ? { categoryId } : {}),
            },
            include: {
              category: true,
              branch: { include: { tenant: true } },
            },
            orderBy: { createdAt: "asc" },
          });

      if (!nextTicket) {
        return NextResponse.json({
          success: true,
          hasTicket: false,
          message: targetTicketNo
            ? `Tiket '${targetTicketNo}' tidak ditemui atau bukan dalam status menunggu.`
            : "Tiada giliran menunggu pada masa ini.",
        });
      }

      // Kira masa menunggu dari saat tiket dijana sehingga dipanggil (saat)
      const waitingDuration = Math.max(
        0,
        Math.floor((now.getTime() - new Date(nextTicket.createdAt).getTime()) / 1000)
      );

      // Kemas kini status tiket ke CALLING
      const updatedTicket = await prisma.ticket.update({
        where: { id: nextTicket.id },
        data: {
          status: "CALLING",
          counterNo: counterNo || "1",
          calledByUserId: userId,
          calledAt: now,
          callCount: { increment: 1 },
          waitingDurationSeconds: waitingDuration,
        },
      });

      // Kemas kini kaunter dengan tiket semasa
      if (counterId) {
        await prisma.counter.update({
          where: { id: counterId },
          data: {
            currentTicketId: updatedTicket.id,
            status: "OPEN",
          },
        });
      }

      // Pancarkan ke WebSocket Realtime Gateway (TV Display)
      const { broadcastToRealtime } = await import("@/lib/realtime");
      await broadcastToRealtime("publish/display", {
        tenantId: nextTicket.branch.tenantId,
        branchId: nextTicket.branchId,
        ticketNo: updatedTicket.ticketNo,
        counterNo: updatedTicket.counterNo,
        categoryName: nextTicket.category.name,
        action: "CALL_NEXT",
        voiceAnnouncement: `Nombor giliran ${updatedTicket.ticketNo.split("").join(" ")}, sila ke kaunter ${updatedTicket.counterNo}`,
        callDate: now.toISOString(),
      });

      return NextResponse.json({
        success: true,
        hasTicket: true,
        action: "CALL_NEXT",
        ticket: {
          id: updatedTicket.id,
          ticketNo: updatedTicket.ticketNo,
          counterNo: updatedTicket.counterNo,
          categoryName: nextTicket.category.name,
          callCount: updatedTicket.callCount,
          waitingDurationSeconds: updatedTicket.waitingDurationSeconds,
          voiceAnnouncement: `Nombor giliran ${updatedTicket.ticketNo.split("").join(" ")}, sila ke kaunter ${updatedTicket.counterNo}`,
        },
      });
    }

    // -------------------------------------------------------------------------
    // 2. ACTION: RECALL (Panggilan Semula)
    // -------------------------------------------------------------------------
    if (action === "RECALL") {
      if (!ticketId) {
        return NextResponse.json(
          { success: false, message: "ticketId diperlukan untuk panggilan semula" },
          { status: 400 }
        );
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: "RECALLED",
          calledAt: now,
          callCount: { increment: 1 },
        },
        include: { category: true, branch: true },
      });

      // Pancarkan ke WebSocket Realtime Gateway
      const { broadcastToRealtime } = await import("@/lib/realtime");
      await broadcastToRealtime("publish/display", {
        tenantId: updatedTicket.tenantId,
        branchId: updatedTicket.branchId,
        ticketNo: updatedTicket.ticketNo,
        counterNo: updatedTicket.counterNo,
        categoryName: updatedTicket.category.name,
        action: "RECALL",
        voiceAnnouncement: `Panggilan semula, nombor giliran ${updatedTicket.ticketNo.split("").join(" ")}, sila ke kaunter ${updatedTicket.counterNo}`,
        callDate: now.toISOString(),
      });

      return NextResponse.json({
        success: true,
        action: "RECALL",
        ticket: {
          id: updatedTicket.id,
          ticketNo: updatedTicket.ticketNo,
          counterNo: updatedTicket.counterNo,
          categoryName: updatedTicket.category.name,
          callCount: updatedTicket.callCount,
          voiceAnnouncement: `Panggilan semula, nombor giliran ${updatedTicket.ticketNo.split("").join(" ")}, sila ke kaunter ${updatedTicket.counterNo}`,
        },
      });
    }

    // -------------------------------------------------------------------------
    // 3. ACTION: COMPLETE (Selesai Urusan)
    // -------------------------------------------------------------------------
    if (action === "COMPLETE") {
      if (!ticketId) {
        return NextResponse.json(
          { success: false, message: "ticketId diperlukan untuk selesai urusan" },
          { status: 400 }
        );
      }

      const existing = await prisma.ticket.findUnique({ where: { id: ticketId } });
      const startTime = existing?.calledAt || existing?.servedAt || now;
      const servingDuration = Math.max(
        0,
        Math.floor((now.getTime() - new Date(startTime).getTime()) / 1000)
      );

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: "COMPLETED",
          completedAt: now,
          servingDurationSeconds: servingDuration,
        },
      });

      if (counterId) {
        await prisma.counter.update({
          where: { id: counterId },
          data: { currentTicketId: null },
        });
      }

      return NextResponse.json({
        success: true,
        action: "COMPLETE",
        ticket: {
          id: updatedTicket.id,
          ticketNo: updatedTicket.ticketNo,
          servingDurationSeconds: updatedTicket.servingDurationSeconds,
        },
      });
    }

    // -------------------------------------------------------------------------
    // 4. ACTION: NO_SHOW (Pelanggan Tidak Hadir)
    // -------------------------------------------------------------------------
    if (action === "NO_SHOW") {
      if (!ticketId) {
        return NextResponse.json(
          { success: false, message: "ticketId diperlukan" },
          { status: 400 }
        );
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: "NO_SHOW",
          completedAt: now,
        },
      });

      if (counterId) {
        await prisma.counter.update({
          where: { id: counterId },
          data: { currentTicketId: null },
        });
      }

      return NextResponse.json({
        success: true,
        action: "NO_SHOW",
        ticket: { id: updatedTicket.id, ticketNo: updatedTicket.ticketNo },
      });
    }

    // -------------------------------------------------------------------------
    // 5. ACTION: COMPLETE_AND_FORWARD (Selesai Peringkat Semasa & Hantar Seterusnya)
    // -------------------------------------------------------------------------
    if (action === "COMPLETE_AND_FORWARD") {
      if (!ticketId) {
        return NextResponse.json({ success: false, message: "ticketId diperlukan" }, { status: 400 });
      }

      const currentTicket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { category: true },
      });

      if (!currentTicket) {
        return NextResponse.json({ success: false, message: "Tiket tidak ditemui" }, { status: 404 });
      }

      const targetCatId = transferCategoryId || currentTicket.category?.nextCategoryId;

      if (targetCatId) {
        const nextCat = await prisma.serviceCategory.findUnique({ where: { id: targetCatId } });
        const updatedTicket = await prisma.ticket.update({
          where: { id: ticketId },
          data: {
            status: "WAITING",
            categoryId: targetCatId,
            counterNo: null,
          },
        });

        if (counterId) {
          await prisma.counter.update({
            where: { id: counterId },
            data: { currentTicketId: null },
          });
        }

        return NextResponse.json({
          success: true,
          action: "COMPLETE_AND_FORWARD",
          forwarded: true,
          ticket: {
            id: updatedTicket.id,
            ticketNo: updatedTicket.ticketNo,
            nextCategoryName: nextCat?.name || "Peringkat Seterusnya",
          },
        });
      } else {
        // Jika tiada stesen seterusnya, selesaikan terus (COMPLETED)
        const updatedTicket = await prisma.ticket.update({
          where: { id: ticketId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });

        if (counterId) {
          await prisma.counter.update({
            where: { id: counterId },
            data: { currentTicketId: null },
          });
        }

        return NextResponse.json({
          success: true,
          action: "COMPLETE_AND_FORWARD",
          forwarded: false,
          ticket: {
            id: updatedTicket.id,
            ticketNo: updatedTicket.ticketNo,
          },
        });
      }
    }

    // -------------------------------------------------------------------------
    // 6. ACTION: TRANSFER (Pindah Kategori / Kaunter Manual)
    // -------------------------------------------------------------------------
    if (action === "TRANSFER") {
      if (!ticketId || !transferCategoryId) {
        return NextResponse.json(
          { success: false, message: "ticketId dan transferCategoryId diperlukan" },
          { status: 400 }
        );
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: "WAITING",
          categoryId: transferCategoryId,
          counterNo: null,
        },
        include: { category: true },
      });

      if (counterId) {
        await prisma.counter.update({
          where: { id: counterId },
          data: { currentTicketId: null },
        });
      }

      return NextResponse.json({
        success: true,
        action: "TRANSFER",
        ticket: {
          id: updatedTicket.id,
          ticketNo: updatedTicket.ticketNo,
          newCategoryName: updatedTicket.category.name,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: `Tindakan '${action}' tidak dikenali.` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Counter Action Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa memproses tindakan kaunter" },
      { status: 500 }
    );
  }
}
