export interface JurisdictionConfig {
  id: string;
  name: string;
  state: string;
  socrata: {
    baseUrl: string;
    incidents: string;
    arrests: string;
    requests311: string;
  };
  geo: {
    center: [number, number];
    zoom: number;
    bounds: [[number, number], [number, number]];
  };
  dateRange: {
    floor: string;
  };
}

export const JURISDICTIONS: Record<string, JurisdictionConfig> = {
  "dallas-county": {
    id: "dallas-county",
    name: "Dallas County",
    state: "TX",
    socrata: {
      baseUrl: "https://www.dallasopendata.com/resource",
      incidents: "qv6i-rri7",
      arrests: "sdr7-6v3j",
      requests311: "gc4d-8a49",
    },
    geo: {
      center: [32.7767, -96.797],
      zoom: 11,
      bounds: [
        [32.55, -97.05],
        [33.05, -96.45],
      ],
    },
    dateRange: {
      floor: "2017-01-01",
    },
  },
};

export const DEFAULT_JURISDICTION = "dallas-county";

export function getJurisdiction(id?: string): JurisdictionConfig {
  return JURISDICTIONS[id ?? DEFAULT_JURISDICTION] ?? JURISDICTIONS[DEFAULT_JURISDICTION];
}
