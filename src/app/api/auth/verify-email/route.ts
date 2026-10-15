import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/auditLogger";
import { enforceIpRateLimit } from "@/lib/rate-limit";
import { consumeEmailVerificationToken, peekEmailVerificationToken } from "@/lib/email-verification";

/** GET /api/auth/verify-email?token=... -> semak sama ada token masih sah (tanpa menggunakannya) */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const userId = await peekEmailVerificationToken(token);
  return NextResponse.json({ success: true, valid: !!userId });
}

/**
 * POST /api/auth/verify-email
 * Body: { token: string }
 * Token sekali guna: digunakan (dipadam) walaupun akaun sudah disahkan sebelum ini.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceIpRateLimit(req, "verify-email", 10, 15 * 60);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "");

    const userId = await consumeEmailVerificationToken(token);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          code: "TOKEN_INVALID",
          message: "Pautan pengesahan tidak sah atau telah luput. Sila minta pautan baharu.",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, tenantId: true, status: true, emailVerifiedAt: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "Akaun tidak aktif. Sila hubungi pentadbir." },
        { status: 400 }
      );
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: "E-mel anda telah disahkan sebelum ini. Anda boleh log masuk seperti biasa.",
      });
    }

    const verifiedAt = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: verifiedAt },
      }),
      prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: "EMAIL_VERIFIED",
          details: { email: user.email, verifiedAt: verifiedAt.toISOString() },
          status: "SUCCESS",
        },
      }),
    ]);

    logAudit({
      action: "EMAIL_VERIFIED",
      userId: user.id,
      username: user.username,
      status: "SUCCESS",
      details: { email: user.email },
    });

    return NextResponse.json({
      success: true,
      alreadyVerified: false,
      message: "E-mel berjaya disahkan! Akaun anda kini boleh menguruskan langganan dan pembayaran.",
    });
  } catch (error) {
    console.error("[Verify Email Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa mengesahkan e-mel." },
      { status: 500 }
    );
  }
}
