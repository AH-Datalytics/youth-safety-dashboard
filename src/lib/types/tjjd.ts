/** Compact TJJD referral record */
export interface TJJDRecord {
  /** school year e.g. "2023-24" */
  sy: string;
  /** county */
  co: string;
  /** offense type */
  of: string;
  /** race */
  ra: string;
  /** sex */
  sx: string;
  /** age group */
  ag: string;
  /** count */
  c: number;
}

export interface TJJDPayload {
  lastUpdated: string;
  records: TJJDRecord[];
  schoolYears: string[];
  counties: string[];
  offenses: string[];
  races: string[];
  sexes: string[];
  ageGroups: string[];
  summary: {
    totalReferrals: number;
    ytdCurrent: number;
    ytdPrior: number;
    pctChange: number;
  };
}
