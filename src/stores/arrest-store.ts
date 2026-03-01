"use client";

import { create } from "zustand";

interface ArrestFilterState {
  dateFrom: string | null;
  dateTo: string | null;
  charges: string[];
  races: string[];
  sexes: string[];
  ageGroups: string[];
  districts: string[];
  setDateFrom: (v: string | null) => void;
  setDateTo: (v: string | null) => void;
  setCharges: (v: string[]) => void;
  setRaces: (v: string[]) => void;
  setSexes: (v: string[]) => void;
  setAgeGroups: (v: string[]) => void;
  setDistricts: (v: string[]) => void;
  resetFilters: () => void;
}

const defaults = {
  dateFrom: null,
  dateTo: null,
  charges: [] as string[],
  races: [] as string[],
  sexes: [] as string[],
  ageGroups: [] as string[],
  districts: [] as string[],
};

export const useArrestStore = create<ArrestFilterState>((set) => ({
  ...defaults,
  setDateFrom: (v) => set({ dateFrom: v }),
  setDateTo: (v) => set({ dateTo: v }),
  setCharges: (v) => set({ charges: v }),
  setRaces: (v) => set({ races: v }),
  setSexes: (v) => set({ sexes: v }),
  setAgeGroups: (v) => set({ ageGroups: v }),
  setDistricts: (v) => set({ districts: v }),
  resetFilters: () => set(defaults),
}));
