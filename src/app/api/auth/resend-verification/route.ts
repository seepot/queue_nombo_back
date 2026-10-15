import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/auditLogger";
import { enforceIpRateLimit, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sendVerificationEmail, shouldExposeDevVerifyLink } from "@/lib/email-verification";

const GENERIC_MESSAGE =
  "Jika akaun tersebut wujud dan e-melnya belum disahkan, pautan pengesahan baharu telah dihantar.";

/**
 * POST /api/auth/resend-verification
 * - Dengan sesi log masuk: hantar semula kepada pengguna semasa (balasan terperinci).
 * - Tanpa sesi: Body { identifier: string } (username atau e-mel); sentiasa membalas mesej
 *   generik supaya kewujudan akaun tidak didedahkan (corak sama seperti forgot-password).
 * Had kadar: 5 permintaan / 15 minit setiap IP, 3 permintaan / jam setiap akaun.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await enforceIpRateLimit(req, "resend-verification", 5, 15 * 60);
    if (limited) return limited;

    const session = await auth();
    const sessionUserId = session?.user?.id || null;
    const body = await req.json().catch(() => ({}));

    let user: {
      id: string;
      username: string;
      email: string | null;
      name: string;
      emailVerifiedAt: Date | null;
    } | null = null;

    if (sessionUserId) {
      user = await prisma.user.findFirst({
        where: { id: sessionUserId, status: "ACTIVE" },
        select: { id: true, username: true, email: true, name: true, emailVerifiedAt: true },
      });
      if (!user) {
        return NextResponse.json({ success: false, message: "Sesi tidak sah. Sila log masuk semula." }, { status: 401 });
      }
    } else {
      const identifier = String(body?.identifier || "").trim().toLowerCase();
      if (!identifier) {
        return NextResponse.json(
          { success: false, message: "Sila masukkan nama pengguna atau e-mel." },
          { status: 400 }
        );
      }
      user = await prisma.user.findFirst({
        where: { OR: [{ username: identifier }, { email: identifier }], status: "ACTIVE" },
        select: { id: true, username: true, email: true, name: true, emailVerifiedAt: true },
      });
    }

    const detailed = !!sessionUserId;

    if (!user || !user.email) {
      if (detailed) {
        return NextResponse.json(
          {
            success: false,
            code: "NO_EMAIL",
            message: "Akaun anda tiada alamat e-mel berdaftar. Sila hubungi sokongan QueNombo untuk mengemas kini e-mel.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: detailed ? "E-mel anda telah disahkan. Tiada tindakan diperlukan." : GENERIC_MESSAGE,
      });
    }

    // Had per akaun: 3 permintaan sejam
    const perUser = await rateLimit({ key: `resend-verification:user:${user.id}`, limit: 3, windowSec: 60 * 60 });
    if (!perUser.allowed) {
      return rateLimitResponse(perUser, "Terlalu banyak permintaan pengesahan untuk akaun ini. Sila cuba semula kemudian.");
    }

    const { verifyUrl, mail } = await sendVerificationEmail({
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
    });

    logAudit({
      action: "EMAIL_VERIFICATION_SENT",
      userId: user.id,
      username: user.username,
      status: "SUCCESS",
      details: { context: detailed ? "resend-session" : "resend-public", delivered: mail.delivered, provider: mail.provider },
    });

    const exposeDevLink = shouldExposeDevVerifyLink(mail);

    return NextResponse.json({
      success: true,
      alreadyVerified: false,
      message: detailed ? `Pautan pengesahan baharu telah dihantar ke ${user.email}. Pautan sah selama 24 jam.` : GENERIC_MESSAGE,
      ...(exposeDevLink
        ? { devVerifyUrl: verifyUrl, devNote: "RESEND_API_KEY tidak ditetapkan; pautan dipaparkan untuk pembangunan sahaja." }
        : {}),
    });
  } catch (error) {
    console.error("[Resend Verification Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa menghantar semula pautan pengesahan." },
      { status: 500 }
    );
  }
}
