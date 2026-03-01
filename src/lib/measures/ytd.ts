/** Compute YTD comparison for records with date field `d` and count field `c` */
export function computeYTD<T extends { d: string; c: number }>(
  records: T[],
  asOfDate?: Date,
): { currentYTD: number; priorYTD: number; pctChange: number } {
  const now = asOfDate ?? new Date();
  const currentYear = now.getFullYear();
  const priorYear = currentYear - 1;
  const monthDay = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const currentFloor = `${currentYear}-01-01`;
  const currentCeil = `${currentYear}-${monthDay}`;
  const priorFloor = `${priorYear}-01-01`;
  const priorCeil = `${priorYear}-${monthDay}`;

  let currentYTD = 0;
  let priorYTD = 0;

  for (const r of records) {
    if (r.d >= currentFloor && r.d <= currentCeil) currentYTD += r.c;
    if (r.d >= priorFloor && r.d <= priorCeil) priorYTD += r.c;
  }

  const pctChange = priorYTD === 0 ? 0 : (currentYTD - priorYTD) / priorYTD;

  return { currentYTD, priorYTD, pctChange };
}

/** Compute monthly totals */
export function computeMonthly<T extends { d: string; c: number }>(
  records: T[],
): { month: string; count: number }[] {
  const map = new Map<string, number>();

  for (const r of records) {
    const month = r.d.substring(0, 7); // YYYY-MM
    map.set(month, (map.get(month) ?? 0) + r.c);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

/** Compute rolling sum (trailing N days) */
export function computeRolling<T extends { d: string; c: number }>(
  records: T[],
  days: number,
): { date: string; value: number }[] {
  // Aggregate to daily totals first
  const dailyMap = new Map<string, number>();
  for (const r of records) {
    dailyMap.set(r.d, (dailyMap.get(r.d) ?? 0) + r.c);
  }

  const sorted = Array.from(dailyMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  const result: { date: string; value: number }[] = [];

  for (let i = 0; i < sorted.length; i++) {
    let sum = 0;
    const [date] = sorted[i];
    const cutoff = new Date(date + "T00:00:00");
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().substring(0, 10);

    for (let j = i; j >= 0; j--) {
      if (sorted[j][0] < cutoffStr) break;
      sum += sorted[j][1];
    }
    result.push({ date, value: sum });
  }

  return result;
}
