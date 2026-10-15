import { createHash, randomBytes } from "crypto";
import { redis } from "@/lib/redis";

/**
 * Token tetapan semula kata laluan disimpan dalam Redis (bukan DB) dengan TTL 30 minit.
 * Hanya cincangan SHA-256 token disimpan; token mentah dihantar melalui e-mel sahaja.
 */
export const PASSWORD_RESET_TTL_SEC = 30 * 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function key(token: string): string {
  return `pwreset:token:${hashToken(token)}`;
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await redis.set(key(token), userId, "EX", PASSWORD_RESET_TTL_SEC);
  return token;
}

export async function peekPasswordResetToken(token: string): Promise<string | null> {
  if (!token || token.length < 32) return null;
  return redis.get(key(token));
}

/** Sahkan dan padam token (sekali guna). Pulangkan userId jika sah. */
export async function consumePasswordResetToken(token: string): Promise<string | null> {
  if (!token || token.length < 32) return null;
  const k = key(token);
  const userId = await redis.get(k);
  if (!userId) return null;
  await redis.del(k);
  return userId;
}

export function buildPasswordResetUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/reset-password?token=${token}`;
}

export function validateNewPassword(password: unknown): string | null {
  if (typeof password !== "string") return "Kata laluan diperlukan.";
  if (password.length < 8) return "Kata laluan mesti sekurang-kurangnya 8 aksara.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Kata laluan mesti mengandungi huruf dan nombor.";
  }
  return null;
}
