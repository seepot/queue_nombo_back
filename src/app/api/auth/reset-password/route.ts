import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/auditLogger";
import { enforceIpRateLimit } from "@/lib/rate-limit";
import { clearLoginFailures } from "@/lib/login-throttle";
import { consumePasswordResetToken, peekPasswordResetToken, validateNewPassword } from "@/lib/password-reset";

/** GET /api/auth/reset-password?token=... -> semak sama ada token masih sah */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const userId = await peekPasswordResetToken(token);
  return NextResponse.json({ success: true, valid: !!userId });
}

/**
 * POST /api/auth/reset-password
 * Body: { token: string, password: string }
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceIpRateLimit(req, "reset-password", 10, 15 * 60);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "");
    const password = body?.password;

    const passwordError = validateNewPassword(password);
    if (passwordError) {
      return NextResponse.json({ success: false, message: passwordError }, { status: 400 });
    }

    const userId = await consumePasswordResetToken(token);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Pautan tetapan semula tidak sah atau telah luput. Sila mohon pautan baharu." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, status: true },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "Akaun tidak aktif. Sila hubungi pentadbir." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await clearLoginFailures(user.username);

    logAudit({
      action: "PASSWORD_RESET_SUCCESS",
      userId: user.id,
      username: user.username,
      status: "SUCCESS",
    });

    return NextResponse.json({
      success: true,
      message: "Kata laluan berjaya ditetapkan semula. Sila log masuk dengan kata laluan baharu.",
    });
  } catch (error) {
    console.error("[Reset Password Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa menetapkan semula kata laluan." },
      { status: 500 }
    );
  }
}
