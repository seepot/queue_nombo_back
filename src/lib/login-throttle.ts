import { redis } from "@/lib/redis";

/**
 * Perlindungan brute force untuk log masuk.
 * - Per nama pengguna: 5 kegagalan dalam 15 minit -> kunci 15 minit
 * - Per alamat IP:     20 kegagalan dalam 15 minit -> kunci 15 minit
 * Fail-open jika Redis tidak boleh dicapai.
 */
export const LOGIN_USER_MAX_FAILURES = 5;
export const LOGIN_IP_MAX_FAILURES = 20;
export const LOGIN_FAILURE_WINDOW_SEC = 15 * 60;
export const LOGIN_LOCK_SEC = 15 * 60;

export type LoginBlockReason = "USER_LOCKED" | "IP_LOCKED";

export interface LoginGateResult {
  allowed: boolean;
  reason?: LoginBlockReason;
  retryAfterSec: number;
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function keys(username: string, ip: string) {
  const u = normalizeUsername(username);
  return {
    userFail: `login:fail:user:${u}`,
    userLock: `login:lock:user:${u}`,
    ipFail: `login:fail:ip:${ip}`,
    ipLock: `login:lock:ip:${ip}`,
  };
}

/** Semak sama ada percubaan log masuk dibenarkan sebelum menyemak kata laluan. */
export async function checkLoginAllowed(username: string, ip: string): Promise<LoginGateResult> {
  const k = keys(username, ip);
  try {
    const [userLockTtl, ipLockTtl] = await Promise.all([redis.ttl(k.userLock), redis.ttl(k.ipLock)]);
    if (userLockTtl > 0) {
      return { allowed: false, reason: "USER_LOCKED", retryAfterSec: userLockTtl };
    }
    if (ipLockTtl > 0) {
      return { allowed: false, reason: "IP_LOCKED", retryAfterSec: ipLockTtl };
    }
    return { allowed: true, retryAfterSec: 0 };
  } catch (error) {
    console.warn("[LoginThrottle] Redis tidak tersedia, log masuk dibenarkan (fail-open):", (error as Error).message);
    return { allowed: true, retryAfterSec: 0 };
  }
}

export interface LoginFailureResult {
  userLocked: boolean;
  ipLocked: boolean;
  userAttemptsLeft: number;
}

/** Catat satu kegagalan log masuk dan kunci jika had dicapai. */
export async function recordLoginFailure(username: string, ip: string): Promise<LoginFailureResult> {
  const k = keys(username, ip);
  try {
    const userCount = await redis.incr(k.userFail);
    if (userCount === 1) await redis.expire(k.userFail, LOGIN_FAILURE_WINDOW_SEC);

    const ipCount = await redis.incr(k.ipFail);
    if (ipCount === 1) await redis.expire(k.ipFail, LOGIN_FAILURE_WINDOW_SEC);

    let userLocked = false;
    let ipLocked = false;

    if (userCount >= LOGIN_USER_MAX_FAILURES) {
      await redis.set(k.userLock, "1", "EX", LOGIN_LOCK_SEC);
      await redis.del(k.userFail);
      userLocked = true;
    }
    if (ipCount >= LOGIN_IP_MAX_FAILURES) {
      await redis.set(k.ipLock, "1", "EX", LOGIN_LOCK_SEC);
      await redis.del(k.ipFail);
      ipLocked = true;
    }

    return {
      userLocked,
      ipLocked,
      userAttemptsLeft: Math.max(0, LOGIN_USER_MAX_FAILURES - userCount),
    };
  } catch (error) {
    console.warn("[LoginThrottle] Gagal mencatat kegagalan log masuk:", (error as Error).message);
    return { userLocked: false, ipLocked: false, userAttemptsLeft: LOGIN_USER_MAX_FAILURES };
  }
}

/** Padam kiraan dan kunci untuk nama pengguna selepas log masuk berjaya atau kata laluan ditetap semula. */
export async function clearLoginFailures(username: string): Promise<void> {
  const u = normalizeUsername(username);
  try {
    await redis.del(`login:fail:user:${u}`, `login:lock:user:${u}`);
  } catch {
    // abaikan
  }
}
