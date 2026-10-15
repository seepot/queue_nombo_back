import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reconcilePendingTransaction } from "@/lib/payment-gateway";

/**
 * GET /api/billing/verify?transactionId=...
 * Semak semula status transaksi dengan gerbang pembayaran (untuk halaman invois selepas kembali dari gerbang).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Sila log masuk." }, { status: 401 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;

    const transactionId = req.nextUrl.searchParams.get("transactionId");
    if (!transactionId) {
      return NextResponse.json({ success: false, message: "transactionId diperlukan." }, { status: 400 });
    }

    const transaction = await prisma.paymentTransaction.findUnique({ where: { id: transactionId } });
    if (!transaction) {
      return NextResponse.json({ success: false, message: "Transaksi tidak ditemui." }, { status: 404 });
    }
    if (user.role !== "SUPERADMIN" && transaction.tenantId !== user.tenantId) {
      return NextResponse.json({ success: false, message: "Akses dinafikan." }, { status: 403 });
    }

    const result = await reconcilePendingTransaction(transactionId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[Billing Verify Error]:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Ralat semasa mengesahkan pembayaran." },
      { status: 500 }
    );
  }
}
