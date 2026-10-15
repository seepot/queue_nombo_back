"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";

interface SubscriptionInfo {
  planType: string;
  status: string;
  billingCycle: string;
  startDate: string;
  endDate: string | null;
  maxBranches: number;
  maxCounters: number;
  maxDisplays: number;
  whatsappQuota: number;
}

interface QuotaUsage {
  usedBranches: number;
  usedCounters: number;
  usedDisplays: number;
}

interface InvoiceRecord {
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
  createdAt: string;
}

export default function BillingClient({
  subscription,
  usage,
  tenantName,
}: {
  subscription: SubscriptionInfo;
  usage: QuotaUsage;
  tenantName: string;
}) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"PLANS" | "INVOICES">("PLANS");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"FPX" | "CARD" | "DUITNOW_QR" | "SANDBOX">("FPX");
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Invoices state
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const res = await fetch("/api/billing/invoices");
      const data = await res.json();
      if (data.success && data.data) {
        setInvoices(data.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    if (activeTab === "INVOICES") {
      fetchInvoices();
    }
  }, [activeTab]);

  const handleOpenCheckoutModal = (planType: string) => {
    setSelectedPlanForModal(planType);
    setFeedbackMessage(null);
  };

  const handleProcessPayment = async () => {
    if (!selectedPlanForModal) return;
    setLoadingPayment(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: selectedPlanForModal,
          billingCycle,
          paymentMethod,
          autoConfirm: paymentMethod === "SANDBOX",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedbackMessage({ type: "success", text: data.message });
        setSelectedPlanForModal(null);
        router.refresh();
        if (data.receiptUrl) {
          setTimeout(() => {
            router.push(data.receiptUrl);
          }, 1000);
        }
      } else {
        setFeedbackMessage({
          type: "error",
          text: data.message || (language === "en" ? "Payment failed." : "Pembayaran gagal diproses."),
        });
      }
    } catch {
      setFeedbackMessage({
        type: "error",
        text: language === "en" ? "Network connection error." : "Ralat sambungan rangkaian.",
      });
    } finally {
      setLoadingPayment(false);
    }
  };

  const daysRemaining = subscription.endDate
    ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-extrabold rounded-full uppercase tracking-wider mb-2">
            {t("navBilling")}
          </span>
          <h1 className="text-2xl font-bold text-gray-900">
            {language === "en" ? `Subscription Plans & Invoices (${tenantName})` : `Pelan Langganan & Invois (${tenantName})`}
          </h1>
          <p className="text-sm text-gray-500">
            {language === "en"
              ? "Manage SaaS quotas, payment channels (FPX / Card), and official printable tax receipts."
              : "Urus pelan langganan SaaS, saluran bayaran automatik (FPX / Kad), dan cetakan resit rasmi."}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("PLANS")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "PLANS" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {language === "en" ? "Pricing Plans" : "Pilihan Pelan"}
          </button>
          <button
            onClick={() => setActiveTab("INVOICES")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "INVOICES" ? "bg-white text-blue-600 shadow-xs" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span>📜</span>
            <span>{language === "en" ? "Invoices & Receipts" : "Sejarah Invois & Resit"}</span>
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between animate-in fade-in ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="font-bold text-lg leading-none cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-mono font-bold rounded-full uppercase tracking-wider">
              {subscription.status === "TRIAL"
                ? (language === "en" ? "Free Trial (14-Day)" : "Percubaan Percuma (14-Hari)")
                : (language === "en" ? "Active Subscription" : "Langganan Aktif")}
            </span>
            <span className="text-xs text-slate-400">
              {language === "en" ? "Cycle: " : "Kitaran: "}
              {subscription.billingCycle === "YEARLY" ? (language === "en" ? "Yearly" : "Tahunan") : (language === "en" ? "Monthly" : "Bulanan")}
            </span>
          </div>
          <h2 className="text-3xl font-black mt-2 text-white tracking-tight">
            {language === "en" ? "Plan " : "Pelan "}{subscription.planType}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {subscription.endDate
              ? (language === "en"
                  ? `Active until ${new Date(subscription.endDate).toLocaleDateString("en-US")} (${daysRemaining} days left)`
                  : `Aktif sehingga ${new Date(subscription.endDate).toLocaleDateString("ms-MY")} (${daysRemaining} hari lagi)`)
              : (language === "en" ? "No expiration date" : "Tiada had tarikh")}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">{language === "en" ? "Branches" : "Cawangan"}</p>
            <p className="text-lg font-black text-blue-400">
              {usage.usedBranches} / {subscription.maxBranches}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">{language === "en" ? "Counters" : "Kaunter"}</p>
            <p className="text-lg font-black text-emerald-400">
              {usage.usedCounters} / {subscription.maxCounters}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">{language === "en" ? "TV Screens" : "Skrin TV"}</p>
            <p className="text-lg font-black text-purple-400">
              {usage.usedDisplays} / {subscription.maxDisplays >= 99 ? "∞" : subscription.maxDisplays}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase font-semibold">WhatsApp</p>
            <p className="text-lg font-black text-amber-400">
              0 / {subscription.whatsappQuota}
            </p>
          </div>
        </div>
      </div>

      {activeTab === "PLANS" ? (
        /* Pricing Comparison Section */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{language === "en" ? "Select Plan & Pay" : "Pilih Pelan & Bayar"}</h2>
              <p className="text-xs text-gray-500">
                {language === "en"
                  ? "Scale your branches, counters, and AI features with automatic FPX/Card activation."
                  : "Tingkatkan kapasiti cawangan dan kaunter dengan pengaktifan automatik melalui FPX/Kad."}
              </p>
            </div>

            {/* Billing Cycle Switcher */}
            <div className="bg-gray-100 p-1 rounded-xl flex items-center self-start">
              <button
                onClick={() => setBillingCycle("MONTHLY")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === "MONTHLY" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {language === "en" ? "Monthly" : "Bulanan"}
              </button>
              <button
                onClick={() => setBillingCycle("YEARLY")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  billingCycle === "YEARLY" ? "bg-white text-blue-600 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>{language === "en" ? "Yearly" : "Tahunan"}</span>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded-full">
                  {language === "en" ? "Save 20%" : "Jimat 20%"}
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Starter Plan */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{language === "en" ? "Starter" : "Permulaan"}</span>
                <h3 className="text-xl font-black text-gray-900 mt-1">STARTER</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {language === "en" ? "Ideal for single-branch clinics and retail shops." : "Sesuai untuk klinik, farmasi, atau cawangan runcit tunggal."}
                </p>

                <div className="my-6">
                  <span className="text-4xl font-black text-gray-900">
                    RM {billingCycle === "YEARLY" ? "79" : "99"}
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">{language === "en" ? "/month" : "/bulan"}</span>
                  {billingCycle === "YEARLY" && (
                    <p className="text-[11px] text-blue-600 font-bold mt-1">Dibilkan RM 948 setahun</p>
                  )}
                </div>

                <ul className="space-y-3 text-xs text-gray-700">
                  <li className="flex items-center gap-2"><span>✓</span> <strong>1 {language === "en" ? "Branch" : "Cawangan"}</strong></li>
                  <li className="flex items-center gap-2"><span>✓</span> <strong>4 {language === "en" ? "Counters" : "Kaunter"}</strong></li>
                  <li className="flex items-center gap-2"><span>✓</span> <strong>2 {language === "en" ? "TV Screens" : "Skrin TV"}</strong></li>
                  <li className="flex items-center gap-2"><span>✓</span> 200 {language === "en" ? "WhatsApp Alerts / mo" : "Mesej WhatsApp / bln"}</li>
                  <li className="flex items-center gap-2"><span>✓</span> {language === "en" ? "A4 QR Posters & Kiosk" : "Cetakan Poster QR & Kiosk"}</li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenCheckoutModal("STARTER")}
                className="mt-8 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {subscription.planType === "STARTER"
                  ? (language === "en" ? "Renew Starter" : "Perbaharui Starter")
                  : (language === "en" ? "Select Starter ➔" : "Langgan Starter ➔")}
              </button>
            </div>

            {/* 2. Pro Plan */}
            <div className="bg-white rounded-3xl p-6 border-2 border-blue-500 shadow-xl flex flex-col justify-between relative">
              <span className="absolute -top-3.5 right-6 px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-md">
                {language === "en" ? "MOST POPULAR" : "PALING POPULAR"}
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{language === "en" ? "Professional" : "Profesional"}</span>
                <h3 className="text-xl font-black text-gray-900 mt-1">PRO</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {language === "en" ? "Multi-branch companies and public agency departments." : "Sesuai untuk agensi berbilang cawangan dan pusat servis aktif."}</p>

                <div className="my-6">
                  <span className="text-4xl font-black text-gray-900">
                    RM {billingCycle === "YEARLY" ? "199" : "249"}
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">{language === "en" ? "/month" : "/bulan"}</span>
                  {billingCycle === "YEARLY" && (
                    <p className="text-[11px] text-blue-600 font-bold mt-1">Dibilkan RM 2,388 setahun</p>
                  )}
                </div>

                <ul className="space-y-3 text-xs text-gray-700">
                  <li className="flex items-center gap-2"><span>✓</span> <strong>5 {language === "en" ? "Branches" : "Cawangan"}</strong></li>
                  <li className="flex items-center gap-2"><span>✓</span> <strong>20 {language === "en" ? "Counters" : "Kaunter"}</strong></li>
                  <li className="flex items-center gap-2"><span>✓</span> <strong>{language === "en" ? "Unlimited TV Screens" : "Skrin TV Tanpa Had"}</strong></li>
                  <li className="flex items-center gap-2"><span>✓</span> 1,000 {language === "en" ? "WhatsApp Alerts / mo" : "Mesej WhatsApp / bln"}</li>
                  <li className="flex items-center gap-2"><span>✓</span> <strong>{language === "en" ? "AI Optima Queue Engine" : "AI Optima Queue Engine"}</strong></li>
                  <li className="flex items-center gap-2"><span>✓</span> {language === "en" ? "CSAT Star Ratings & Analytics" : "Maklum Balas CSAT & Analisis SLA"}</li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenCheckoutModal("PRO")}
                className="mt-8 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                {subscription.planType === "PRO"
                  ? (language === "en" ? "Renew Pro" : "Perbaharui Pro")
                  : (language === "en" ? "Upgrade to Pro 🚀" : "Naik Taraf ke Pro 🚀")}
              </button>
            </div>

            {/* 3. Enterprise Plan */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600">{language === "en" ? "Enterprise" : "Korporat & Kerajaan"}</span>
                <h3 className="text-xl font-black text-gray-900 mt-1">ENTERPRISE</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {language === "en" ? "Nationwide branch deployments and custom SLA compliance." : "Pusat khidmat pelanggan nasional berskala mega."}
                </p>

                <div className="my-6">
                  <span className="text-4xl font-black text-gray-900">
                    RM {billingCycle === "YEARLY" ? "599" : "699"}
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">{language === "en" ? "/month" : "/bulan"}</span>
                  {billingCycle === "YEARLY" && (
                    <p className="text-[11px] text-purple-600 font-bold mt-1">Dibilkan RM 7,188 setahun</p>
                  )}
                </div>

                <ul className="space-y-3 text-xs text-gray-700">
                  <li className="flex items-center gap-2"><span>✓</span> <strong>{language === "en" ? "Unlimited Branches" : "Cawangan Tanpa Had"}</strong></li>
                  <li className="flex items-center gap-2"><span>✓</span> <strong>{language === "en" ? "Unlimited Counters" : "Kaunter Tanpa Had"}</strong></li>
                  <li className="flex items-center gap-2"><span>✓</span> 5,000+ {language === "en" ? "WhatsApp Alerts / mo" : "Mesej WhatsApp / bln"}</li>
                  <li className="flex items-center gap-2"><span>✓</span> {language === "en" ? "Dedicated Webhook Integrations" : "Hab Integrasi Webhook Khas"}</li>
                  <li className="flex items-center gap-2"><span>✓</span> {language === "en" ? "24/7 SLA Priority Support" : "SLA Sokongan 24/7 Terpantas"}</li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenCheckoutModal("ENTERPRISE")}
                className="mt-8 w-full py-3 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {subscription.planType === "ENTERPRISE"
                  ? (language === "en" ? "Renew Enterprise" : "Perbaharui Enterprise")
                  : (language === "en" ? "Choose Enterprise ➔" : "Pilih Enterprise ➔")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Invoices & Receipts History Tab */
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {language === "en" ? "Invoices & Payment Receipts History" : "Sejarah Invois & Resit Pembayaran"}
              </h2>
              <p className="text-xs text-gray-500">
                {language === "en" ? "View and print official receipts for tax and audit purposes." : "Lihat dan cetak resit rasmi untuk tujuan cukai dan perakaunan."}
              </p>
            </div>

            <button
              onClick={fetchInvoices}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 rounded-xl transition cursor-pointer"
            >
              🔄 {language === "en" ? "Refresh" : "Muat Semula"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3.5">{language === "en" ? "Invoice No" : "No. Invois"}</th>
                  <th className="px-6 py-3.5">{language === "en" ? "Plan & Cycle" : "Pelan & Kitaran"}</th>
                  <th className="px-6 py-3.5">{language === "en" ? "Amount (MYR)" : "Jumlah (RM)"}</th>
                  <th className="px-6 py-3.5">{language === "en" ? "Method" : "Kaedah"}</th>
                  <th className="px-6 py-3.5">{t("status")}</th>
                  <th className="px-6 py-3.5">{language === "en" ? "Date" : "Tarikh"}</th>
                  <th className="px-6 py-3.5 text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingInvoices ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-xs text-gray-400">
                      {t("loading")}
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-xs text-gray-400">
                      {language === "en" ? "No invoice records found yet." : "Belum ada rekod invois bayaran."}
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-mono font-bold text-gray-900">{inv.invoiceNo}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">{inv.planType}</span>
                        <span className="text-gray-400 text-[11px] block">{inv.billingCycle}</span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">RM {Number(inv.amount).toFixed(2)}</td>
                      <td className="px-6 py-4 font-semibold uppercase text-gray-700">{inv.paymentMethod}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            inv.status === "SUCCESS"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {inv.status === "SUCCESS" ? (language === "en" ? "PAID" : "DIBAYAR") : inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(inv.createdAt).toLocaleDateString(language === "en" ? "en-US" : "ms-MY")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/langganan/invois/${inv.id}`}
                          target="_blank"
                          className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg transition"
                        >
                          {language === "en" ? "View Receipt ↗" : "Papar Resit ↗"}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Checkout & Payment Gateway Modal */}
      {selectedPlanForModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 font-sans">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-600">
                {language === "en" ? "Secure SaaS Checkout" : "Pusat Pembayaran Selamat"}
              </span>
              <h3 className="text-xl font-black text-gray-900 mt-1">
                {language === "en" ? `Subscribe to ${selectedPlanForModal} Plan` : `Langganan Pelan ${selectedPlanForModal}`}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {language === "en"
                  ? `Billing cycle: ${billingCycle === "YEARLY" ? "Yearly (12 Months - Save 20%)" : "Monthly"}`
                  : `Kitaran bil: ${billingCycle === "YEARLY" ? "Tahunan (12 Bulan - Jimat 20%)" : "Bulanan"}`}
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700 uppercase">
                {language === "en" ? "Select Payment Channel" : "Pilih Saluran Pembayaran"}
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                {/* 1. FPX */}
                <div
                  onClick={() => setPaymentMethod("FPX")}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                    paymentMethod === "FPX"
                      ? "border-blue-600 bg-blue-50/40"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🏦</span>
                    <div>
                      <p className="text-xs font-bold text-gray-900">FPX Online Banking</p>
                      <p className="text-[11px] text-gray-500">Maybank2u, CIMB, Bank Islam, RHB, dsb.</p>
                    </div>
                  </div>
                  <input type="radio" checked={paymentMethod === "FPX"} onChange={() => setPaymentMethod("FPX")} />
                </div>

                {/* 2. Card */}
                <div
                  onClick={() => setPaymentMethod("CARD")}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                    paymentMethod === "CARD"
                      ? "border-blue-600 bg-blue-50/40"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💳</span>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Credit / Debit Card</p>
                      <p className="text-[11px] text-gray-500">Visa & Mastercard (Stripe)</p>
                    </div>
                  </div>
                  <input type="radio" checked={paymentMethod === "CARD"} onChange={() => setPaymentMethod("CARD")} />
                </div>

                {/* 3. DuitNow QR */}
                <div
                  onClick={() => setPaymentMethod("DUITNOW_QR")}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                    paymentMethod === "DUITNOW_QR"
                      ? "border-blue-600 bg-blue-50/40"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📱</span>
                    <div>
                      <p className="text-xs font-bold text-gray-900">DuitNow QR Code</p>
                      <p className="text-[11px] text-gray-500">Imbas melalui Touch &apos;n Go / Bank App</p>
                    </div>
                  </div>
                  <input type="radio" checked={paymentMethod === "DUITNOW_QR"} onChange={() => setPaymentMethod("DUITNOW_QR")} />
                </div>

                {/* 4. Sandbox Test Mode */}
                <div
                  onClick={() => setPaymentMethod("SANDBOX")}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                    paymentMethod === "SANDBOX"
                      ? "border-purple-600 bg-purple-50/40"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">⚡</span>
                    <div>
                      <p className="text-xs font-bold text-purple-900">Sandbox Simulator (Demo)</p>
                      <p className="text-[11px] text-purple-600">Pengaktifan kuota segera tanpa potongan wang sebenar</p>
                    </div>
                  </div>
                  <input type="radio" checked={paymentMethod === "SANDBOX"} onChange={() => setPaymentMethod("SANDBOX")} />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlanForModal(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={loadingPayment}
                className="flex-2 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {loadingPayment ? t("loading") : (language === "en" ? "Proceed to Payment ➔" : "Teruskan Bayaran ➔")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
