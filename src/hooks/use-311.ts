"use client";

import useSWR from "swr";
import type { Request311Payload, Request311Record } from "@/lib/types";
import { useRequests311Store } from "@/stores/requests311-store";
import { useApiUrl } from "@/hooks/use-api-url";
import { SWR_CONFIG } from "@/lib/constants";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

export function use311() {
  const url = useApiUrl("311");
  const { data, error, isLoading } = useSWR<Request311Payload>(
    url,
    fetcher,
    SWR_CONFIG,
  );
  return { data, error, isLoading };
}

export function useFiltered311() {
  const { data, error, isLoading } = use311();
  const filters = useRequests311Store();

  let filtered: Request311Record[] = [];

  if (data?.records) {
    filtered = data.records.filter((r) => {
      if (filters.dateFrom && r.d < filters.dateFrom) return false;
      if (filters.dateTo && r.d > filters.dateTo) return false;
      if (filters.requestTypes.length > 0 && !filters.requestTypes.includes(r.rt)) return false;
      if (filters.departments.length > 0 && !filters.departments.includes(r.dp)) return false;
      if (filters.statuses.length > 0 && !filters.statuses.includes(r.st)) return false;
      if (filters.priorityGroups.length > 0 && !filters.priorityGroups.includes(r.pg)) return false;
      if (filters.districts.length > 0 && !filters.districts.includes(r.di)) return false;
      if (filters.zipCodes.length > 0 && !filters.zipCodes.includes(r.zi)) return false;
      return true;
    });
  }

  return {
    filteredData: filtered,
    points: data?.points ?? [],
    metadata: data
      ? {
          lastUpdated: data.lastUpdated,
          dataThrough: data.dataThrough,
          requestTypes: data.requestTypes,
          departments: data.departments,
          statuses: data.statuses,
          priorityGroups: data.priorityGroups,
          districts: data.districts,
          zipCodes: data.zipCodes,
          summary: data.summary,
        }
      : null,
    error,
    isLoading,
  };
}
