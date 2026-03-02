"use client";

import { create } from "zustand";

interface CampusFilterState {
  schoolYear: string | null;
  campuses: number[];
  types: string[];
  sections: string[];
  schoolType: string | null;
  schoolNames: string[];
  setSchoolYear: (v: string | null) => void;
  setCampuses: (v: number[]) => void;
  setTypes: (v: string[]) => void;
  setSections: (v: string[]) => void;
  setSchoolType: (v: string | null) => void;
  setSchoolNames: (v: string[]) => void;
  resetFilters: () => void;
}

const defaults = {
  schoolYear: null as string | null,
  campuses: [] as number[],
  types: [] as string[],
  sections: [] as string[],
  schoolType: null as string | null,
  schoolNames: [] as string[],
};

export const useCampusStore = create<CampusFilterState>((set) => ({
  ...defaults,
  setSchoolYear: (v) => set({ schoolYear: v }),
  setCampuses: (v) => set({ campuses: v }),
  setTypes: (v) => set({ types: v }),
  setSections: (v) => set({ sections: v }),
  setSchoolType: (v) => set({ schoolType: v }),
  setSchoolNames: (v) => set({ schoolNames: v }),
  resetFilters: () => set(defaults),
}));
