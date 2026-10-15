"use client";

import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";

interface TransactionDetails {
  id: string;
  invoiceNo: string;
  amount: number;
  currency: string;
  planType: string;
  billingCycle: string;
  paymentMethod: string;
  gatewayProvider: string;
  gatewayRef: string | null;
  status: string;
  paidAt: string | null;
  createdAt: string;
  tenantName: string;
  tenantEmail: string | null;
  tenantPhone: string | null;
}

export default function ReceiptClient({
  transaction,
}: {
  transaction: TransactionDetails;
}) {
  const { language } = useLanguage();

  const handlePrint = () => {
    window.print();
  };

  const isPaid = transaction.status === "SUCCESS";
  const subtotal = transaction.amount;
  const sstAmount = 0.0; // 0% SST untuk langganan perisian asas
  const totalAmount = subtotal + sstAmount;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto font-sans">
      {/* Action Buttons (Hidden when printing) */}
      <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
        <Link
          href="/langganan"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
        >
          ← {language === "en" ? "Back to Billing" : "Kembali ke Pelan Langganan"}
        </Link>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
        >
          <span>🖨️</span> {language === "en" ? "Print Official Receipt (PDF)" : "Cetak Resit Rasmi (PDF)"}
        </button>
      </div>

      {/* Official Receipt Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-8 sm:p-12 space-y-8 relative overflow-hidden print:border-none print:shadow-none print:p-0">
        {/* Paid Watermark Badge */}
        {isPaid && (
          <div className="absolute top-10 right-10 rotate-12 select-none opacity-90 print:opacity-100">
            <div className="border-4 border-emerald-600 text-emerald-600 font-black text-xs sm:text-sm px-4 py-1.5 rounded-xl uppercase tracking-widest text-center shadow-xs">
              ✓ {language === "en" ? "PAID IN FULL" : "TELAH DIBAYAR"}
            </div>
          </div>
        )}

        {/* Receipt Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-gray-100 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                Q
              </span>
              <span className="font-extrabold text-xl text-gray-900 tracking-tight">QueNombo Cloud SaaS</span>
            </div>
            <p className="text-xs text-gray-500 max-w-xs">
              Platform Pengurusan Giliran Pintar & Tempahan Maya Multi-Tenant Awan.
            </p>
            <p className="text-[11px] text-gray-400 mt-1 font-mono">
              SST Reg No: W10-2401-32000491
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {language === "en" ? "OFFICIAL RECEIPT" : "RESIT RASMI"}
            </h1>
            <p className="text-xs font-mono font-bold text-blue-600">
              {transaction.invoiceNo}
            </p>
            <p className="text-xs text-gray-500">
              {language === "en" ? "Date: " : "Tarikh: "}
              {new Date(transaction.paidAt || transaction.createdAt).toLocaleDateString(
                language === "en" ? "en-US" : "ms-MY",
                { year: "numeric", month: "long", day: "numeric" }
              )}
            </p>
          </div>
        </div>

        {/* Customer & Payment Meta Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              {language === "en" ? "Billed To (Organization)" : "Dibilkan Kepada (Organisasi)"}
            </p>
            <p className="text-sm font-black text-gray-900">{transaction.tenantName}</p>
            {transaction.tenantEmail && (
              <p className="text-xs text-gray-600 mt-0.5">{transaction.tenantEmail}</p>
            )}
            {transaction.tenantPhone && (
              <p className="text-xs text-gray-600 font-mono">{transaction.tenantPhone}</p>
            )}
          </div>

          <div className="space-y-1 sm:text-right">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              {language === "en" ? "Payment Details" : "Maklumat Pembayaran"}
            </p>
            <p className="text-xs text-gray-700">
              <span className="font-semibold">{language === "en" ? "Method: " : "Kaedah: "}</span>
              <span className="font-bold text-gray-900 uppercase">{transaction.paymentMethod}</span>
            </p>
            <p className="text-xs text-gray-700">
              <span className="font-semibold">{language === "en" ? "Gateway Provider: " : "Gerbang: "}</span>
              <span className="font-mono text-gray-900">{transaction.gatewayProvider}</span>
            </p>
            {transaction.gatewayRef && (
              <p className="text-xs text-gray-700">
                <span className="font-semibold">{language === "en" ? "Reference No: " : "No. Rujukan: "}</span>
                <span className="font-mono text-blue-600">{transaction.gatewayRef}</span>
              </p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-100 text-gray-600 font-bold uppercase border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">{language === "en" ? "Description" : "Penerangan Urusan"}</th>
                <th className="px-4 py-3 text-center">{language === "en" ? "Billing Cycle" : "Kitaran"}</th>
                <th className="px-4 py-3 text-right">{language === "en" ? "Amount (MYR)" : "Jumlah (RM)"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-4 font-semibold text-gray-900">
                  Pelan Langganan SaaS QueNombo - Pakej {transaction.planType}
                  <div className="text-[11px] text-gray-400 font-normal mt-0.5">
                    {language === "en"
                      ? "Cloud queue management system, real-time counters & smart TV displays."
                      : "Sistem pengurusan giliran awan, terminal kaunter staf & paparan TV pintar."}
                  </div>
                </td>
                <td className="px-4 py-4 text-center font-bold text-gray-700">
                  {transaction.billingCycle === "YEARLY"
                    ? (language === "en" ? "Yearly (12 Months)" : "Tahunan (12 Bulan)")
                    : (language === "en" ? "Monthly" : "Bulanan")}
                </td>
                <td className="px-4 py-4 text-right font-mono font-bold text-gray-900">
                  {transaction.amount.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Calculation Totals */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-t border-gray-200 pt-6 gap-4">
          <div className="text-xs text-gray-400 space-y-1 max-w-sm">
            <p className="font-semibold text-gray-600">Nota Syarat & Terma:</p>
            <p>
              Resit ini dijana secara elektronik oleh platform QueNombo dan sah tanpa tandatangan fizikal. Sila simpan resit ini untuk tujuan perakaunan.
            </p>
          </div>

          <div className="w-full sm:w-64 space-y-2 text-xs text-right">
            <div className="flex justify-between text-gray-600">
              <span>{language === "en" ? "Subtotal:" : "Jumlah Kecil:"}</span>
              <span className="font-mono font-semibold">RM {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>SST (0%):</span>
              <span className="font-mono font-semibold">RM {sstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-gray-900 border-t border-gray-200 pt-2">
              <span>{language === "en" ? "Total Paid:" : "Jumlah Dibayar:"}</span>
              <span className="font-mono text-blue-600">RM {totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center border-t border-gray-100 pt-6 text-[11px] text-gray-400">
          <p>Terima kasih kerana memilih QueNombo Cloud SaaS sebagai penyelesaian pengurusan giliran organisasi anda.</p>
          <p className="mt-0.5">Sokongan Pelanggan: support@quenombo.com • www.quenombo.com</p>
        </div>
      </div>
    </div>
  );
}
