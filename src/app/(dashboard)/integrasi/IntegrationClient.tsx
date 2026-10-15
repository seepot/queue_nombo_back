"use client";

import { useState } from "react";
import { DEFAULT_TEMPLATES, WhatsAppMessageType } from "@/lib/whatsapp";

export default function IntegrationClient({
  tenantId,
  tenantName,
  initialSettings,
  whatsappQuota,
  whatsappUsed,
}: {
  tenantId: string;
  tenantName: string;
  initialSettings: any;
  whatsappQuota: number;
  whatsappUsed: number;
}) {
  const [provider, setProvider] = useState(initialSettings.whatsapp?.provider || "WHATSAPP_CLOUD_API");
  const [apiKey, setApiKey] = useState(initialSettings.whatsapp?.apiKey || "");
  const [phoneNumberId, setPhoneNumberId] = useState(initialSettings.whatsapp?.phoneNumberId || "");
  const [webhookUrl, setWebhookUrl] = useState(initialSettings.webhookUrl || "");

  const [saving, setSaving] = useState(false);
  const [saveAlert, setSaveAlert] = useState<string | null>(null);

  // Test WhatsApp
  const [testPhone, setTestPhone] = useState("0123456789");
  const [testType, setTestType] = useState<WhatsAppMessageType>("TICKET_CREATED");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Template Preview
  const [activeTab, setActiveTab] = useState<WhatsAppMessageType>("TICKET_CREATED");

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveAlert(null);

    try {
      const res = await fetch("/api/whatsapp/save-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          provider,
          apiKey,
          phoneNumberId,
          webhookUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveAlert("✅ Tetapan integrasi berjaya disimpan!");
      } else {
        setSaveAlert(`❌ ${data.message || "Gagal menyimpan tetapan."}`);
      }
    } catch {
      setSaveAlert("❌ Ralat sambungan rangkaian.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/whatsapp/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          phoneNo: testPhone,
          messageType: testType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult(data.message);
      } else {
        setTestResult(`Gagal: ${data.message}`);
      }
    } catch {
      setTestResult("Ralat rangkaian semasa ujian.");
    } finally {
      setTesting(false);
    }
  };

  const quotaPct = whatsappQuota > 0 ? Math.min(100, Math.round((whatsappUsed / whatsappQuota) * 100)) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div>
        <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full uppercase tracking-wider mb-2">
          Integrasi & Gateway WhatsApp
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Konfigurasi WhatsApp Bot & Hab Webhook</h1>
        <p className="text-sm text-gray-500">
          Automasikan amaran giliran terus ke telefon pelanggan dan segerakkan data dengan sistem luaran.
        </p>
      </div>

      {saveAlert && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{saveAlert}</span>
          <button onClick={() => setSaveAlert(null)} className="text-lg leading-none cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Quota Metric Card */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-100">
              Penggunaan Kuota WhatsApp Bulanan ({tenantName})
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl sm:text-4xl font-black font-mono">{whatsappUsed}</span>
              <span className="text-emerald-200 font-bold">/ {whatsappQuota} mesej dihantar</span>
            </div>
          </div>
          <span className="px-3.5 py-1 bg-white/20 rounded-full text-xs font-mono font-bold self-start sm:self-auto">
            {whatsappQuota - whatsappUsed} mesej berbaki
          </span>
        </div>

        <div className="w-full bg-black/20 h-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-300 rounded-full transition-all"
            style={{ width: `${quotaPct}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Gateway Settings Form */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <h2 className="font-bold text-gray-900 text-lg">Konfigurasi Gateway</h2>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Penyedia WhatsApp Gateway
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 bg-white"
              >
                <option value="WHATSAPP_CLOUD_API">Meta WhatsApp Cloud API (Rasmi)</option>
                <option value="WAHA">WAHA / WPPConnect (Self-Hosted)</option>
                <option value="FONNTE">Fonnte WhatsApp Gateway</option>
                <option value="TWILIO">Twilio Programmable Messaging</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                API Token / Access Token
              </label>
              <input
                type="password"
                placeholder="EAAxxxxxxx..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Phone Number ID / Instance ID
              </label>
              <input
                type="text"
                placeholder="104928472910..."
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Webhook Event URL (Sistem Luaran / CRM)
              </label>
              <input
                type="url"
                placeholder="https://crm.anda.com/api/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Sistem akan menghantar payload JSON bagi acara tiket baharu, panggilan, dan selesaikan urusan.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Konfigurasi Integrasi 💾"}
            </button>
          </form>

          {/* Test Message Box */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <h3 className="text-xs font-bold uppercase text-gray-600">Ujian Penghantaran Pantas</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="0123456789"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono"
              />
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as WhatsAppMessageType)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold bg-white"
              >
                <option value="TICKET_CREATED">Tiket Dicipta</option>
                <option value="TICKET_APPROACHING">Amaran Hampir</option>
                <option value="TICKET_CALLED">Panggilan</option>
                <option value="TICKET_COMPLETED">Penarafan CSAT</option>
              </select>
            </div>

            <button
              type="button"
              disabled={testing}
              onClick={handleSendTest}
              className="w-full py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {testing ? "Menghantar..." : "Hantar Mesej WhatsApp Ujian 🚀"}
            </button>

            {testResult && (
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                {testResult}
              </p>
            )}
          </div>
        </div>

        {/* Right: Message Templates & WhatsApp Phone Preview */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Pratonton Templat Mesej</h2>

            {/* Template Selector Tabs */}
            <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-2xl">
              {(
                [
                  ["TICKET_CREATED", "1. Tiket Baru"],
                  ["TICKET_APPROACHING", "2. Amaran Hampir"],
                  ["TICKET_CALLED", "3. Panggilan"],
                  ["TICKET_COMPLETED", "4. Penarafan"],
                ] as const
              ).map(([typeKey, label]) => (
                <button
                  type="button"
                  key={typeKey}
                  onClick={() => setActiveTab(typeKey as WhatsAppMessageType)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === typeKey
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Realistic WhatsApp Chat Bubble Preview */}
            <div className="bg-[#efeae2] p-4 rounded-2xl border border-gray-300 min-h-64 flex flex-col justify-end">
              <div className="max-w-[85%] bg-white rounded-2xl rounded-tl-none p-3.5 shadow-sm text-xs text-gray-800 space-y-2 relative border border-gray-100">
                <p className="whitespace-pre-line leading-relaxed">
                  {DEFAULT_TEMPLATES[activeTab]
                    .replace(/{{name}}/g, "Ahmad Zaki")
                    .replace(/{{ticketNo}}/g, "A1002")
                    .replace(/{{category}}/g, "Pendaftaran & Konsultasi")
                    .replace(/{{branch}}/g, "Klinik QueNombo Demo")
                    .replace(/{{counterNo}}/g, "1")
                    .replace(/{{aheadCount}}/g, "2")
                    .replace(/{{ticketUrl}}/g, "https://app.quenombo.com/ticket/demo")}
                </p>
                <div className="text-[10px] text-gray-400 text-right flex items-center justify-end gap-1">
                  <span>10:42 AM</span>
                  <span className="text-blue-500 font-bold">✓✓</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1">
              <p className="font-bold">Pembolehubah Tersedia:</p>
              <p className="font-mono">
                {"{{name}}"}, {"{{ticketNo}}"}, {"{{category}}"}, {"{{branch}}"},{" "}
                {"{{counterNo}}"}, {"{{aheadCount}}"}, {"{{ticketUrl}}"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
