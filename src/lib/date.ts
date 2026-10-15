export function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/** Tarikh `days` hari sebelum `from` (lalai: sekarang). */
export function daysAgo(days: number, from: number = Date.now()): Date {
  return new Date(from - days * 24 * 60 * 60 * 1000);
}

/** Bilangan hari (dibundarkan ke atas) dari `from` hingga `date`; `null` jika tiada tarikh. */
export function daysUntil(date: Date | string | null | undefined, from: number = Date.now()): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - from) / (1000 * 60 * 60 * 24));
}

/** Benar jika `date` berada dalam tempoh `windowMs` terakhir sebelum `from`; tarikh kosong dianggap tidak. */
export function isWithinLastMs(date: Date | string | null | undefined, windowMs: number, from: number = Date.now()): boolean {
  const time = date ? new Date(date).getTime() : 0;
  return from - time < windowMs;
}
