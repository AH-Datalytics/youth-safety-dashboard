"use client";

import useSWR from "swr";
import type { CampusPayload, CampusRecord } from "@/lib/types";
import { useCampusStore } from "@/stores/campus-store";
import { SWR_CONFIG } from "@/lib/constants";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

export function useCampus() {
  const { data, error, isLoading } = useSWR<CampusPayload>(
    "/api/campus",
    fetcher,
    SWR_CONFIG,
  );
  return { data, error, isLoading };
}

export function useFilteredCampus() {
  const { data, error, isLoading } = useCampus();
  const filters = useCampusStore();

  let filtered: CampusRecord[] = [];

  if (data?.records) {
    filtered = data.records.filter((r) => {
      if (filters.schoolYear && r.sy !== filters.schoolYear) return false;
      if (filters.campuses.length > 0 && !filters.campuses.includes(r.cn)) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(r.ca)) return false;
      if (filters.incidentTypes.length > 0 && !filters.incidentTypes.includes(r.in)) return false;
      if (filters.actions.length > 0 && !filters.actions.includes(r.ac)) return false;
      if (filters.races.length > 0 && !filters.races.includes(r.ra)) return false;
      if (filters.sexes.length > 0 && !filters.sexes.includes(r.sx)) return false;
      if (filters.grades.length > 0 && !filters.grades.includes(r.gr)) return false;
      return true;
    });
  }

  return {
    filteredData: filtered,
    metadata: data
      ? {
          lastUpdated: data.lastUpdated,
          schoolYears: data.schoolYears,
          campuses: data.campuses,
          categories: data.categories,
          incidentTypes: data.incidentTypes,
          actions: data.actions,
          races: data.races,
          sexes: data.sexes,
          grades: data.grades,
          summary: data.summary,
        }
      : null,
    error,
    isLoading,
  };
}
