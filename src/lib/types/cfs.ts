/** Compact CFS record — daily aggregation */
export interface CFSRecord {
  /** date YYYY-MM-DD */
  d: string;
  /** call type (Problem field from source) */
  ct: string;
  /** category (from crosswalk: Medical, NIBRS Person, etc.) */
  cat: string;
  /** sub-category (from crosswalk) */
  sc: string;
  /** priority label (Emergency, Urgent, General Service, Non-Critical) */
  pr: string;
  /** district (MDivision) */
  di: string;
  /** disposition group (from crosswalk) */
  dg: string;
  /** count */
  c: number;
  /** avg response time minutes (for this aggregation bucket) */
  rt: number;
  /** avg time spent minutes */
  ts: number;
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

/** NIBRS-style tree node for call type hierarchy */
export interface CFSTreeNode {
  category: string;
  subCategories: string[];
}

export interface CFSPayload {
  lastUpdated: string;
  dataThrough: string;
  records: CFSRecord[];
  hourly: CFSHourly[];
  callTypes: string[];
  categories: string[];
  subCategories: string[];
  priorities: string[];
  districts: string[];
  dispositionGroups: string[];
  categoryTree: CFSTreeNode[];
  summary: {
    total: number;
    avgDaily: number;
    avgResponseTime: number;
    avgTimeSpent: number;
    ytdCurrent: number;
    ytdPrior: number;
    pctChange: number;
  };
}
