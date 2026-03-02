/**
 * Campus Discipline Data — TEA format.
 * Each row is a campus/heading-name/value triple from TEA CAMPUS_summary CSVs.
 * Joined with Directory2024.csv for school metadata and filtered to Dallas County.
 * Joined with XWalk-Discipline on HEADING NAME for type/description.
 */

/** Compact CAMPUS discipline record */
export interface CampusRecord {
  /** school year e.g. "2023-2024" */
  sy: string;
  /** campus number (TEA CAMPUS code) */
  cn: number;
  /** campus name */
  nm: string;
  /** section (from TEA CSV SECTION column) */
  se: string;
  /** heading name (raw from TEA CSV) */
  hn: string;
  /** type (from XWalk-Discipline: Incident Type, Race/Ethnicity, etc.) */
  tp: string;
  /** description (from XWalk-Discipline) */
  ds: string;
  /** value (count from TEA) */
  v: number;
}

/** School metadata from Directory join */
export interface CampusSchool {
  /** campus number */
  cn: number;
  /** school name */
  name: string;
  /** instruction type (Regular, Alternative, etc.) */
  instructionType: string;
  /** grade range */
  gradeRange: string;
  /** latitude (geocoded from address) */
  lat: number;
  /** longitude (geocoded from address) */
  lon: number;
  /** enrollment count */
  enrollment: number;
  /** district type: "CHARTER" or "INDEPENDENT" etc. */
  districtType: string;
  /** charter type (e.g. "OPEN ENROLLMENT CHARTER") or empty */
  charterType: string;
}

export interface CampusPayload {
  lastUpdated: string;
  records: CampusRecord[];
  schools: CampusSchool[];
  schoolYears: string[];
  sections: string[];
  types: string[];
  headingNames: string[];
  descriptions: string[];
  summary: {
    totalRecords: number;
    totalSchools: number;
  };
}
