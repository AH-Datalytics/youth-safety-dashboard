"use client";

import { create } from "zustand";

interface TJJDFilterState {
  schoolYear: string | null;
  counties: string[];
  offenses: string[];
  races: string[];
  sexes: string[];
  ageGroups: string[];
  setSchoolYear: (v: string | null) => void;
  setCounties: (v: string[]) => void;
  setOffenses: (v: string[]) => void;
  setRaces: (v: string[]) => void;
  setSexes: (v: string[]) => void;
  setAgeGroups: (v: string[]) => void;
  resetFilters: () => void;
}

const defaults = {
  schoolYear: null,
  counties: [] as string[],
  offenses: [] as string[],
  races: [] as string[],
  sexes: [] as string[],
  ageGroups: [] as string[],
};

export const useTJJDStore = create<TJJDFilterState>((set) => ({
  ...defaults,
  setSchoolYear: (v) => set({ schoolYear: v }),
  setCounties: (v) => set({ counties: v }),
  setOffenses: (v) => set({ offenses: v }),
  setRaces: (v) => set({ races: v }),
  setSexes: (v) => set({ sexes: v }),
  setAgeGroups: (v) => set({ ageGroups: v }),
  resetFilters: () => set(defaults),
}));
