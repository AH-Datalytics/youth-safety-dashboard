/** Compact CFS record — daily aggregation */
export interface CFSRecord {
  /** date YYYY-MM-DD */
  d: string;
  /** call type */
  ct: string;
  /** priority */
  pr: string;
  /** district */
  di: string;
  /** nature of call */
  na: string;
  /** count */
  c: number;
}

/** Hourly distribution row */
export interface CFSHourly {
  /** hour 0-23 */
  h: number;
  /** day of week 0=Sun..6=Sat */
  dw: number;
  /** count */
  c: number;
}

export interface CFSPayload {
  lastUpdated: string;
  dataThrough: string;
  records: CFSRecord[];
  hourly: CFSHourly[];
  callTypes: string[];
  priorities: string[];
  districts: string[];
  natures: string[];
  summary: {
    total: number;
    avgDaily: number;
    ytdCurrent: number;
    ytdPrior: number;
    pctChange: number;
  };
}
