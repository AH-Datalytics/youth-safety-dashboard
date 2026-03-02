/** Compute YTD comparison by crime type — CompStat format */

export interface CrimeTypeYTDRow {
  crimeType: string;
  group?: string;
  currentYTD: number;
  lastYTD: number;
  ytdPctChange: number | null;
  twoYearYTD: number;
  twoYearPctChange: number | null;
}

export function computeYTDByType<T extends { d: string; c: number }>(
  records: T[],
  keyFn: (r: T) => string,
  asOfDate?: Date,
  groupFn?: (r: T) => string,
): CrimeTypeYTDRow[] {
  const now = asOfDate ?? new Date();
  const currentYear = now.getFullYear();
  const lastYear = currentYear - 1;
  const twoYearsAgo = currentYear - 2;
  const monthDay = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const ranges = {
    current: { from: `${currentYear}-01-01`, to: `${currentYear}-${monthDay}` },
    last: { from: `${lastYear}-01-01`, to: `${lastYear}-${monthDay}` },
    twoYr: { from: `${twoYearsAgo}-01-01`, to: `${twoYearsAgo}-${monthDay}` },
  };

  // Track group per key (first seen wins — groups are stable per offense group)
  const keyGroup = new Map<string, string>();
  const buckets = new Map<string, { current: number; last: number; twoYr: number }>();

  for (const r of records) {
    const key = keyFn(r);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, { current: 0, last: 0, twoYr: 0 });
    if (groupFn && !keyGroup.has(key)) keyGroup.set(key, groupFn(r));
    const b = buckets.get(key)!;

    if (r.d >= ranges.current.from && r.d <= ranges.current.to) b.current += r.c;
    if (r.d >= ranges.last.from && r.d <= ranges.last.to) b.last += r.c;
    if (r.d >= ranges.twoYr.from && r.d <= ranges.twoYr.to) b.twoYr += r.c;
  }

  const rows: CrimeTypeYTDRow[] = [];
  for (const [crimeType, b] of buckets) {
    rows.push({
      crimeType,
      group: keyGroup.get(crimeType),
      currentYTD: b.current,
      lastYTD: b.last,
      ytdPctChange: b.last === 0 ? null : (b.current - b.last) / b.last,
      twoYearYTD: b.twoYr,
      twoYearPctChange: b.twoYr === 0 ? null : (b.current - b.twoYr) / b.twoYr,
    });
  }

  // Sort: by group alphabetically, then by crimeType alphabetically within group
  if (groupFn) {
    return rows.sort((a, b) => {
      const ga = a.group ?? "";
      const gb = b.group ?? "";
      if (ga !== gb) return ga.localeCompare(gb);
      return a.crimeType.localeCompare(b.crimeType);
    });
  }

  return rows.sort((a, b) => b.currentYTD - a.currentYTD);
}
