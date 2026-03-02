"use client";

import useSWR from "swr";
import type { CFSPayload, CFSRecord } from "@/lib/types";
import { useCFSStore } from "@/stores/cfs-store";
import { useApiUrl } from "@/hooks/use-api-url";
import { SWR_CONFIG } from "@/lib/constants";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

export function useCFS() {
  const url = useApiUrl("cfs");
  const { data, error, isLoading } = useSWR<CFSPayload>(
    url,
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
      if (filters.categories.length > 0 && !filters.categories.includes(r.cat)) return false;
      if (filters.subCategories.length > 0 && !filters.subCategories.includes(r.sc)) return false;
      if (filters.priorities.length > 0 && !filters.priorities.includes(r.pr)) return false;
      if (filters.districts.length > 0 && !filters.districts.includes(r.di)) return false;
      if (filters.dispositionGroups.length > 0 && !filters.dispositionGroups.includes(r.dg)) return false;
      return true;
    });
  }

  return {
    filteredData: filtered,
    hourly: data?.hourly ?? [],
    categoryTree: data?.categoryTree ?? [],
    metadata: data
      ? {
          lastUpdated: data.lastUpdated,
          dataThrough: data.dataThrough,
          callTypes: data.callTypes,
          categories: data.categories,
          subCategories: data.subCategories,
          priorities: data.priorities,
          districts: data.districts,
          dispositionGroups: data.dispositionGroups,
          summary: data.summary,
        }
      : null,
    error,
    isLoading,
  };
}
