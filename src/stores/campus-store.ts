"use client";

import { create } from "zustand";

interface CampusFilterState {
  schoolYear: string | null;
  campuses: string[];
  categories: string[];
  incidentTypes: string[];
  actions: string[];
  races: string[];
  sexes: string[];
  grades: string[];
  setSchoolYear: (v: string | null) => void;
  setCampuses: (v: string[]) => void;
  setCategories: (v: string[]) => void;
  setIncidentTypes: (v: string[]) => void;
  setActions: (v: string[]) => void;
  setRaces: (v: string[]) => void;
  setSexes: (v: string[]) => void;
  setGrades: (v: string[]) => void;
  resetFilters: () => void;
}

const defaults = {
  schoolYear: null,
  campuses: [] as string[],
  categories: [] as string[],
  incidentTypes: [] as string[],
  actions: [] as string[],
  races: [] as string[],
  sexes: [] as string[],
  grades: [] as string[],
};

export const useCampusStore = create<CampusFilterState>((set) => ({
  ...defaults,
  setSchoolYear: (v) => set({ schoolYear: v }),
  setCampuses: (v) => set({ campuses: v }),
  setCategories: (v) => set({ categories: v }),
  setIncidentTypes: (v) => set({ incidentTypes: v }),
  setActions: (v) => set({ actions: v }),
  setRaces: (v) => set({ races: v }),
  setSexes: (v) => set({ sexes: v }),
  setGrades: (v) => set({ grades: v }),
  resetFilters: () => set(defaults),
}));
