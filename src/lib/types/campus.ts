/** Compact CAMPUS discipline record */
export interface CampusRecord {
  /** school year e.g. "2023-24" */
  sy: string;
  /** campus name */
  cn: string;
  /** category (Violence, Substance, Weapons, etc.) */
  ca: string;
  /** incident type */
  in: string;
  /** disciplinary action (ISS, OSS, DAEP, Expulsion) */
  ac: string;
  /** race */
  ra: string;
  /** sex */
  sx: string;
  /** grade level */
  gr: string;
  /** economic disadvantage flag */
  ec: string;
  /** count */
  c: number;
}

export interface CampusPayload {
  lastUpdated: string;
  records: CampusRecord[];
  schoolYears: string[];
  campuses: string[];
  categories: string[];
  incidentTypes: string[];
  actions: string[];
  races: string[];
  sexes: string[];
  grades: string[];
  summary: {
    totalIncidents: number;
    totalByAction: Record<string, number>;
  };
}
