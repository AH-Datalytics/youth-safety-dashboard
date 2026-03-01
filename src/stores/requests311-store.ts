"use client";

import { create } from "zustand";

interface Requests311FilterState {
  dateFrom: string | null;
  dateTo: string | null;
  requestTypes: string[];
  departments: string[];
  statuses: string[];
  districts: string[];
  zipCodes: string[];
  setDateFrom: (v: string | null) => void;
  setDateTo: (v: string | null) => void;
  setRequestTypes: (v: string[]) => void;
  setDepartments: (v: string[]) => void;
  setStatuses: (v: string[]) => void;
  setDistricts: (v: string[]) => void;
  setZipCodes: (v: string[]) => void;
  resetFilters: () => void;
}

const defaults = {
  dateFrom: null,
  dateTo: null,
  requestTypes: [] as string[],
  departments: [] as string[],
  statuses: [] as string[],
  districts: [] as string[],
  zipCodes: [] as string[],
};

export const useRequests311Store = create<Requests311FilterState>((set) => ({
  ...defaults,
  setDateFrom: (v) => set({ dateFrom: v }),
  setDateTo: (v) => set({ dateTo: v }),
  setRequestTypes: (v) => set({ requestTypes: v }),
  setDepartments: (v) => set({ departments: v }),
  setStatuses: (v) => set({ statuses: v }),
  setDistricts: (v) => set({ districts: v }),
  setZipCodes: (v) => set({ zipCodes: v }),
  resetFilters: () => set(defaults),
}));
