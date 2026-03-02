"use client";

import useSWR from "swr";
import type { IncidentPayload, IncidentRecord } from "@/lib/types";
import { useOffenseStore } from "@/stores/offense-store";
import { useApiUrl } from "@/hooks/use-api-url";
import { SWR_CONFIG } from "@/lib/constants";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

export function useIncidents() {
  const url = useApiUrl("incidents");
  const { data, error, isLoading } = useSWR<IncidentPayload>(
    url,
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
    const nibrsSet = filters.nibrsCodes.length > 0 ? new Set(filters.nibrsCodes) : null;
    filtered = data.records.filter((r) => {
      if (filters.dateFrom && r.d < filters.dateFrom) return false;
      if (filters.dateTo && r.d > filters.dateTo) return false;
      if (filters.offenseCategories.length > 0 && !filters.offenseCategories.includes(r.ca))
        return false;
      if (filters.districts.length > 0 && !filters.districts.includes(r.di)) return false;
      if (filters.zipCodes.length > 0 && !filters.zipCodes.includes(r.zi)) return false;
      // Tree filter selects labels at all levels: crimeAgainst, offenseGroup, nibrs crime
      if (nibrsSet && !nibrsSet.has(r.cag) && !nibrsSet.has(r.ca) && !nibrsSet.has(r.n))
        return false;
      if (filters.caseStatuses.length > 0 && !filters.caseStatuses.includes(r.cs)) return false;
      return true;
    });
  }

  return {
    filteredData: filtered,
    hourly: data?.hourly ?? [],
    points: data?.points ?? [],
    nibrsTree: data?.nibrsTree ?? [],
    metadata: data
      ? {
          lastUpdated: data.lastUpdated,
          dataThrough: data.dataThrough,
          dataFrom: data.dataFrom,
          offenseTypes: data.offenseTypes,
          crimeAgainsts: data.crimeAgainsts,
          categories: data.categories,
          districts: data.districts,
          zipCodes: data.zipCodes,
          caseStatuses: data.caseStatuses,
          summary: data.summary,
        }
      : null,
    error,
    isLoading,
  };
}
