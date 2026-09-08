/**
 * TJJD Youth Court Referrals.
 *
 * Two sources produce this payload:
 *   - A client-supplied Family Code 58.009 extract ("Redacted Youth Justice
 *     Data.xlsx"): monthly, with age/disposition/gender/offense/race splits and
 *     a ZIP sheet. Used for Dallas.
 *   - TJJD's statewide county-level referral file on data.texas.gov: annual,
 *     offense-type splits only, no ZIP. Used where no 58.009 extract exists.
 *
 * `granularity` and `totalCategory` let the UI render either shape without
 * knowing which source it came from.
 */

/** TJJD referral record (from main data sheet, unpivoted) */
export interface TJJDRecord {
  /** category (Age, Disposition, Gender, Offense Category, Offense Type, Race/Ethnicity) */
  cat: string;
  /** description (Age 10 & 11, Felony, Male, etc.) */
  desc: string;
  /** year (2020, 2021, 2022, 2023) */
  yr: string;
  /** month number 1-12 */
  mo: number;
  /** month name (January, February, etc.) */
  mn: string;
  /** value (total referrals) */
  v: number;
}

/** TJJD ZIP code referral record */
export interface TJJDZipRecord {
  /** ZIP code */
  zip: number;
  /** year */
  yr: string;
  /** referral count */
  v: number;
}

export interface TJJDPayload {
  lastUpdated: string;
  records: TJJDRecord[];
  zipRecords: TJJDZipRecord[];
  categories: string[];
  descriptions: string[];
  years: string[];
  /**
   * Time granularity of `records`. Annual sources set `mo` to 1 on every row,
   * so the time axis must be labelled by year alone.
   */
  granularity?: "monthly" | "annual";
  /**
   * Name of the category that partitions referrals exactly once, used for
   * totals and the time series. Every other category is a re-cut of the same
   * referrals, so summing across categories would multiply-count.
   * Defaults to "Gender" (the Dallas 58.009 shape).
   */
  totalCategory?: string;
  /** Human-readable source label shown on the page. */
  sourceLabel?: string;
  summary: {
    totalReferrals: number;
    totalZipReferrals: number;
  };
}
