/**
 * Utiliti ralat untuk blok `catch` tanpa `any`.
 */

/** Pulangkan `message` daripada nilai yang dilempar (Error atau objek seakan Error); jika tiada, `fallback`. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}
