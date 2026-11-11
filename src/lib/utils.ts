/** Tiny className joiner (avoids an extra dependency). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const idNumber = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const idNumber1 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const idNumber2 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export function fmtNumber(n: number, digits: 0 | 1 | 2 = 0): string {
  if (!Number.isFinite(n)) return "–";
  return digits === 0 ? idNumber.format(n) : digits === 1 ? idNumber1.format(n) : idNumber2.format(n);
}

export function fmtIdr(n: number): string {
  if (!Number.isFinite(n)) return "–";
  return `Rp${idNumber.format(Math.round(n))}`;
}

/** Compact IDR, e.g. Rp21,4 jt / Rp1,2 M. */
export function fmtIdrCompact(n: number): string {
  if (!Number.isFinite(n)) return "–";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `Rp${idNumber1.format(n / 1e9)} M`;
  if (abs >= 1e6) return `Rp${idNumber1.format(n / 1e6)} jt`;
  if (abs >= 1e3) return `Rp${idNumber.format(n / 1e3)} rb`;
  return fmtIdr(n);
}

export function fmtKwh(n: number, digits: 0 | 1 | 2 = 0): string {
  return `${fmtNumber(n, digits)} kWh`;
}

export function fmtPct(n: number, digits: 0 | 1 = 1): string {
  if (!Number.isFinite(n)) return "–";
  return `${digits === 0 ? idNumber.format(n) : idNumber1.format(n)}%`;
}

const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const dateShortFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});
const timeFmt = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

export const fmtDate = (d: string | Date) => dateFmt.format(new Date(d));
export const fmtDateShort = (d: string | Date) => dateShortFmt.format(new Date(d));
export const fmtDateTime = (d: string | Date) => dateTimeFmt.format(new Date(d));
export const fmtTime = (d: string | Date) => timeFmt.format(new Date(d));

export function fmtRelative(d: string | Date, now: Date = new Date()): string {
  const diffMin = Math.round((now.getTime() - new Date(d).getTime()) / 60000);
  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}
