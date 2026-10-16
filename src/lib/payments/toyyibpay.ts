import { createHash } from "node:crypto";

/**
 * Penyesuai gerbang pembayaran ToyyibPay (FPX / Kad) untuk Malaysia.
 * Rujukan: https://toyyibpay.com/apireference/
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
  /** Tempoh sah bil dalam hari (1-100). Lalai 3 hari. */
  expiryDays?: number;
}

/** Satu rekod daripada getBillTransactions (medan mengikut dokumentasi rasmi). */
export interface ToyyibPayBillTransaction {
  billName?: string;
  billDescription?: string;
  billTo?: string;
  billEmail?: string;
  billPhone?: string;
  billStatus?: string;
  billpaymentStatus: string; // "1" berjaya, "2"/"4" belum selesai, "3" gagal
  billpaymentChannel?: string; // cth "FPX", "Credit Card", "DuitNow QR"
  billpaymentAmount: string; // dalam RM, cth "99.00"
  billpaymentInvoiceNo?: string; // cth "TP5793119399122400030321"
  billpaymentSettlement?: string;
  billpaymentSettlementDate?: string;
  SettlementReferenceNo?: string;
  billPaymentDate?: string; // cth "02-03-2021 16:24:25"
  billExternalReferenceNo?: string;
}

export interface ToyyibPayVerification {
  paid: boolean;
  /**
   * SUCCESS  : bayaran disahkan & jumlah sepadan
   * PENDING  : transaksi wujud tetapi belum selesai (status 2/4)
   * FAILED   : semua percubaan gagal (status 3)
   * MISMATCH : bayaran berjaya tetapi jumlah TIDAK sepadan — jangan aktifkan, perlu semakan manual
   * UNKNOWN  : tiada transaksi direkodkan untuk bil ini
   */
  status: "SUCCESS" | "PENDING" | "FAILED" | "MISMATCH" | "UNKNOWN";
  ref?: string;
  amount?: number;
  channel?: string;
}

/**
 * Medan callback (POST form-urlencoded) yang dihantar ToyyibPay ke billCallbackUrl.
 * Status dalam callback TIDAK boleh dipercayai sepenuhnya; sahkan semula melalui API.
 */
export interface ToyyibPayCallbackBody {
  refno?: string;
  status?: string; // "1" berjaya, "2" belum selesai, "3" gagal
  reason?: string;
  billcode?: string;
  order_id?: string; // billExternalReferenceNo kita (invoiceNo)
  amount?: string;
  transaction_time?: string;
  hash?: string; // MD5(userSecretKey + status + order_id + refno + "ok")
  // DuitNow QR sahaja
  status_id?: string;
  msg?: string;
  transaction_id?: string;
  dnqr_transaction_id?: string;
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

/** billName/billDescription hanya menerima aksara alfanumerik, ruang dan "_" mengikut dokumentasi. */
function sanitizeText(text: string, maxLength: number): string {
  return text
    .replace(/[^A-Za-z0-9 _]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

async function postForm(path: string, fields: Record<string, string>): Promise<string> {
  const res = await fetch(`${getToyyibPayBaseUrl()}/index.php/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
  return res.text();
}

export async function createToyyibPayBill(
  params: CreateBillParams
): Promise<{ billCode: string; paymentUrl: string }> {
  if (!isToyyibPayConfigured()) {
    throw new Error("ToyyibPay belum dikonfigurasi (TOYYIBPAY_SECRET_KEY / TOYYIBPAY_CATEGORY_CODE).");
  }

  const expiryDays = Math.min(100, Math.max(1, Math.round(params.expiryDays ?? 3)));

  // Nota: billChargeToCustomer sengaja DIKOSONGKAN supaya caj FPX/kad ditanggung pemilik bil.
  // Dengan itu jumlah yang dibayar pelanggan sentiasa sama dengan jumlah invois kita,
  // dan semakan "jumlah mesti sepadan" semasa pengesahan tidak gagal.
  const raw = await postForm("createBill", {
    userSecretKey: process.env.TOYYIBPAY_SECRET_KEY as string,
    categoryCode: process.env.TOYYIBPAY_CATEGORY_CODE as string,
    billName: sanitizeText(params.billName, 30),
    billDescription: sanitizeText(params.billDescription, 100),
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
    billExpiryDays: String(expiryDays),
  });

  // createBill membalas HTTP 200 untuk kejayaan DAN kegagalan:
  //  - berjaya : [{"BillCode":"gcbhict9"}]
  //  - gagal   : {"status":"error","msg":"..."} atau teks biasa cth [KEY-DID-NOT-EXIST-OR-USER-IS-NOT-ACTIVE]
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`ToyyibPay gagal mencipta bil: ${raw.trim().slice(0, 200)}`);
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const err = parsed as { status?: string; msg?: string };
    throw new Error(`ToyyibPay gagal mencipta bil: ${err.msg || err.status || raw.slice(0, 200)}`);
  }

  const billCode = Array.isArray(parsed) ? parsed[0]?.BillCode : undefined;
  if (!billCode || typeof billCode !== "string") {
    throw new Error(`ToyyibPay gagal mencipta bil: ${raw.slice(0, 200)}`);
  }

  return { billCode, paymentUrl: `${getToyyibPayBaseUrl()}/${billCode}` };
}

/**
 * Senarai transaksi bagi satu bil. userSecretKey disertakan supaya butiran pembayar
 * dipulangkan; tanpa kunci pemilik, API memulangkan medan kosong.
 * API membalas teks biasa "No data found!" jika tiada transaksi -> [].
 */
export async function getToyyibPayBillTransactions(billCode: string): Promise<ToyyibPayBillTransaction[]> {
  const fields: Record<string, string> = { billCode };
  if (process.env.TOYYIBPAY_SECRET_KEY) fields.userSecretKey = process.env.TOYYIBPAY_SECRET_KEY;
  const raw = await postForm("getBillTransactions", fields);
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
      return { paid: false, status: "MISMATCH", amount, ref: success.billpaymentInvoiceNo };
    }
    return {
      paid: true,
      status: "SUCCESS",
      amount,
      ref: success.billpaymentInvoiceNo,
      channel: success.billpaymentChannel,
    };
  }

  const pending = transactions.some((t) => ["2", "4"].includes(String(t.billpaymentStatus)));
  if (pending) return { paid: false, status: "PENDING" };

  return { paid: false, status: "FAILED" };
}

/**
 * Kira hash callback mengikut dokumentasi: MD5(userSecretKey + status + order_id + refno + "ok").
 */
export function computeToyyibPayCallbackHash(
  body: Pick<ToyyibPayCallbackBody, "status" | "order_id" | "refno">,
  secretKey = process.env.TOYYIBPAY_SECRET_KEY || ""
): string {
  return createHash("md5")
    .update(`${secretKey}${body.status ?? ""}${body.order_id ?? ""}${body.refno ?? ""}ok`)
    .digest("hex");
}

/**
 * Sahkan hash callback. Pulangkan:
 *  - "valid"   : hash disertakan dan sepadan
 *  - "invalid" : hash disertakan tetapi tidak sepadan (tolak callback)
 *  - "missing" : tiada hash dalam callback (bergantung sepenuhnya pada pengesahan API)
 */
export function verifyToyyibPayCallbackHash(body: ToyyibPayCallbackBody): "valid" | "invalid" | "missing" {
  if (!body.hash) return "missing";
  if (!process.env.TOYYIBPAY_SECRET_KEY) return "missing";
  const expected = computeToyyibPayCallbackHash(body);
  return expected.toLowerCase() === String(body.hash).toLowerCase() ? "valid" : "invalid";
}
