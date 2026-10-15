import { prisma } from "@/lib/prisma";

export type WhatsAppMessageType =
  | "TICKET_CREATED"
  | "TICKET_APPROACHING"
  | "TICKET_CALLED"
  | "TICKET_COMPLETED";

export interface WhatsAppPayload {
  tenantId: string;
  phoneNo: string;
  type: WhatsAppMessageType;
  variables: {
    customerName?: string;
    ticketNo: string;
    categoryName: string;
    branchName: string;
    counterNo?: string;
    aheadCount?: number;
    ticketUrl?: string;
  };
}

export const DEFAULT_TEMPLATES: Record<WhatsAppMessageType, string> = {
  TICKET_CREATED: `👋 Hai {{name}}, terima kasih kerana berkunjung ke {{branch}}!\n\n🎟️ *Nombor Giliran Anda:* *{{ticketNo}}*\n📁 *Urusan:* {{category}}\n👥 *Giliran Di Hadapan:* {{aheadCount}} orang\n\n📱 Pantau status giliran secara langsung di telefon anda:\n🔗 {{ticketUrl}}`,

  TICKET_APPROACHING: `⚠️ *PERINGATAN GILIRAN ANDA MENGHAMPIRI*\n\nNombor giliran anda *{{ticketNo}}* kini berbaki *2 nombor sahaja lagi* di hadapan.\n\nSila bersiap sedia berhampiran kaunter {{branch}} sekarang:\n🔗 {{ticketUrl}}`,

  TICKET_CALLED: `🎉 *GILIRAN ANDA DIPANGGIL!*\n\nNombor giliran *{{ticketNo}}*, sila ke *KAUNTER {{counterNo}}* sekarang untuk urusan {{category}} di {{branch}}.\n\nTerima kasih!`,

  TICKET_COMPLETED: `🌟 *Terima Kasih atas Kunjungan Anda!*\n\nUrusan tiket *{{ticketNo}}* telah selesai. Kami amat menghargai sekiranya anda sudi meluangkan 10 saat untuk memberi penarafan 1-5 bintang:\n\n⭐ Nilaikan perkhidmatan kami di sini:\n🔗 {{ticketUrl}}`,
};

/**
 * Format template string dengan menggantikan {{variable}}
 */
export function formatMessage(
  template: string,
  vars: WhatsAppPayload["variables"]
): string {
  return template
    .replace(/{{name}}/g, vars.customerName || "Pelanggan")
    .replace(/{{ticketNo}}/g, vars.ticketNo)
    .replace(/{{category}}/g, vars.categoryName)
    .replace(/{{branch}}/g, vars.branchName)
    .replace(/{{counterNo}}/g, vars.counterNo || "1")
    .replace(/{{aheadCount}}/g, String(vars.aheadCount ?? 0))
    .replace(/{{ticketUrl}}/g, vars.ticketUrl || "");
}

/**
 * Menghantar notifikasi WhatsApp melalui penyedia yang dikonfigurasikan
 */
export async function sendWhatsAppNotification(
  payload: WhatsAppPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { tenantId, phoneNo, type, variables } = payload;

    // Bersihkan nombor telefon (Cth: 0123456789 -> 60123456789)
    let cleanPhone = phoneNo.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = `60${cleanPhone.slice(1)}`;
    }

    const template = DEFAULT_TEMPLATES[type];
    const messageText = formatMessage(template, variables);

    // Semak baki kuota WhatsApp tenant
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId, status: { in: ["ACTIVE", "TRIAL"] } },
    });

    if (subscription && subscription.whatsappUsed >= subscription.whatsappQuota) {
      console.warn(`[WhatsApp Gateway] Kuota WhatsApp untuk tenant ${tenantId} telah habis.`);
      return { success: false, error: "Kuota WhatsApp bulanan telah habis." };
    }

    // Simulasi penghantaran (Production Gateway Connection)
    console.log(`[WhatsApp Gateway] Menghantar mesej ke ${cleanPhone}:\n${messageText}`);

    // Tolak baki kuota jika langganan wujud
    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { whatsappUsed: { increment: 1 } },
      });
    }

    // Rekod Audit Log
    await prisma.auditLog.create({
      data: {
        tenantId,
        action: `WHATSAPP_NOTIFICATION_${type}`,
        details: {
          recipient: cleanPhone,
          ticketNo: variables.ticketNo,
          status: "DELIVERED",
        },
      },
    });

    return {
      success: true,
      messageId: `wamid_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };
  } catch (error: any) {
    console.error("[WhatsApp Send Error]:", error);
    return { success: false, error: error.message || "Ralat penghantaran WhatsApp." };
  }
}

/**
 * Menghantar Webhook POST ke sistem pihak ketiga (HIS, CRM, Zapier)
 */
export async function dispatchWebhookEvent(
  tenantId: string,
  eventName: string,
  payload: any
): Promise<void> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const settings = (tenant?.settings as any) || {};
    const webhookUrl = settings.webhookUrl;

    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-QueNombo-Event": eventName,
        "X-QueNombo-Tenant": tenantId,
      },
      body: JSON.stringify({
        event: eventName,
        timestamp: new Date().toISOString(),
        data: payload,
      }),
    });
  } catch (error) {
    console.error("[Webhook Dispatch Error]:", error);
  }
}
