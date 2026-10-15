import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

/**
 * Had kadar (rate limiting) berasaskan Redis dengan tetingkap tetap.
 * Fail-open: jika Redis tidak boleh dicapai, permintaan dibenarkan supaya
 * gangguan Redis tidak menjatuhkan keseluruhan sistem.
 */
export interface RateLimitOptions {
  /** Kunci unik, cth: "tickets:ip:1.2.3.4" */
  key: string;
  /** Bilangan maksimum permintaan dalam tetingkap */
  limit: number;
  /** Saiz tetingkap dalam saat */
  windowSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Saat sebelum boleh cuba semula (0 jika dibenarkan) */
  retryAfterSec: number;
}

export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${opts.key}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, opts.windowSec);
    }
    let ttl = await redis.ttl(redisKey);
    if (ttl < 0) {
      await redis.expire(redisKey, opts.windowSec);
      ttl = opts.windowSec;
    }
    const allowed = count <= opts.limit;
    return {
      allowed,
      limit: opts.limit,
      remaining: Math.max(0, opts.limit - count),
      retryAfterSec: allowed ? 0 : ttl,
    };
  } catch (error) {
    console.warn("[RateLimit] Redis tidak tersedia, permintaan dibenarkan (fail-open):", (error as Error).message);
    return { allowed: true, limit: opts.limit, remaining: opts.limit, retryAfterSec: 0 };
  }
}

/** Padam kaunter had kadar (cth: selepas tindakan berjaya). */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await redis.del(`ratelimit:${key}`);
  } catch {
    // abaikan
  }
}

/** Dapatkan alamat IP pelanggan daripada header proksi atau sambungan terus. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return "unknown";
}

/** Respons JSON 429 yang seragam. */
export function rateLimitResponse(result: RateLimitResult, message?: string): NextResponse {
  const retry = Math.max(1, result.retryAfterSec);
  return NextResponse.json(
    {
      success: false,
      code: "RATE_LIMITED",
      message:
        message ||
        `Terlalu banyak permintaan. Sila cuba semula dalam ${retry} saat.`,
      retryAfterSec: retry,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retry),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}

/**
 * Pembantu ringkas: had kadar mengikut IP untuk satu skop.
 * Pulangkan NextResponse 429 jika melebihi had, atau null jika dibenarkan.
 */
export async function enforceIpRateLimit(
  req: Request,
  scope: string,
  limit: number,
  windowSec: number,
  message?: string
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const result = await rateLimit({ key: `${scope}:ip:${ip}`, limit, windowSec });
  if (!result.allowed) {
    return rateLimitResponse(result, message);
  }
  return null;
}
