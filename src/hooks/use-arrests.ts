"use client";

import useSWR from "swr";
import type { ArrestPayload, ArrestRecord } from "@/lib/types";
import { useArrestStore } from "@/stores/arrest-store";
import { useApiUrl } from "@/hooks/use-api-url";
import { SWR_CONFIG } from "@/lib/constants";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

export function useArrests() {
  const url = useApiUrl("arrests");
  const { data, error, isLoading } = useSWR<ArrestPayload>(
    url,
    fetcher,
    SWR_CONFIG,
  );
  return { data, error, isLoading };
}

export function useFilteredArrests() {
  const { data, error, isLoading } = useArrests();
  const filters = useArrestStore();

  let filtered: ArrestRecord[] = [];

  if (data?.records) {
    filtered = data.records.filter((r) => {
      if (filters.dateFrom && r.d < filters.dateFrom) return false;
      if (filters.dateTo && r.d > filters.dateTo) return false;
      if (filters.charges.length > 0 && !filters.charges.includes(r.ch)) return false;
      if (filters.races.length > 0 && !filters.races.includes(r.ra)) return false;
      if (filters.sexes.length > 0 && !filters.sexes.includes(r.sx)) return false;
      if (filters.ageGroups.length > 0 && !filters.ageGroups.includes(r.ag)) return false;
      if (filters.districts.length > 0 && !filters.districts.includes(r.di)) return false;
      return true;
    });
  }

  return {
    filteredData: filtered,
    metadata: data
      ? {
          lastUpdated: data.lastUpdated,
          dataThrough: data.dataThrough,
          charges: data.charges,
          races: data.races,
          sexes: data.sexes,
          ageGroups: data.ageGroups,
          youngAdultGroups: data.youngAdultGroups,
          districts: data.districts,
          summary: data.summary,
        }
      : null,
    error,
    isLoading,
  };
}
