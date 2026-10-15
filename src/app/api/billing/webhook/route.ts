import { NextRequest, NextResponse } from "next/server";
import { handleSuccessfulPayment } from "@/lib/payment-gateway";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      transactionId,
      invoiceNo,
      status,
      gatewayRef,
      paymentMethod,
      signature,
    } = body;

    // Cari transaksi sama ada melalui transactionId atau invoiceNo
    let transaction = null;
    if (transactionId) {
      transaction = await prisma.paymentTransaction.findUnique({
        where: { id: transactionId },
      });
    } else if (invoiceNo) {
      transaction = await prisma.paymentTransaction.findUnique({
        where: { invoiceNo },
      });
    }

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Rekod transaksi tidak ditemui." },
        { status: 404 }
      );
    }

    if (status === "SUCCESS" || status === "PAID" || status === "1") {
      const updated = await handleSuccessfulPayment({
        transactionId: transaction.id,
        gatewayRef: gatewayRef || `GW-${Date.now()}`,
        paymentMethod: paymentMethod || transaction.paymentMethod,
      });

      return NextResponse.json({
        success: true,
        message: `Webhook berjaya diproses. Pelan ${updated.planType} telah diaktifkan secara automatik.`,
        transactionId: updated.id,
        status: updated.status,
      });
    } else {
      // Jika pembayaran gagal
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED", gatewayRef: gatewayRef || null },
      });

      return NextResponse.json({
        success: true,
        message: "Status transaksi dikemas kini kepada FAILED mengikut notifikasi webhook.",
      });
    }
  } catch (error: any) {
    console.error("[Payment Webhook Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Ralat semasa memproses webhook pembayaran." },
      { status: 500 }
    );
  }
}
