"use client";

import useSWR from "swr";
import type { TJJDPayload, TJJDRecord } from "@/lib/types";
import { useTJJDStore } from "@/stores/tjjd-store";
import { SWR_CONFIG } from "@/lib/constants";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

export function useTJJD() {
  const { data, error, isLoading } = useSWR<TJJDPayload>(
    "/api/tjjd",
    fetcher,
    SWR_CONFIG,
  );
  return { data, error, isLoading };
}

export function useFilteredTJJD() {
  const { data, error, isLoading } = useTJJD();
  const filters = useTJJDStore();

  let filtered: TJJDRecord[] = [];

  if (data?.records) {
    filtered = data.records.filter((r) => {
      if (filters.schoolYear && r.sy !== filters.schoolYear) return false;
      if (filters.counties.length > 0 && !filters.counties.includes(r.co)) return false;
      if (filters.offenses.length > 0 && !filters.offenses.includes(r.of)) return false;
      if (filters.races.length > 0 && !filters.races.includes(r.ra)) return false;
      if (filters.sexes.length > 0 && !filters.sexes.includes(r.sx)) return false;
      if (filters.ageGroups.length > 0 && !filters.ageGroups.includes(r.ag)) return false;
      return true;
    });
  }

  return {
    filteredData: filtered,
    metadata: data
      ? {
          lastUpdated: data.lastUpdated,
          schoolYears: data.schoolYears,
          counties: data.counties,
          offenses: data.offenses,
          races: data.races,
          sexes: data.sexes,
          ageGroups: data.ageGroups,
          summary: data.summary,
        }
      : null,
    error,
    isLoading,
  };
}
