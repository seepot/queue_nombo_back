import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppNotification, WhatsAppMessageType } from "@/lib/whatsapp";
import { auth } from "@/lib/auth";
import { enforceIpRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;
    if (!user || !["SUPERADMIN", "TENANT_ADMIN", "BRANCH_MANAGER"].includes(user.role)) {
      return NextResponse.json({ success: false, message: "Akses dinafikan." }, { status: 403 });
    }

    const limited = await enforceIpRateLimit(req, "whatsapp-test-send", 5, 60);
    if (limited) return limited;

    const body = await req.json();
    const { phoneNo, messageType } = body;
    // Tenant sentiasa diambil daripada sesi; hanya SUPERADMIN boleh menyatakan tenant lain
    const tenantId: string | undefined =
      user.role === "SUPERADMIN" ? body.tenantId || user.tenantId : user.tenantId;

    if (!tenantId || !phoneNo) {
      return NextResponse.json(
        { success: false, message: "Tenant dan nombor telefon diperlukan." },
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
