"use client";

import { useMemo } from "react";
import useSWR from "swr";
import type { CampusPayload, CampusRecord, CampusSchool } from "@/lib/types";
import { useCampusStore } from "@/stores/campus-store";
import { useApiUrl } from "@/hooks/use-api-url";
import { SWR_CONFIG } from "@/lib/constants";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

export function useCampus() {
  const url = useApiUrl("campus");
  const { data, error, isLoading } = useSWR<CampusPayload>(
    url,
    fetcher,
    SWR_CONFIG,
  );
  return { data, error, isLoading };
}

export function useFilteredCampus() {
  const { data, error, isLoading } = useCampus();
  const filters = useCampusStore();

  // Build set of campus numbers matching schoolType + schoolNames filters
  const schoolCnSet = useMemo(() => {
    if (!data?.schools) return null;
    if (!filters.schoolType && filters.schoolNames.length === 0) return null;

    const set = new Set<number>();
    for (const s of data.schools) {
      // Filter by school (district) type
      if (filters.schoolType && s.districtType !== filters.schoolType) continue;
      // Filter by school name
      if (filters.schoolNames.length > 0 && !filters.schoolNames.includes(s.name)) continue;
      set.add(s.cn);
    }
    return set;
  }, [data?.schools, filters.schoolType, filters.schoolNames]);

  const filtered = useMemo(() => {
    if (!data?.records) return [];
    return data.records.filter((r) => {
      if (filters.schoolYear && r.sy !== filters.schoolYear) return false;
      if (filters.campuses.length > 0 && !filters.campuses.includes(r.cn)) return false;
      if (filters.types.length > 0 && !filters.types.includes(r.tp)) return false;
      if (filters.sections.length > 0 && !filters.sections.includes(r.se)) return false;
      if (schoolCnSet && !schoolCnSet.has(r.cn)) return false;
      return true;
    });
  }, [data?.records, filters.schoolYear, filters.campuses, filters.types, filters.sections, schoolCnSet]);

  // Records filtered by everything EXCEPT schoolYear — for CompStat table multi-year view
  const compStatRecords = useMemo(() => {
    if (!data?.records) return [];
    return data.records.filter((r) => {
      if (filters.campuses.length > 0 && !filters.campuses.includes(r.cn)) return false;
      if (filters.types.length > 0 && !filters.types.includes(r.tp)) return false;
      if (filters.sections.length > 0 && !filters.sections.includes(r.se)) return false;
      if (schoolCnSet && !schoolCnSet.has(r.cn)) return false;
      return true;
    });
  }, [data?.records, filters.campuses, filters.types, filters.sections, schoolCnSet]);

  // Schools filtered by schoolType + schoolNames (for map)
  const filteredSchools = useMemo(() => {
    if (!data?.schools) return [];
    if (!schoolCnSet) return data.schools;
    return data.schools.filter((s) => schoolCnSet.has(s.cn));
  }, [data?.schools, schoolCnSet]);

  // Sorted school name options (respects schoolType filter)
  const schoolNameOptions = useMemo(() => {
    if (!data?.schools) return [];
    let pool = data.schools;
    if (filters.schoolType) {
      pool = pool.filter((s) => s.districtType === filters.schoolType);
    }
    return pool.map((s) => s.name).sort();
  }, [data?.schools, filters.schoolType]);

  return {
    filteredData: filtered,
    compStatRecords,
    schools: data?.schools ?? [],
    filteredSchools,
    schoolNameOptions,
    metadata: data
      ? {
          lastUpdated: data.lastUpdated,
          schoolYears: data.schoolYears,
          sections: data.sections,
          types: data.types,
          headingNames: data.headingNames,
          descriptions: data.descriptions ?? [],
          summary: data.summary,
        }
      : null,
    error,
    isLoading,
  };
}
