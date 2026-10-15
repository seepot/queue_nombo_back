import bcrypt from "bcryptjs";
import { createHash } from "crypto";

export function sha1(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  // Use bcrypt for secure newpass hashing
  return bcrypt.hash(password, 10);
}

export function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

export async function verifyPassword(
  plainText: string,
  storedHash: string | null | undefined
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (!storedHash || !plainText) {
    return { valid: false, needsUpgrade: false };
  }

  const cleanHash = storedHash.trim();
  const cleanInput = plainText.trim();

  // 1. Check if hash is bcrypt ($2a$, $2b$, $2y$)
  const isBcrypt = /^\$2[aby]\$\d+\$/.test(cleanHash);
  if (isBcrypt) {
    const valid = await bcrypt.compare(plainText, cleanHash) || await bcrypt.compare(cleanInput, cleanHash);
    return { valid, needsUpgrade: false };
  }

  // 2. Check legacy SHA1 hash (both raw and trimmed)
  const sha1Input = sha1(plainText);
  const sha1CleanInput = sha1(cleanInput);
  if (
    cleanHash.toLowerCase() === sha1Input.toLowerCase() ||
    cleanHash.toLowerCase() === sha1CleanInput.toLowerCase()
  ) {
    return { valid: true, needsUpgrade: true };
  }

  // 3. Check legacy MD5 hash (fallback for older PHP scripts)
  const md5Input = md5(plainText);
  const md5CleanInput = md5(cleanInput);
  if (
    cleanHash.toLowerCase() === md5Input.toLowerCase() ||
    cleanHash.toLowerCase() === md5CleanInput.toLowerCase()
  ) {
    return { valid: true, needsUpgrade: true };
  }

  // 4. Check plain text fallback (legacy systems)
  if (cleanHash === plainText || cleanHash === cleanInput) {
    return { valid: true, needsUpgrade: true };
  }

  return { valid: false, needsUpgrade: false };
}
