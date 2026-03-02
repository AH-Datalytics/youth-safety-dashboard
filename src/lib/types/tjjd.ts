/**
 * TJJD Youth Court Referrals — wide-to-long unpivoted format.
 * Source: "Redacted Youth Justice Data.xlsx"
 *   - "TJJD Data" sheet: Category/Description rows × monthly columns → unpivot
 *   - "Zip Code" sheet: ZIP rows × year columns → unpivot, filter to Dallas-area
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
  summary: {
    totalReferrals: number;
    totalZipReferrals: number;
  };
}
