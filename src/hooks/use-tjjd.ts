"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { TJJDPayload, TJJDRecord } from "@/lib/types";
import { useTJJDStore } from "@/stores/tjjd-store";
import { useApiUrl } from "@/hooks/use-api-url";
import { SWR_CONFIG } from "@/lib/constants";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

export function useTJJD() {
  const url = useApiUrl("tjjd");
  const { data, error, isLoading } = useSWR<TJJDPayload>(
    url,
    fetcher,
    SWR_CONFIG,
  );
  return { data, error, isLoading };
}

/** Build sorted month keys ("2020-01", "2020-02", ...) from raw records */
function buildMonthKeys(records: TJJDRecord[]): string[] {
  const set = new Set<string>();
  for (const r of records) {
    set.add(`${r.yr}-${String(r.mo).padStart(2, "0")}`);
  }
  return Array.from(set).sort();
}

/**
 * Aggregate the time series by summing only the payload's total category.
 * Categories are alternative cuts of the same referrals, so summing all of
 * them would multiply-count.
 */
function buildMonthlyTimeSeries(
  records: TJJDRecord[],
  monthKeys: string[],
  totalCategory: string,
): { month: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of records) {
    if (r.cat !== totalCategory) continue;
    const key = `${r.yr}-${String(r.mo).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + r.v);
  }
  return monthKeys.map((mk) => ({ month: mk, count: map.get(mk) ?? 0 }));
}

export function useFilteredTJJD() {
  const { data, error, isLoading } = useTJJD();
  const { startIndex, endIndex, category } = useTJJDStore();
  const totalCategory = data?.totalCategory ?? "Gender";

  const monthKeys = useMemo(
    () => (data?.records ? buildMonthKeys(data.records) : []),
    [data?.records],
  );

  const monthlyTimeSeries = useMemo(
    () =>
      data?.records
        ? buildMonthlyTimeSeries(data.records, monthKeys, totalCategory)
        : [],
    [data?.records, monthKeys, totalCategory],
  );

  /** Set of "YYYY-MM" keys within the brush range */
  const activeMonthKeys = useMemo(() => {
    if (startIndex == null || endIndex == null) return null; // null = all
    return new Set(monthKeys.slice(startIndex, endIndex + 1));
  }, [monthKeys, startIndex, endIndex]);

  const filtered = useMemo(() => {
    if (!data?.records) return [];
    return data.records.filter((r) => {
      if (activeMonthKeys) {
        const key = `${r.yr}-${String(r.mo).padStart(2, "0")}`;
        if (!activeMonthKeys.has(key)) return false;
      }
      if (category && r.cat !== category) return false;
      return true;
    });
  }, [data?.records, activeMonthKeys, category]);

  /** Filtered ZIP records (year-level only — no month granularity) */
  const filteredZipRecords = useMemo(() => {
    if (!data?.zipRecords) return [];
    if (!activeMonthKeys) return data.zipRecords;
    // ZIP data only has year granularity — include years that overlap the brush range
    const activeYears = new Set<string>();
    for (const mk of activeMonthKeys) {
      activeYears.add(mk.split("-")[0]);
    }
    return data.zipRecords.filter((z) => activeYears.has(z.yr));
  }, [data?.zipRecords, activeMonthKeys]);

  /** Total referrals in brush range (ignores category filter) */
  const rangeTotal = useMemo(() => {
    if (!data?.records) return 0;
    let sum = 0;
    for (const r of data.records) {
      if (r.cat !== totalCategory) continue;
      if (activeMonthKeys) {
        const key = `${r.yr}-${String(r.mo).padStart(2, "0")}`;
        if (!activeMonthKeys.has(key)) continue;
      }
      sum += r.v;
    }
    return sum;
  }, [data?.records, activeMonthKeys, totalCategory]);

  return {
    filteredData: filtered,
    rangeTotal,
    zipRecords: filteredZipRecords,
    monthKeys,
    monthlyTimeSeries,
    metadata: data
      ? {
          lastUpdated: data.lastUpdated,
          categories: data.categories,
          descriptions: data.descriptions,
          years: data.years,
          granularity: data.granularity ?? "monthly",
          totalCategory,
          sourceLabel: data.sourceLabel,
          summary: data.summary,
        }
      : null,
    error,
    isLoading,
  };
}
