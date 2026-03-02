/**
 * Shared normalization utilities for ETL scripts.
 */

/** Canonical district names — map variant spellings to consistent form */
const DISTRICT_MAP: Record<string, string> = {
  "CENTRAL": "Central",
  "central": "Central",
  "NORTH CENTRAL": "North Central",
  "North central": "North Central",
  "NORTHCENTRAL": "North Central",
  "north central": "North Central",
  "NORTH EAST": "Northeast",
  "NORTHEAST": "Northeast",
  "North East": "Northeast",
  "northeast": "Northeast",
  "NORTH WEST": "Northwest",
  "NORTHWEST": "Northwest",
  "North West": "Northwest",
  "northwest": "Northwest",
  "SOUTH CENTRAL": "South Central",
  "South central": "South Central",
  "SOUTHCENTRAL": "South Central",
  "south central": "South Central",
  "SOUTH EAST": "Southeast",
  "SOUTHEAST": "Southeast",
  "South East": "Southeast",
  "southeast": "Southeast",
  "SOUTH WEST": "Southwest",
  "SOUTHWEST": "Southwest",
  "South West": "Southwest",
  "southwest": "Southwest",
};

/** Normalize a police district name to canonical form */
export function normalizeDistrict(raw: string | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return DISTRICT_MAP[trimmed] ?? trimmed;
}

/** Priority label mapping per PBI DAX */
export const PRIORITY_LABELS: Record<number, string> = {
  1: "Emergency",
  2: "Urgent",
  3: "General Service",
  4: "Non-Critical",
};

/** Map priority number string to label */
export function priorityLabel(raw: string | number | undefined): string {
  if (raw === undefined || raw === null || raw === "") return "";
  const num = typeof raw === "number" ? raw : parseInt(String(raw));
  return PRIORITY_LABELS[num] ?? String(raw);
}

/**
 * Map UCR Disposition to case status label.
 * Socrata `ucr_disp` values include age info, e.g.:
 *   "CBA (Over Age 17)", "CBA (Age 17)", "CBA (Under 17)",
 *   "CBEA (Over Age 17)", "CBEA (Age 17)", "CBEA (Under Age 17)",
 *   "Suspended", "Open", "Closed", "Pending", null/empty
 */
export function caseStatus(ucrDisp: string | undefined): string {
  if (!ucrDisp) return "Unknown";
  const v = ucrDisp.trim();
  if (!v) return "Unknown";
  const upper = v.toUpperCase();

  // Cleared by Arrest or Cleared by Exceptional means — age 17 or under
  if (
    upper.startsWith("CBA (AGE 17") ||
    upper.startsWith("CBA (UNDER") ||
    upper.startsWith("CBEA (AGE 17") ||
    upper.startsWith("CBEA (UNDER")
  ) {
    return "Cleared (Arrestee Age 17 or Under)";
  }

  // Cleared — over age 17
  if (upper.startsWith("CBA (OVER") || upper.startsWith("CBEA (OVER")) {
    return "Cleared (Arrestee 18 or Older)";
  }

  // Bare CBA/CBEA without age qualifier
  if (upper === "CBA" || upper.startsWith("CBA")) return "Cleared (Arrestee 18 or Older)";
  if (upper === "CBEA" || upper.startsWith("CBEA")) return "Cleared (Arrestee 18 or Older)";

  if (upper === "OPEN" || upper === "O") return "Open";
  if (upper === "CLOSED" || upper === "C") return "Closed";
  if (upper === "SUSPENDED" || upper === "SUS") return "Suspended";

  return "Unknown";
}

/** Title Case converter — "ASSAULT OFFENSES" → "Assault Offenses" */
export function titleCase(s: string): string {
  if (!s) return s;
  return s
    .toLowerCase()
    .replace(/(?:^|\s|[-/])\S/g, (ch) => ch.toUpperCase());
}

/** Normalize crimeAgainst: merge "PERSON, PROPERTY, OR SOCIETY" + "MISCELLANEOUS" → "All Other Offenses" */
const MISC_CRIME_AGAINST = new Set([
  "MISCELLANEOUS",
  "PERSON, PROPERTY, OR SOCIETY",
]);

export function normalizeCrimeAgainst(raw: string): string {
  if (!raw || raw === "Unknown") return "All Other Offenses";
  const upper = raw.trim().toUpperCase();
  if (MISC_CRIME_AGAINST.has(upper)) return "All Other Offenses";
  return titleCase(raw.trim());
}

/** Normalize offense group: title case */
export function normalizeOffenseGroup(raw: string): string {
  if (!raw || raw === "Unknown") return "All Other Offenses";
  const upper = raw.trim().toUpperCase();
  if (upper === "MISCELLANEOUS") return "All Other Offenses";
  return titleCase(raw.trim());
}

/** Normalize NIBRS crime name: title case */
export function normalizeNibrs(raw: string): string {
  if (!raw) return "";
  return titleCase(raw.trim());
}

/** 311 Priority Groups mapping per PBI DAX */
export function priorityGroup311(raw: string | undefined): string {
  if (!raw || raw.trim() === "") return "Other";
  const v = raw.trim();
  if (v === "MCC" || v === "CMO") return "Other";
  return v;
}
