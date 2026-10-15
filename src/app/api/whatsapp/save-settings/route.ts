import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJsonObject, type TenantSettings } from "@/lib/settings";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, provider, apiKey, phoneNumberId, webhookUrl } = body;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "tenantId diperlukan." },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Tenant tidak ditemui." },
        { status: 404 }
      );
    }

    const currentSettings = readJsonObject<TenantSettings>(tenant.settings);

    const updatedSettings = {
      ...currentSettings,
      whatsapp: {
        provider: provider || "WHATSAPP_CLOUD_API",
        apiKey: apiKey || "",
        phoneNumberId: phoneNumberId || "",
      },
      webhookUrl: webhookUrl || "",
    };

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings },
    });

    return NextResponse.json({
      success: true,
      message: "Tetapan WhatsApp Gateway & Webhook berjaya dikemas kini!",
    });
  } catch (error) {
    console.error("[Save WhatsApp Settings Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa menyimpan tetapan." },
      { status: 500 }
    );
  }
}
