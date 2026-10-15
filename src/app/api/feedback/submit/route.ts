import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceIpRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const limited = await enforceIpRateLimit(req, "feedback-submit", 10, 60);
    if (limited) return limited;

    const body = await req.json();
    const { ticketId, rating, tags, comment } = body;

    if (!ticketId || !rating) {
      return NextResponse.json(
        { success: false, message: "ticketId dan penarafan bintang (rating) diperlukan." },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { branch: true },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "Tiket tidak ditemui." },
        { status: 404 }
      );
    }

    const numericRating = Math.max(1, Math.min(5, Number(rating) || 5));

    const feedback = await prisma.feedback.upsert({
      where: { ticketId },
      update: {
        rating: numericRating,
        tags: tags || [],
        comment: comment || null,
      },
      create: {
        ticketId,
        tenantId: ticket.tenantId,
        branchId: ticket.branchId,
        counterNo: ticket.counterNo,
        staffUserId: ticket.calledByUserId,
        rating: numericRating,
        tags: tags || [],
        comment: comment || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Terima kasih atas maklum balas anda! Penilaian anda amat kami hargai.",
      feedback,
    });
  } catch (error) {
    console.error("[Feedback Submit Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa menghantar maklum balas." },
      { status: 500 }
    );
  }
}
