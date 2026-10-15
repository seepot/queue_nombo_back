import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPaymentTransaction, handleSuccessfulPayment, calculatePlanAmount } from "@/lib/payment-gateway";

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
    const tenantId = user.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Akaun anda tidak dihubungkan dengan mana-mana organisasi / penyewa." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      planType = "PRO",
      billingCycle = "MONTHLY",
      paymentMethod = "FPX",
      gatewayProvider = "SIMULATOR",
      autoConfirm = false, // Jika mod sandbox atau bayaran simulasi
    } = body;

    // 1. Cipta Transaksi Pembayaran Rasmi & Nombor Invois
    const transaction = await createPaymentTransaction({
      tenantId,
      planType,
      billingCycle: billingCycle === "YEARLY" ? "YEARLY" : "MONTHLY",
      paymentMethod,
      gatewayProvider: autoConfirm ? "SIMULATOR" : gatewayProvider,
    });

    // 2. Jika autoConfirm (cth: Sandbox Test Mode / Direct instant activation)
    if (autoConfirm || paymentMethod === "SANDBOX") {
      const processed = await handleSuccessfulPayment({
        transactionId: transaction.id,
        gatewayRef: `SANDBOX-${Date.now()}`,
        paymentMethod: paymentMethod || "SANDBOX",
      });

      return NextResponse.json({
        success: true,
        message: `Pembayaran berjaya diproses melalui mod simulasi sandbox! Pelan ${planType} aktif serta-merta.`,
        transaction: processed,
        receiptUrl: `/langganan/invois/${transaction.id}`,
      });
    }

    // 3. Jika bayaran melalui Gerbang Pembayaran Sebenar (FPX / Stripe)
    const amount = calculatePlanAmount(planType, billingCycle);
    const checkoutUrl = `/langganan/invois/${transaction.id}?gateway=pending`;

    return NextResponse.json({
      success: true,
      message: `Sesi pembayaran FPX/Kad dijana dengan nombor invois: ${transaction.invoiceNo}`,
      transaction,
      amount,
      checkoutUrl,
    });
  } catch (error: any) {
    console.error("[Billing Checkout Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Ralat pelayan semasa memproses langganan." },
      { status: 500 }
    );
  }
}
