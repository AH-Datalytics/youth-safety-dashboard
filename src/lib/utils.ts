import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number with commas: 1234567 → "1,234,567" */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Format a percentage: 0.1234 → "+12.3%" or "-12.3%" */
export function formatPct(pct: number, decimals = 1): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${(pct * 100).toFixed(decimals)}%`;
}

/** Semantic color class for public safety: increase = red (bad), decrease = blue (good) */
export function changeColor(pct: number, threshold = 0.02): string {
  if (Math.abs(pct) < threshold) return "text-muted-foreground";
  return pct > 0 ? "text-increase" : "text-decrease";
}

/** Parse YYYY-MM-DD string to Date (avoiding timezone issues) */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Format Date to "MMM YYYY" */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Get YTD date range: Jan 1 of given year through asOfDate */
export function ytdRange(year: number, asOfDate: Date): [Date, Date] {
  return [new Date(year, 0, 1), asOfDate];
}
