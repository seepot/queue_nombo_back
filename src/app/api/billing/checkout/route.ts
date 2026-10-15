import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createPaymentTransaction,
  handleSuccessfulPayment,
  calculatePlanAmount,
  isBillingSandboxEnabled,
  isPaymentGatewayConfigured,
  isValidPaidPlan,
  markTransactionFailed,
} from "@/lib/payment-gateway";
import { createToyyibPayBill } from "@/lib/payments/toyyibpay";
import { enforceIpRateLimit } from "@/lib/rate-limit";
import { requireVerifiedEmailForBilling } from "@/lib/email-verification";

/**
 * POST /api/billing/checkout
 * Body: { planType, billingCycle, paymentMethod, autoConfirm? }
 *  - paymentMethod "SANDBOX" (atau autoConfirm) : aktif serta-merta, hanya jika BILLING_SANDBOX_ENABLED
 *  - FPX / CARD / DUITNOW_QR                     : cipta bil ToyyibPay dan pulangkan checkoutUrl untuk ubah hala
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Sila log masuk terlebih dahulu." },
        { status: 401 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const tenantId: string | undefined = user.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Akaun anda tidak dihubungkan dengan mana-mana organisasi / penyewa." },
        { status: 400 }
      );
    }

    if (user.role !== "TENANT_ADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, message: "Hanya Pentadbir Organisasi boleh menguruskan langganan." },
        { status: 403 }
      );
    }

    // Pentadbir organisasi mesti mengesahkan e-mel sebelum membuat pembayaran
    const emailGate = await requireVerifiedEmailForBilling(user);
    if (emailGate) return emailGate;

    const limited = await enforceIpRateLimit(req, "billing-checkout", 10, 60);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const {
      planType = "PRO",
      billingCycle = "MONTHLY",
      paymentMethod = "FPX",
      autoConfirm = false,
    } = body;

    if (!isValidPaidPlan(planType)) {
      return NextResponse.json(
        { success: false, message: "Pelan tidak sah. Pilih STARTER, PRO atau ENTERPRISE." },
        { status: 400 }
      );
    }
    const plan = String(planType).toUpperCase();
    const cycle: "MONTHLY" | "YEARLY" = billingCycle === "YEARLY" ? "YEARLY" : "MONTHLY";
    const amount = calculatePlanAmount(plan, cycle);

    // ------------------------------------------------------------------
    // A. Mod SANDBOX / simulasi (dikawal oleh persekitaran)
    // ------------------------------------------------------------------
    const wantsSandbox = paymentMethod === "SANDBOX" || autoConfirm === true;
    if (wantsSandbox) {
      if (!isBillingSandboxEnabled()) {
        return NextResponse.json(
          { success: false, message: "Mod pembayaran simulasi dimatikan pada persekitaran ini." },
          { status: 403 }
        );
      }

      const transaction = await createPaymentTransaction({
        tenantId,
        planType: plan,
        billingCycle: cycle,
        paymentMethod: "SANDBOX",
        gatewayProvider: "SIMULATOR",
      });

      const processed = await handleSuccessfulPayment({
        transactionId: transaction.id,
        gatewayRef: `SANDBOX-${Date.now()}`,
        paymentMethod: "SANDBOX",
      });

      return NextResponse.json({
        success: true,
        message: `Pembayaran berjaya diproses melalui mod simulasi sandbox! Pelan ${plan} aktif serta-merta.`,
        transaction: processed,
        receiptUrl: `/langganan/invois/${transaction.id}`,
      });
    }

    // ------------------------------------------------------------------
    // B. Gerbang pembayaran sebenar (ToyyibPay: FPX / Kad)
    // ------------------------------------------------------------------
    if (!isPaymentGatewayConfigured()) {
      return NextResponse.json(
        {
          success: false,
          code: "GATEWAY_NOT_CONFIGURED",
          message:
            "Gerbang pembayaran dalam talian belum diaktifkan. Sila hubungi sokongan QueNombo untuk pembayaran manual.",
        },
        { status: 503 }
      );
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ success: false, message: "Organisasi tidak ditemui." }, { status: 404 });
    }

    const method: "FPX" | "CARD" = paymentMethod === "CARD" ? "CARD" : "FPX";
    const transaction = await createPaymentTransaction({
      tenantId,
      planType: plan,
      billingCycle: cycle,
      paymentMethod: method,
      gatewayProvider: "TOYYIBPAY",
    });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/+$/, "");

    try {
      const bill = await createToyyibPayBill({
        billName: `QueNombo ${plan}`,
        billDescription: `Langganan QueNombo pelan ${plan} (${cycle === "YEARLY" ? "Tahunan" : "Bulanan"}) - ${transaction.invoiceNo}`,
        amountMyr: amount,
        externalRef: transaction.invoiceNo,
        payerName: tenant.name,
        payerEmail: tenant.email || user.email || "billing@quenombo.com",
        payerPhone: tenant.phone || "0000000000",
        returnUrl: `${appUrl}/langganan/invois/${transaction.id}`,
        callbackUrl: `${appUrl}/api/billing/webhook`,
        channel: paymentMethod === "CARD" ? "CARD" : paymentMethod === "FPX" ? "FPX" : "BOTH",
      });

      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { billCode: bill.billCode },
      });

      return NextResponse.json({
        success: true,
        message: `Invois ${transaction.invoiceNo} dijana. Anda akan dialihkan ke gerbang pembayaran.`,
        transaction: { ...transaction, billCode: bill.billCode },
        amount,
        checkoutUrl: bill.paymentUrl,
        requiresRedirect: true,
        invoiceUrl: `/langganan/invois/${transaction.id}`,
      });
    } catch (gatewayError) {
      console.error("[Billing Checkout] Gagal mencipta bil ToyyibPay:", gatewayError);
      await markTransactionFailed(transaction.id);
      return NextResponse.json(
        { success: false, message: "Gagal mencipta bil di gerbang pembayaran. Sila cuba semula sebentar lagi." },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("[Billing Checkout Error]:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Ralat pelayan semasa memproses langganan." },
      { status: 500 }
    );
  }
}
