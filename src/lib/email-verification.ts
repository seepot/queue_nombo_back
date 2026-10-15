import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { sendMail, type MailResult } from "@/lib/mailer";

/**
 * Token pengesahan e-mel disimpan dalam Redis (bukan DB) dengan TTL 24 jam,
 * mengikut corak yang sama seperti password-reset.ts:
 * hanya cincangan SHA-256 token disimpan; token mentah dihantar melalui e-mel sahaja.
 * Setiap pengguna hanya mempunyai satu token aktif; permintaan baharu membatalkan yang lama.
 */
export const EMAIL_VERIFY_TTL_SEC = 24 * 60 * 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function tokenKey(tokenHash: string): string {
  return `emailverify:token:${tokenHash}`;
}

function userKey(userId: string): string {
  return `emailverify:user:${userId}`;
}

export async function createEmailVerificationToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  // Batalkan token terdahulu pengguna ini (jika ada) supaya hanya pautan terbaru sah
  const previousHash = await redis.get(userKey(userId));
  if (previousHash) {
    await redis.del(tokenKey(previousHash));
  }

  await redis
    .multi()
    .set(tokenKey(tokenHash), userId, "EX", EMAIL_VERIFY_TTL_SEC)
    .set(userKey(userId), tokenHash, "EX", EMAIL_VERIFY_TTL_SEC)
    .exec();

  return token;
}

export async function peekEmailVerificationToken(token: string): Promise<string | null> {
  if (!token || token.length < 32) return null;
  return redis.get(tokenKey(hashToken(token)));
}

/** Sahkan dan padam token (sekali guna). Pulangkan userId jika sah. */
export async function consumeEmailVerificationToken(token: string): Promise<string | null> {
  if (!token || token.length < 32) return null;
  const tokenHash = hashToken(token);
  const k = tokenKey(tokenHash);
  const userId = await redis.get(k);
  if (!userId) return null;
  await redis.del(k, userKey(userId));
  return userId;
}

export function buildEmailVerificationUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/verify-email?token=${token}`;
}

/** Jana token baharu dan hantar e-mel pengesahan. Pulangkan URL (untuk mod dev) dan hasil mel. */
export async function sendVerificationEmail(user: {
  id: string;
  email: string;
  name: string;
  username: string;
}): Promise<{ verifyUrl: string; mail: MailResult }> {
  const token = await createEmailVerificationToken(user.id);
  const verifyUrl = buildEmailVerificationUrl(token);
  const hours = Math.round(EMAIL_VERIFY_TTL_SEC / 3600);

  const mail = await sendMail({
    to: user.email,
    subject: "Sahkan E-mel Akaun QueNombo Anda",
    text: `Hai ${user.name},\n\nTerima kasih kerana mendaftar dengan QueNombo. Sila sahkan alamat e-mel untuk akaun '${user.username}' dengan membuka pautan berikut dalam tempoh ${hours} jam:\n${verifyUrl}\n\nJika anda tidak mendaftar akaun ini, abaikan e-mel ini.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
        <h2 style="color:#1e3a8a;margin-top:0">Sahkan E-mel Anda</h2>
        <p>Hai <strong>${user.name}</strong>,</p>
        <p>Terima kasih kerana mendaftar dengan QueNombo. Sila sahkan alamat e-mel untuk akaun <strong>${user.username}</strong>.</p>
        <p style="margin:24px 0">
          <a href="${verifyUrl}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Sahkan E-mel</a>
        </p>
        <p style="color:#475569;font-size:13px">Pautan ini sah selama ${hours} jam. Jika anda tidak mendaftar akaun ini, abaikan e-mel ini.</p>
        <p style="color:#94a3b8;font-size:12px;word-break:break-all">${verifyUrl}</p>
      </div>`,
  });

  return { verifyUrl, mail };
}

/** Dedahkan pautan dalam respons API hanya dalam mod pembangunan tanpa penghantar e-mel. */
export function shouldExposeDevVerifyLink(mail: MailResult): boolean {
  return process.env.NODE_ENV !== "production" && mail.provider === "CONSOLE";
}

export interface EmailVerificationStatus {
  email: string | null;
  verifiedAt: Date | null;
  verified: boolean;
}

export async function getEmailVerificationStatus(userId: string): Promise<EmailVerificationStatus | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerifiedAt: true },
  });
  if (!user) return null;
  return { email: user.email, verifiedAt: user.emailVerifiedAt, verified: !!user.emailVerifiedAt };
}

/**
 * Pentadbir organisasi (TENANT_ADMIN) mesti mengesahkan e-mel sebelum tindakan bil.
 * SUPERADMIN dikecualikan. Pulangkan respons 403 jika disekat, atau null jika dibenarkan.
 */
export async function requireVerifiedEmailForBilling(user: {
  id: string;
  role?: string | null;
}): Promise<NextResponse | null> {
  if (user.role === "SUPERADMIN") return null;
  const status = await getEmailVerificationStatus(user.id);
  if (status?.verified) return null;
  return NextResponse.json(
    {
      success: false,
      code: "EMAIL_NOT_VERIFIED",
      message: status?.email
        ? "Sila sahkan alamat e-mel anda terlebih dahulu sebelum menguruskan langganan. Semak peti masuk anda atau minta pautan pengesahan baharu dari papan pemuka."
        : "Akaun anda tiada alamat e-mel yang disahkan. Sila hubungi sokongan QueNombo untuk mengemas kini e-mel sebelum menguruskan langganan.",
    },
    { status: 403 }
  );
}
