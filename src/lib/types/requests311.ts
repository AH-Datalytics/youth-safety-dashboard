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
  /** council district */
  di: string;
  /** zip code */
  zi: string;
  /** count */
  c: number;
}

export interface Request311Payload {
  lastUpdated: string;
  dataThrough: string;
  records: Request311Record[];
  requestTypes: string[];
  departments: string[];
  statuses: string[];
  districts: string[];
  zipCodes: string[];
  summary: {
    total: number;
    ytdCurrent: number;
    ytdPrior: number;
    pctChange: number;
  };
}
