/** Compact incident record — daily aggregation */
export interface IncidentRecord {
  /** date YYYY-MM-DD */
  d: string;
  /** offense type (offincident) */
  ot: string;
  /** NIBRS crime against (Person, Property, Society, Group B) */
  cag: string;
  /** NIBRS offense group / category (Assault Offenses, Larceny/Theft, etc.) */
  ca: string;
  /** council district */
  di: string;
  /** zip code */
  zi: string;
  /** NIBRS crime (specific offense, e.g. Simple Assault) */
  n: string;
  /** case status (Cleared (Arrestee Age 17 or Under), Open, Suspended, etc.) */
  cs: string;
  /** count */
  c: number;
}

/** Hourly distribution row for Time of Day page */
export interface IncidentHourly {
  /** hour 0-23 */
  h: number;
  /** day of week 0=Sun..6=Sat */
  dw: number;
  /** count */
  c: number;
}

/** Location point for dot map (aggregated by unique lat/lon per date) */
export interface IncidentPoint {
  /** latitude */
  lat: number;
  /** longitude */
  lon: number;
  /** case status */
  cs: string;
  /** NIBRS category */
  ca: string;
  /** date YYYY-MM-DD */
  d: string;
  /** count at this location */
  c: number;
}

/** NIBRS tree node for frontend tree filter */
export interface NIBRSTreeNode {
  crimeAgainst: string;
  offenseGroup: string;
  nibrsCodes: { code: string; description: string }[];
}

export interface IncidentPayload {
  lastUpdated: string;
  dataThrough: string;
  dataFrom: string;
  records: IncidentRecord[];
  hourly: IncidentHourly[];
  points: IncidentPoint[];
  nibrsTree: NIBRSTreeNode[];
  offenseTypes: string[];
  crimeAgainsts: string[];
  categories: string[];
  districts: string[];
  zipCodes: string[];
  nibrsCodes: string[];
  caseStatuses: string[];
  summary: {
    total: number;
    ytdCurrent: number;
    ytdPrior: number;
    pctChange: number;
  };
}
