import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  channelToPaymentMethod,
  handleSuccessfulPayment,
  markTransactionFailed,
} from "@/lib/payment-gateway";
import { verifyToyyibPayPayment } from "@/lib/payments/toyyibpay";

type WebhookBody = Record<string, string>;

async function parseBody(req: NextRequest): Promise<WebhookBody> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await req.json().catch(() => ({}));
    return Object.fromEntries(Object.entries(json || {}).map(([k, v]) => [k, String(v ?? "")]));
  }
  const text = await req.text();
  const params = new URLSearchParams(text);
  return Object.fromEntries(params.entries());
}

/**
 * POST /api/billing/webhook
 *
 * 1) Callback ToyyibPay (form-urlencoded: refno, status, billcode, order_id, amount, transaction_id)
 *    Status dalam callback TIDAK dipercayai: pembayaran disahkan semula melalui API getBillTransactions.
 * 2) Webhook generik / simulasi (JSON: transactionId | invoiceNo, status, gatewayRef)
 *    Wajib header "x-billing-secret" = BILLING_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req);

    // ------------------------------------------------------------------
    // 1. Callback ToyyibPay
    // ------------------------------------------------------------------
    if (body.billcode) {
      const billCode = body.billcode;
      let transaction = await prisma.paymentTransaction.findFirst({ where: { billCode } });
      if (!transaction && body.order_id) {
        transaction = await prisma.paymentTransaction.findUnique({ where: { invoiceNo: body.order_id } });
      }
      if (!transaction) {
        return NextResponse.json({ success: false, message: "Rekod transaksi tidak ditemui." }, { status: 404 });
      }
      if (transaction.status === "SUCCESS") {
        return NextResponse.json({ success: true, message: "Transaksi sudah diproses.", status: "SUCCESS" });
      }

      const verification = await verifyToyyibPayPayment(billCode, Number(transaction.amount));

      if (verification.paid) {
        const updated = await handleSuccessfulPayment({
          transactionId: transaction.id,
          gatewayRef: verification.ref || body.refno || body.transaction_id || `TOYYIB-${Date.now()}`,
          paymentMethod: channelToPaymentMethod(verification.channel, transaction.paymentMethod),
        });
        return NextResponse.json({
          success: true,
          message: `Pembayaran ToyyibPay disahkan. Pelan ${updated.planType} diaktifkan.`,
          transactionId: updated.id,
          status: "SUCCESS",
        });
      }

      if (verification.status === "FAILED" || body.status === "3") {
        await markTransactionFailed(transaction.id, body.refno || null);
        return NextResponse.json({ success: true, message: "Transaksi ditanda GAGAL.", status: "FAILED" });
      }

      return NextResponse.json(
        { success: true, message: "Pembayaran belum disahkan oleh gerbang. Akan disemak semula.", status: "PENDING" },
        { status: 202 }
      );
    }

    // ------------------------------------------------------------------
    // 2. Webhook generik / simulasi (dilindungi rahsia)
    // ------------------------------------------------------------------
    const secret = process.env.BILLING_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json(
        { success: false, message: "BILLING_WEBHOOK_SECRET belum dikonfigurasi pada pelayan." },
        { status: 503 }
      );
    }
    if (req.headers.get("x-billing-secret") !== secret) {
      return NextResponse.json({ success: false, message: "Tandatangan webhook tidak sah." }, { status: 401 });
    }

    const { transactionId, invoiceNo, status, gatewayRef, paymentMethod } = body;

    let transaction = null;
    if (transactionId) {
      transaction = await prisma.paymentTransaction.findUnique({ where: { id: transactionId } });
    } else if (invoiceNo) {
      transaction = await prisma.paymentTransaction.findUnique({ where: { invoiceNo } });
    }

    if (!transaction) {
      return NextResponse.json({ success: false, message: "Rekod transaksi tidak ditemui." }, { status: 404 });
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
    }

    await markTransactionFailed(transaction.id, gatewayRef || null);
    return NextResponse.json({
      success: true,
      message: "Status transaksi dikemas kini kepada FAILED mengikut notifikasi webhook.",
      status: "FAILED",
    });
  } catch (error) {
    console.error("[Payment Webhook Error]:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Ralat semasa memproses webhook pembayaran." },
      { status: 500 }
    );
  }
}
