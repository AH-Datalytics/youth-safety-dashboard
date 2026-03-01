/** Compact arrest record — daily aggregation */
export interface ArrestRecord {
  /** date YYYY-MM-DD */
  d: string;
  /** charge description */
  ch: string;
  /** race */
  ra: string;
  /** sex */
  sx: string;
  /** age group (Juvenile, 17-24, 25-34, 35-44, 45+) */
  ag: string;
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
  districts: string[];
  summary: {
    total: number;
    ytdCurrent: number;
    ytdPrior: number;
    pctChange: number;
  };
}
