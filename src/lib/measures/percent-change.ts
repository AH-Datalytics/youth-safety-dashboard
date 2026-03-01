export function formatPctChange(value: number | null): string {
  if (value === null) return "N/A";
  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function getPctChangeColor(value: number | null): "increase" | "decrease" | "neutral" {
  if (value === null || value === 0) return "neutral";
  return value > 0 ? "increase" : "decrease";
}
