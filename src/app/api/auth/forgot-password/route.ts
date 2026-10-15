import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/auditLogger";
import { enforceIpRateLimit, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { buildPasswordResetUrl, createPasswordResetToken, PASSWORD_RESET_TTL_SEC } from "@/lib/password-reset";

const GENERIC_MESSAGE =
  "Jika akaun dengan maklumat tersebut wujud dan mempunyai e-mel, pautan tetapan semula telah dihantar.";

/**
 * POST /api/auth/forgot-password
 * Body: { identifier: string }  (nama pengguna atau e-mel)
 * Sentiasa membalas mesej generik supaya kewujudan akaun tidak didedahkan.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceIpRateLimit(req, "forgot-password", 5, 15 * 60);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const identifier = String(body?.identifier || "").trim().toLowerCase();

    if (!identifier) {
      return NextResponse.json(
        { success: false, message: "Sila masukkan nama pengguna atau e-mel." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
        status: "ACTIVE",
      },
      select: { id: true, username: true, email: true, name: true, tenantId: true },
    });

    if (!user || !user.email) {
      // Jangan dedahkan sama ada akaun wujud
      return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
    }

    // Had per akaun: 3 permintaan sejam
    const perUser = await rateLimit({ key: `forgot-password:user:${user.id}`, limit: 3, windowSec: 60 * 60 });
    if (!perUser.allowed) {
      return rateLimitResponse(perUser, "Terlalu banyak permintaan untuk akaun ini. Sila cuba semula kemudian.");
    }

    const token = await createPasswordResetToken(user.id);
    const resetUrl = buildPasswordResetUrl(token);
    const minutes = Math.round(PASSWORD_RESET_TTL_SEC / 60);

    const mail = await sendMail({
      to: user.email,
      subject: "Tetapan Semula Kata Laluan QueNombo",
      text: `Hai ${user.name},\n\nKami menerima permintaan untuk menetapkan semula kata laluan akaun '${user.username}'.\nKlik pautan berikut dalam tempoh ${minutes} minit:\n${resetUrl}\n\nJika anda tidak membuat permintaan ini, abaikan e-mel ini.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
          <h2 style="color:#1e3a8a;margin-top:0">Tetapan Semula Kata Laluan</h2>
          <p>Hai <strong>${user.name}</strong>,</p>
          <p>Kami menerima permintaan untuk menetapkan semula kata laluan akaun <strong>${user.username}</strong>.</p>
          <p style="margin:24px 0">
            <a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Tetapkan Semula Kata Laluan</a>
          </p>
          <p style="color:#475569;font-size:13px">Pautan ini sah selama ${minutes} minit. Jika anda tidak membuat permintaan ini, abaikan e-mel ini.</p>
          <p style="color:#94a3b8;font-size:12px;word-break:break-all">${resetUrl}</p>
        </div>`,
    });

    logAudit({
      action: "PASSWORD_RESET_REQUESTED",
      userId: user.id,
      username: user.username,
      status: "SUCCESS",
      details: { delivered: mail.delivered, provider: mail.provider },
    });

    const exposeDevLink = process.env.NODE_ENV !== "production" && !isMailConfigured();

    return NextResponse.json({
      success: true,
      message: GENERIC_MESSAGE,
      ...(exposeDevLink ? { devResetUrl: resetUrl, devNote: "RESEND_API_KEY tidak ditetapkan; pautan dipaparkan untuk pembangunan sahaja." } : {}),
    });
  } catch (error) {
    console.error("[Forgot Password Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa memproses permintaan." },
      { status: 500 }
    );
  }
}
