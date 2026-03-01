/** Group records by a given key and sum counts */
export function groupByKey<T extends { c: number }>(
  records: T[],
  keyFn: (r: T) => string,
): { key: string; count: number }[] {
  const map = new Map<string, number>();

  for (const r of records) {
    const k = keyFn(r);
    map.set(k, (map.get(k) ?? 0) + r.c);
  }

  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

/** Compute top-N categories with an "Other" bucket */
export function topN<T extends { c: number }>(
  records: T[],
  keyFn: (r: T) => string,
  n: number,
): { key: string; count: number }[] {
  const grouped = groupByKey(records, keyFn);
  if (grouped.length <= n) return grouped;

  const top = grouped.slice(0, n);
  const otherCount = grouped.slice(n).reduce((sum, g) => sum + g.count, 0);
  if (otherCount > 0) {
    top.push({ key: "Other", count: otherCount });
  }
  return top;
}

/** Cross-tabulate: for each value of keyA, compute counts by keyB */
export function crossTab<T extends { c: number }>(
  records: T[],
  keyA: (r: T) => string,
  keyB: (r: T) => string,
): { key: string; breakdown: Record<string, number>; total: number }[] {
  const map = new Map<string, Map<string, number>>();

  for (const r of records) {
    const a = keyA(r);
    const b = keyB(r);
    if (!map.has(a)) map.set(a, new Map());
    const inner = map.get(a)!;
    inner.set(b, (inner.get(b) ?? 0) + r.c);
  }

  return Array.from(map.entries())
    .map(([key, inner]) => {
      const breakdown = Object.fromEntries(inner);
      const total = Array.from(inner.values()).reduce((s, v) => s + v, 0);
      return { key, breakdown, total };
    })
    .sort((a, b) => b.total - a.total);
}
