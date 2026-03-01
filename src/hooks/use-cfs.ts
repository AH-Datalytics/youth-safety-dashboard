"use client";

import useSWR from "swr";
import type { CFSPayload, CFSRecord } from "@/lib/types";
import { useCFSStore } from "@/stores/cfs-store";
import { SWR_CONFIG } from "@/lib/constants";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

export function useCFS() {
  const { data, error, isLoading } = useSWR<CFSPayload>(
    "/api/cfs",
    fetcher,
    SWR_CONFIG,
  );
  return { data, error, isLoading };
}

export function useFilteredCFS() {
  const { data, error, isLoading } = useCFS();
  const filters = useCFSStore();

  let filtered: CFSRecord[] = [];

  if (data?.records) {
    filtered = data.records.filter((r) => {
      if (filters.dateFrom && r.d < filters.dateFrom) return false;
      if (filters.dateTo && r.d > filters.dateTo) return false;
      if (filters.callTypes.length > 0 && !filters.callTypes.includes(r.ct)) return false;
      if (filters.priorities.length > 0 && !filters.priorities.includes(r.pr)) return false;
      if (filters.districts.length > 0 && !filters.districts.includes(r.di)) return false;
      if (filters.natures.length > 0 && !filters.natures.includes(r.na)) return false;
      return true;
    });
  }

  return {
    filteredData: filtered,
    hourly: data?.hourly ?? [],
    metadata: data
      ? {
          lastUpdated: data.lastUpdated,
          dataThrough: data.dataThrough,
          callTypes: data.callTypes,
          priorities: data.priorities,
          districts: data.districts,
          natures: data.natures,
          summary: data.summary,
        }
      : null,
    error,
    isLoading,
  };
}
