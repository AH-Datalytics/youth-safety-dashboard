"use client";

import { create } from "zustand";

interface OffenseFilterState {
  dateFrom: string | null;
  dateTo: string | null;
  offenseCategories: string[];
  districts: string[];
  zipCodes: string[];
  nibrsCodes: string[];
  setDateFrom: (v: string | null) => void;
  setDateTo: (v: string | null) => void;
  setOffenseCategories: (v: string[]) => void;
  setDistricts: (v: string[]) => void;
  setZipCodes: (v: string[]) => void;
  setNibrsCodes: (v: string[]) => void;
  resetFilters: () => void;
}

const defaults = {
  dateFrom: null,
  dateTo: null,
  offenseCategories: [] as string[],
  districts: [] as string[],
  zipCodes: [] as string[],
  nibrsCodes: [] as string[],
};

export const useOffenseStore = create<OffenseFilterState>((set) => ({
  ...defaults,
  setDateFrom: (v) => set({ dateFrom: v }),
  setDateTo: (v) => set({ dateTo: v }),
  setOffenseCategories: (v) => set({ offenseCategories: v }),
  setDistricts: (v) => set({ districts: v }),
  setZipCodes: (v) => set({ zipCodes: v }),
  setNibrsCodes: (v) => set({ nibrsCodes: v }),
  resetFilters: () => set(defaults),
}));
