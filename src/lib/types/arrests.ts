/** Compact arrest record — daily aggregation */
export interface ArrestRecord {
  /** date YYYY-MM-DD */
  d: string;
  /** charge description (araction) */
  ch: string;
  /** race */
  ra: string;
  /** sex */
  sx: string;
  /** age group broad (18-24, 25-40, 41-55, 56-70, Over 70) — per PBI */
  ag: string;
  /** young adult binary (Young Adult (18-24) or Adult (25+)) — per PBI */
  ya: string;
  /** council district */
  di: string;
  /** count */
  c: number;
}

export interface ArrestPayload {
  lastUpdated: string;
  dataThrough: string;
  records: ArrestRecord[];
  charges: string[];
  races: string[];
  sexes: string[];
  ageGroups: string[];
  youngAdultGroups: string[];
  districts: string[];
  summary: {
    total: number;
    ytdCurrent: number;
    ytdPrior: number;
    pctChange: number;
  };
}
