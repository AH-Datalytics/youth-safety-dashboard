"use client";

import { create } from "zustand";

interface OffenseFilterState {
  dateFrom: string | null;
  dateTo: string | null;
  offenseCategories: string[];
  districts: string[];
  zipCodes: string[];
  nibrsCodes: string[];
  caseStatuses: string[];
  activeCaseStatus: string;
  setDateFrom: (v: string | null) => void;
  setDateTo: (v: string | null) => void;
  setOffenseCategories: (v: string[]) => void;
  setDistricts: (v: string[]) => void;
  setZipCodes: (v: string[]) => void;
  setNibrsCodes: (v: string[]) => void;
  setCaseStatuses: (v: string[]) => void;
  setActiveCaseStatus: (v: string) => void;
  resetFilters: () => void;
}

const defaults = {
  dateFrom: null as string | null,
  dateTo: null as string | null,
  offenseCategories: [] as string[],
  districts: [] as string[],
  zipCodes: [] as string[],
  nibrsCodes: [] as string[],
  caseStatuses: [] as string[],
  activeCaseStatus: "All",
};

export const useOffenseStore = create<OffenseFilterState>((set) => ({
  ...defaults,
  setDateFrom: (v) => set({ dateFrom: v }),
  setDateTo: (v) => set({ dateTo: v }),
  setOffenseCategories: (v) => set({ offenseCategories: v }),
  setDistricts: (v) => set({ districts: v }),
  setZipCodes: (v) => set({ zipCodes: v }),
  setNibrsCodes: (v) => set({ nibrsCodes: v }),
  setCaseStatuses: (v) => set({ caseStatuses: v }),
  setActiveCaseStatus: (v) => set({ activeCaseStatus: v }),
  resetFilters: () => set(defaults),
}));
