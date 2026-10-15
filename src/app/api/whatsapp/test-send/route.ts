import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppNotification, WhatsAppMessageType } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, phoneNo, messageType } = body;

    if (!tenantId || !phoneNo) {
      return NextResponse.json(
        { success: false, message: "tenantId dan nombor telefon diperlukan." },
        { status: 400 }
      );
    }

    const type: WhatsAppMessageType = messageType || "TICKET_CREATED";

    const result = await sendWhatsAppNotification({
      tenantId,
      phoneNo,
      type,
      variables: {
        customerName: "Ahmad Zaki (Ujian)",
        ticketNo: "A1001",
        categoryName: "Pendaftaran & Konsultasi",
        branchName: "Cawangan Utama Demo",
        counterNo: "1",
        aheadCount: 2,
        ticketUrl: "http://localhost:3000/ticket/demo-ticket-id",
      },
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Mesej WhatsApp ujian jenis [${type}] berjaya dihantar ke ${phoneNo}!`,
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.error || "Gagal menghantar mesej ujian." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[WhatsApp Test Send Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa ujian penghantaran WhatsApp." },
      { status: 500 }
    );
  }
}
