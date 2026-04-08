/** Compact 311 request record — daily aggregation */
export interface Request311Record {
  /** date YYYY-MM-DD */
  d: string;
  /** service request type */
  rt: string;
  /** department */
  dp: string;
  /** status (Open, Closed, In Progress) */
  st: string;
  /** priority group (Emergency, Standard, In Order, Not Prioritized, Other) */
  pg: string;
  /** council district */
  di: string;
  /** zip code */
  zi: string;
  /** count */
  c: number;
}

/** Location point for dot map */
export interface Request311Point {
  /** latitude */
  lat: number;
  /** longitude */
  lon: number;
  /** service request type */
  rt: string;
  /** priority group */
  pg: string;
  /** date YYYY-MM-DD */
  d: string;
  /** count at this location */
  c: number;
}

export interface Request311Payload {
  lastUpdated: string;
  dataThrough: string;
  records: Request311Record[];
  points: Request311Point[];
  requestTypes: string[];
  departments: string[];
  statuses: string[];
  priorityGroups: string[];
  districts: string[];
  zipCodes: string[];
  summary: {
    total: number;
    ytdCurrent: number;
    ytdPrior: number;
    pctChange: number;
  };
}
