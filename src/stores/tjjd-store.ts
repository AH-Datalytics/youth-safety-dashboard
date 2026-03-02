"use client";

import { create } from "zustand";

interface TJJDFilterState {
  /** Brush start index (null = no brush selection, show all) */
  startIndex: number | null;
  /** Brush end index */
  endIndex: number | null;
  /** Selected category for detail breakdown */
  category: string | null;
  setRange: (start: number | null, end: number | null) => void;
  setCategory: (v: string | null) => void;
  resetFilters: () => void;
}

const defaults = {
  startIndex: null as number | null,
  endIndex: null as number | null,
  category: "Age" as string | null,
};

export const useTJJDStore = create<TJJDFilterState>((set) => ({
  ...defaults,
  setRange: (start, end) => set({ startIndex: start, endIndex: end }),
  setCategory: (v) => set({ category: v }),
  resetFilters: () => set(defaults),
}));
