import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis =
  globalForRedis.redis ??
  new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

/**
 * Jana & simpan kod PIN 6-digit untuk device pairing (TV Display).
 * Default TTL: 10 minit (600 saat).
 */
export async function generateDevicePairingCode(
  branchId: string,
  deviceName: string,
  ttlSeconds = 600
): Promise<string> {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const key = `device:pairing:pin:${pin}`;

  const payload = JSON.stringify({
    branchId,
    deviceName,
    createdAt: new Date().toISOString(),
  });

  await redis.set(key, payload, "EX", ttlSeconds);
  return pin;
}

/**
 * Sahkan kod pairing PIN TV dan pulangkan data premis.
 */
export async function verifyDevicePairingCode(
  pin: string
): Promise<{ branchId: string; deviceName: string } | null> {
  const key = `device:pairing:pin:${pin}`;
  const data = await redis.get(key);

  if (!data) return null;

  // Hapus PIN selepas berjaya disahkan (Single-use PIN)
  await redis.del(key);
  return JSON.parse(data);
}

/**
 * Atomic Increment untuk nombor giliran seterusnya dalam masa nyata (<1ms).
 * Cth: `A1001`, `A1002`, ...
 */
export async function getNextTicketSequence(
  tenantId: string,
  branchId: string,
  categoryId: string,
  prefix: string,
  startNumber = 1001
): Promise<{ ticketNo: string; seqNumber: number }> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `tenant:${tenantId}:branch:${branchId}:cat:${categoryId}:seq:${today}`;

  const currentSeq = await redis.incr(key);

  // Jika hari baru bermula (seq == 1), set sequence ke startNumber
  let actualSeq = startNumber + currentSeq - 1;
  if (currentSeq === 1) {
    await redis.set(key, "1");
    // Set luput 48 jam untuk jimat memori
    await redis.expire(key, 172800);
    actualSeq = startNumber;
  }

  const ticketNo = `${prefix}${actualSeq}`;
  return { ticketNo, seqNumber: actualSeq };
}
