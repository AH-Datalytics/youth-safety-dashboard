"use client";

import useSWR from "swr";
import type { IncidentPayload, IncidentRecord } from "@/lib/types";
import { useOffenseStore } from "@/stores/offense-store";
import { SWR_CONFIG } from "@/lib/constants";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

export function useIncidents() {
  const { data, error, isLoading } = useSWR<IncidentPayload>(
    "/api/incidents",
    fetcher,
    SWR_CONFIG,
  );
  return { data, error, isLoading };
}

export function useFilteredIncidents() {
  const { data, error, isLoading } = useIncidents();
  const filters = useOffenseStore();

  let filtered: IncidentRecord[] = [];

  if (data?.records) {
    filtered = data.records.filter((r) => {
      if (filters.dateFrom && r.d < filters.dateFrom) return false;
      if (filters.dateTo && r.d > filters.dateTo) return false;
      if (filters.offenseCategories.length > 0 && !filters.offenseCategories.includes(r.ca))
        return false;
      if (filters.districts.length > 0 && !filters.districts.includes(r.di)) return false;
      if (filters.zipCodes.length > 0 && !filters.zipCodes.includes(r.zi)) return false;
      if (filters.nibrsCodes.length > 0 && !filters.nibrsCodes.includes(r.n)) return false;
      return true;
    });
  }

  return {
    filteredData: filtered,
    metadata: data
      ? {
          lastUpdated: data.lastUpdated,
          dataThrough: data.dataThrough,
          offenseTypes: data.offenseTypes,
          categories: data.categories,
          districts: data.districts,
          zipCodes: data.zipCodes,
          summary: data.summary,
        }
      : null,
    error,
    isLoading,
  };
}
