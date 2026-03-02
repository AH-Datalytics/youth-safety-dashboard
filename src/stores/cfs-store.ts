"use client";

import { create } from "zustand";

interface CFSFilterState {
  dateFrom: string | null;
  dateTo: string | null;
  callTypes: string[];
  categories: string[];
  subCategories: string[];
  priorities: string[];
  districts: string[];
  dispositionGroups: string[];
  setDateFrom: (v: string | null) => void;
  setDateTo: (v: string | null) => void;
  setCallTypes: (v: string[]) => void;
  setCategories: (v: string[]) => void;
  setSubCategories: (v: string[]) => void;
  setPriorities: (v: string[]) => void;
  setDistricts: (v: string[]) => void;
  setDispositionGroups: (v: string[]) => void;
  resetFilters: () => void;
}

const defaults = {
  dateFrom: null,
  dateTo: null,
  callTypes: [] as string[],
  categories: [] as string[],
  subCategories: [] as string[],
  priorities: [] as string[],
  districts: [] as string[],
  dispositionGroups: [] as string[],
};

export const useCFSStore = create<CFSFilterState>((set) => ({
  ...defaults,
  setDateFrom: (v) => set({ dateFrom: v }),
  setDateTo: (v) => set({ dateTo: v }),
  setCallTypes: (v) => set({ callTypes: v }),
  setCategories: (v) => set({ categories: v }),
  setSubCategories: (v) => set({ subCategories: v }),
  setPriorities: (v) => set({ priorities: v }),
  setDistricts: (v) => set({ districts: v }),
  setDispositionGroups: (v) => set({ dispositionGroups: v }),
  resetFilters: () => set(defaults),
}));
