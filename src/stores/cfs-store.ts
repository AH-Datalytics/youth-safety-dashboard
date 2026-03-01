"use client";

import { create } from "zustand";

interface CFSFilterState {
  dateFrom: string | null;
  dateTo: string | null;
  callTypes: string[];
  priorities: string[];
  districts: string[];
  natures: string[];
  setDateFrom: (v: string | null) => void;
  setDateTo: (v: string | null) => void;
  setCallTypes: (v: string[]) => void;
  setPriorities: (v: string[]) => void;
  setDistricts: (v: string[]) => void;
  setNatures: (v: string[]) => void;
  resetFilters: () => void;
}

const defaults = {
  dateFrom: null,
  dateTo: null,
  callTypes: [] as string[],
  priorities: [] as string[],
  districts: [] as string[],
  natures: [] as string[],
};

export const useCFSStore = create<CFSFilterState>((set) => ({
  ...defaults,
  setDateFrom: (v) => set({ dateFrom: v }),
  setDateTo: (v) => set({ dateTo: v }),
  setCallTypes: (v) => set({ callTypes: v }),
  setPriorities: (v) => set({ priorities: v }),
  setDistricts: (v) => set({ districts: v }),
  setNatures: (v) => set({ natures: v }),
  resetFilters: () => set(defaults),
}));
