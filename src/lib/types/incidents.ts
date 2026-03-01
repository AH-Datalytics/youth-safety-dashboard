/** Compact incident record — daily aggregation */
export interface IncidentRecord {
  /** date YYYY-MM-DD */
  d: string;
  /** offense type */
  ot: string;
  /** NIBRS category (Person, Property, Society, Group B) */
  ca: string;
  /** council district */
  di: string;
  /** zip code */
  zi: string;
  /** NIBRS code */
  n: string;
  /** count */
  c: number;
}

export interface IncidentPayload {
  lastUpdated: string;
  dataThrough: string;
  records: IncidentRecord[];
  offenseTypes: string[];
  categories: string[];
  districts: string[];
  zipCodes: string[];
  nibrsCodes: string[];
  summary: {
    total: number;
    ytdCurrent: number;
    ytdPrior: number;
    pctChange: number;
  };
}
