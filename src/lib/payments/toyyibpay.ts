/**
 * Penyesuai gerbang pembayaran ToyyibPay (FPX / Kad) untuk Malaysia.
 *
 * Pemboleh ubah persekitaran:
 *  - TOYYIBPAY_SECRET_KEY     : userSecretKey akaun ToyyibPay
 *  - TOYYIBPAY_CATEGORY_CODE  : kod kategori bil
 *  - TOYYIBPAY_BASE_URL       : https://toyyibpay.com (produksi) atau https://dev.toyyibpay.com (sandbox)
 */
export type ToyyibPayChannel = "FPX" | "CARD" | "BOTH";

export interface CreateBillParams {
  billName: string;
  billDescription: string;
  amountMyr: number;
  externalRef: string;
  payerName: string;
  payerEmail: string;
  payerPhone: string;
  returnUrl: string;
  callbackUrl: string;
  channel?: ToyyibPayChannel;
}

export interface ToyyibPayBillTransaction {
  billName?: string;
  billpaymentStatus: string; // "1" berjaya, "2" belum selesai, "3" gagal
  billpaymentAmount: string; // cth "99.00"
  billpaymentInvoiceNo?: string;
  billExternalReferenceNo?: string;
  billpaymentDate?: string;
  billpaymentChannel?: string;
  billTo?: string;
}

export interface ToyyibPayVerification {
  paid: boolean;
  status: "SUCCESS" | "PENDING" | "FAILED" | "UNKNOWN";
  ref?: string;
  amount?: number;
  channel?: string;
}

export function isToyyibPayConfigured(): boolean {
  return !!process.env.TOYYIBPAY_SECRET_KEY && !!process.env.TOYYIBPAY_CATEGORY_CODE;
}

export function getToyyibPayBaseUrl(): string {
  return (process.env.TOYYIBPAY_BASE_URL || "https://toyyibpay.com").replace(/\/+$/, "");
}

function channelCode(channel: ToyyibPayChannel | undefined): string {
  if (channel === "FPX") return "0";
  if (channel === "CARD") return "1";
  return "2";
}

function sanitizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "0000000000";
  if (digits.startsWith("60")) return digits;
  if (digits.startsWith("0")) return `6${digits}`;
  return digits;
}

export async function createToyyibPayBill(
  params: CreateBillParams
): Promise<{ billCode: string; paymentUrl: string }> {
  if (!isToyyibPayConfigured()) {
    throw new Error("ToyyibPay belum dikonfigurasi (TOYYIBPAY_SECRET_KEY / TOYYIBPAY_CATEGORY_CODE).");
  }

  const body = new URLSearchParams({
    userSecretKey: process.env.TOYYIBPAY_SECRET_KEY as string,
    categoryCode: process.env.TOYYIBPAY_CATEGORY_CODE as string,
    billName: params.billName.slice(0, 30),
    billDescription: params.billDescription.slice(0, 100),
    billPriceSetting: "1",
    billPayorInfo: "1",
    billAmount: String(Math.round(params.amountMyr * 100)),
    billReturnUrl: params.returnUrl,
    billCallbackUrl: params.callbackUrl,
    billExternalReferenceNo: params.externalRef,
    billTo: params.payerName.slice(0, 50),
    billEmail: params.payerEmail,
    billPhone: sanitizePhone(params.payerPhone),
    billSplitPayment: "0",
    billSplitPaymentArgs: "",
    billPaymentChannel: channelCode(params.channel),
    billContentEmail: "Terima kasih kerana melanggan QueNombo.",
    billChargeToCustomer: "1",
  });

  const res = await fetch(`${getToyyibPayBaseUrl()}/index.php/api/createBill`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const raw = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Respons ToyyibPay tidak sah: ${raw.slice(0, 200)}`);
  }

  const billCode = Array.isArray(parsed) ? parsed[0]?.BillCode : undefined;
  if (!billCode || typeof billCode !== "string") {
    throw new Error(`ToyyibPay gagal mencipta bil: ${raw.slice(0, 200)}`);
  }

  return { billCode, paymentUrl: `${getToyyibPayBaseUrl()}/${billCode}` };
}

export async function getToyyibPayBillTransactions(billCode: string): Promise<ToyyibPayBillTransaction[]> {
  const body = new URLSearchParams({ billCode });
  const res = await fetch(`${getToyyibPayBaseUrl()}/index.php/api/getBillTransactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const raw = await res.text();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ToyyibPayBillTransaction[]) : [];
  } catch {
    return [];
  }
}

/**
 * Sahkan status pembayaran terus daripada API ToyyibPay (bukan daripada callback
 * yang boleh dipalsukan). Jumlah mesti sepadan dengan transaksi kita.
 */
export async function verifyToyyibPayPayment(
  billCode: string,
  expectedAmountMyr: number
): Promise<ToyyibPayVerification> {
  const transactions = await getToyyibPayBillTransactions(billCode);
  if (transactions.length === 0) {
    return { paid: false, status: "UNKNOWN" };
  }

  const success = transactions.find((t) => String(t.billpaymentStatus) === "1");
  if (success) {
    const amount = Number(success.billpaymentAmount);
    const amountMatches = Math.abs(amount - expectedAmountMyr) < 0.01;
    if (!amountMatches) {
      console.error(
        `[ToyyibPay] Jumlah tidak sepadan untuk bil ${billCode}: dijangka ${expectedAmountMyr}, diterima ${amount}`
      );
      return { paid: false, status: "FAILED", amount, ref: success.billpaymentInvoiceNo };
    }
    return {
      paid: true,
      status: "SUCCESS",
      amount,
      ref: success.billpaymentInvoiceNo,
      channel: success.billpaymentChannel,
    };
  }

  const pending = transactions.some((t) => String(t.billpaymentStatus) === "2");
  if (pending) return { paid: false, status: "PENDING" };

  return { paid: false, status: "FAILED" };
}
