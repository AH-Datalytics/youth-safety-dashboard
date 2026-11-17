/**
 * ETL: CAMPUS Disciplinary Data (Local CSVs — TEA format)
 * Source: data/source/CAMPUS_summary_18.csv through CAMPUS_summary_26.csv (layout changed at _25; see CLAUDE.md)
 * Crosswalk: data/crosswalks/XWalk - Discipline.xlsx
 * Directory: data/source/Directory2024.csv
 * Output: data/generated/campus-data.json(.gz)
 *
 * TEA CSV format:
 *   - 6 header rows to skip, then promote headers
 *   - Columns: YEAR, AGG_LEVEL, CAMPUS, REGION, DISTRICT NAME AND NUMBER,
 *     CHARTER_STATUS, CAMPUS NAME AND NUMBER, SECTION, HEADING, HEADNAME, YRxx (value)
 *   - CAMPUS NAME AND NUMBER: first 10 chars = name, split on space for campus number
 *   - VALUE column name varies by file (YR18, YR19, ... YR24)
 *   - -999 sentinel → null
 *   - Join to Directory2024.csv on CAMPUS number for school metadata
 *   - Filter to County Name = the jurisdiction's TEA county (e.g. "DALLAS COUNTY")
 */
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import type { CampusPayload, CampusRecord, CampusSchool } from "../src/lib/types/campus";
import { loadDisciplineCrosswalk } from "./utils/load-crosswalks";

const CAMPUS_DIR = path.join(process.cwd(), "data", "source");
const DIRECTORY_PATH = path.join(process.cwd(), "data", "source", "Directory2024.csv");
const GEOCODE_PATH = path.join(process.cwd(), "data", "crosswalks", "school-geocodes.json");
const SKIP_ROWS = 6;
const DEFAULT_COUNTY = "DALLAS COUNTY";

/** School year mapping by filename suffix */
const SY_MAP: Record<string, string> = {
  "18": "2017-2018",
  "19": "2018-2019",
  "20": "2019-2020",
  "21": "2020-2021",
  "22": "2021-2022",
  "23": "2022-2023",
  "24": "2023-2024",
  "25": "2024-2025",
  "26": "2025-2026",
};

const REASON_SECTION = "W-REASON INCIDENT COUNTS";
const ACTION_SECTION = "X-DISCIPLINE ACTION COUNTS";

/**
 * TEA's new layout (2024-25 onward) renamed the sections. Incident reasons map straight
 * onto the old reason section the UI reads.
 */
const NEW_REASON_SECTION = "H-REASON INCIDENT COUNTS";

/**
 * Discipline actions, new layout: TEA masks far more of the per-action-code cells
 * (section J) than it did before, which made 2024-25 suspensions look ~40% lower than
 * TEA's own totals. So actions come from the unmasked campus summary (section B,
 * ACTION COUNTS) instead, and section J is dropped. Ben approved 2026-11-17.
 * Summary ISS/OSS include part-day suspensions.
 */
const NEW_SUMMARY_SECTION = "B-DISCIPLINE DATA";
const NEW_DROPPED_ACTION_SECTION = "J-DISCIPLINE ACTION";
const SUMMARY_ACTIONS: Record<string, string> = {
  "IN SCHOOL SUSPENSIONS": "In-School Suspension",
  "OUT OF SCHOOL SUSPENSIONS": "Out-of-School Suspension",
  "DAEP PLACEMENTS": "DAEP Placement",
  EXPULSIONS: "Expulsion",
  "JJAEP PLACEMENTS": "JJAEP Placement",
};

/**
 * Old-layout action codes grouped onto the same five labels, so the series is continuous.
 * Codes not listed (continuations of prior-year or other-district placements, and
 * "mandatory action not taken") are not new discipline actions and are not counted.
 */
const OLD_ACTION_GROUPS: Record<string, string> = {
  "06": "In-School Suspension",
  "26": "In-School Suspension", // part day
  "05": "Out-of-School Suspension",
  "25": "Out-of-School Suspension", // part day
  "07": "DAEP Placement",
  "14": "DAEP Placement", // court ordered
  "54": "DAEP Placement", // SPED hearing
  "01": "Expulsion",
  "03": "Expulsion",
  "04": "Expulsion",
  "50": "Expulsion",
  "52": "Expulsion",
  "53": "Expulsion",
  "02": "JJAEP Placement",
  "13": "JJAEP Placement",
  "51": "JJAEP Placement",
  "60": "JJAEP Placement",
};

/** Renamed or recoded TEA headings → one display label, so trends stay continuous. */
const DESC_ALIASES: Record<string, string> = {
  "06-ABUSABLE VOLATILE CHEMICAL": "Abuse Of A Volatile Chemical",
  "04-CONTROL SUB/DRUGS UNTIL 9/1/23": "Controlled Substance/Drugs",
  "62-MARIHUANA OR THC": "Marijuana or THC",
  "63-E-CIGARETTE": "E-Cigarette - Possess or Use",
  "67-POSSESSES OR USES E-CIGARETTE": "E-Cigarette - Possess or Use",
  "68-SELL GIVE DELIVERS E-CIGARETT": "E-Cigarette - Sell, Give or Deliver",
};

/** "65-THREAT IMMED SAFE STUDNT CLASS" → "Threat Immed Safe Studnt Class" */
function titleFromHeading(h: string): string {
  return h
    .replace(/^\d+-/, "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

interface DirectoryEntry {
  campusNumber: number;
  schoolName: string;
  countyName: string;
  instructionType: string;
  gradeRange: string;
  lat: number;
  lon: number;
  enrollment: number;
  districtType: string;
  charterType: string;
}

function loadGeocodes(): Record<string, { lat: number; lon: number }> {
  if (!fs.existsSync(GEOCODE_PATH)) {
    console.warn("[campus-etl] school-geocodes.json not found — map will have no coordinates");
    return {};
  }
  const data = JSON.parse(fs.readFileSync(GEOCODE_PATH, "utf-8"));
  console.log(`[campus-etl] Loaded ${Object.keys(data).length} geocoded coordinates`);
  return data;
}

function loadDirectory(county: string): Map<number, DirectoryEntry> {
  const map = new Map<number, DirectoryEntry>();
  if (!fs.existsSync(DIRECTORY_PATH)) {
    console.warn("[campus-etl] Directory2024.csv not found");
    return map;
  }

  const geocodes = loadGeocodes();

  const text = fs.readFileSync(DIRECTORY_PATH, "utf-8");
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

  for (const row of parsed.data as Record<string, string>[]) {
    // Column names from TEA Directory CSV
    const campusStr = (row["School Number"] ?? row["CAMPUS"] ?? row["school_number"] ?? "").replace(/'/g, "").trim();
    const campusNumber = parseInt(campusStr);
    if (isNaN(campusNumber)) continue;

    const countyName = (row["County Name"] ?? row["COUNTY NAME"] ?? "").trim().toUpperCase();

    // Geocoded lat/lon from Census API (Directory has no coordinate columns)
    // Try both zero-padded (from geocode) and unpadded campus number
    const geo = geocodes[campusStr] ?? geocodes[String(campusNumber)];

    map.set(campusNumber, {
      campusNumber,
      schoolName: (row["School Name"] ?? row["SCHOOL NAME"] ?? "").trim(),
      countyName,
      instructionType: (row["Instruction Type"] ?? row["INSTRUCTION TYPE"] ?? "").trim(),
      gradeRange: (row["Grade Range"] ?? row["GRADE RANGE"] ?? "").trim(),
      lat: geo?.lat ?? 0,
      lon: geo?.lon ?? 0,
      enrollment: parseInt(row["School Enrollment as of Oct 2024"] ?? row["Enrollment"] ?? "0") || 0,
      districtType: (row["District Type"] ?? "").trim(),
      charterType: (row["Charter Type"] ?? "").trim(),
    });
  }

  console.log(`[campus-etl] Loaded ${map.size} schools from Directory`);
  const inCounty = Array.from(map.values()).filter((d) => d.countyName === county).length;
  console.log(`[campus-etl] ${county} schools: ${inCounty}`);
  return map;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export interface CampusETLConfig {
  /** TEA county name to filter the statewide extract to, e.g. "TARRANT COUNTY". */
  county?: string;
}

export async function runCampusETL(config?: CampusETLConfig): Promise<CampusPayload> {
  const county = (config?.county ?? DEFAULT_COUNTY).toUpperCase();
  console.log(`[campus-etl] Filtering statewide TEA extract to ${county}`);

  const csvFiles = fs.readdirSync(CAMPUS_DIR).filter(
    (f) => f.toLowerCase().startsWith("campus") && f.endsWith(".csv"),
  );

  if (csvFiles.length === 0) {
    console.log("[campus-etl] WARNING: No CAMPUS CSV files found, returning empty payload");
    return emptyPayload();
  }

  console.log(`[campus-etl] Found ${csvFiles.length} CSV files: ${csvFiles.join(", ")}`);

  // Load crosswalks
  const disciplineXwalk = loadDisciplineCrosswalk();
  const directory = loadDirectory(county);

  // Build set of in-county campus numbers
  const countyCampuses = new Set<number>();
  for (const [num, entry] of directory) {
    if (entry.countyName === county) {
      countyCampuses.add(num);
    }
  }

  const records: CampusRecord[] = [];
  const schoolYearSet = new Set<string>();
  const sectionSet = new Set<string>();
  const typeSet = new Set<string>();
  const headingNameSet = new Set<string>();
  const campusNumberSet = new Set<number>();
  let totalParsed = 0;
  let totalIncluded = 0;

  for (const csvFile of csvFiles) {
    const filePath = path.join(CAMPUS_DIR, csvFile);
    console.log(`[campus-etl] Processing: ${csvFile}`);

    // Determine school year from filename (e.g., "CAMPUS_summary_18.csv" → "2017-2018")
    const syMatch = csvFile.match(/(\d{2})\.csv$/);
    const schoolYear = syMatch ? (SY_MAP[syMatch[1]] ?? `20${syMatch[1]}`) : "Unknown";
    schoolYearSet.add(schoolYear);

    const text = fs.readFileSync(filePath, "utf-8");
    const lines = text.split("\n");

    // Skip header rows and find the actual data header line
    if (lines.length <= SKIP_ROWS) continue;

    // The header line is at index SKIP_ROWS (after skipping 6 rows)
    const headerLine = lines[SKIP_ROWS];
    const headers = parseCSVLine(headerLine);
    const colIdx: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) {
      colIdx[headers[i].toUpperCase()] = i;
    }

    // Find the value column (YR18, YR19, ..., YR24, or VALUE)
    let valueColIdx = -1;
    for (const h of headers) {
      if (h.toUpperCase().startsWith("YR") || h.toUpperCase() === "VALUE") {
        valueColIdx = headers.indexOf(h);
        break;
      }
    }
    // If no YR* found, try the last column
    if (valueColIdx === -1) valueColIdx = headers.length - 1;

    const campusNameNumIdx = colIdx["CAMPUS NAME AND NUMBER"] ?? -1;
    const campusIdx = colIdx["CAMPUS"] ?? -1;
    const sectionIdx = colIdx["SECTION"] ?? -1;
    const headingIdx = colIdx["HEADING"] ?? -1;
    const headnameIdx = colIdx["HEADNAME"] ?? colIdx["HEADING NAME"] ?? -1;
    // TEA changed the layout with 2025-26: the HEADING code column is gone, an INDICATOR
    // column splits each row into ACTION / STUDENT / INCIDENT counts, and sections were
    // renamed. Rows are normalized back onto the old section names the UI reads.
    const indicatorIdx = colIdx["INDICATOR"] ?? -1;

    for (let i = SKIP_ROWS + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      totalParsed++;

      // Extract campus number
      let campusNumber: number;
      if (campusIdx >= 0) {
        campusNumber = parseInt(values[campusIdx]) || 0;
      } else if (campusNameNumIdx >= 0) {
        // "CAMPUS NAME AND NUMBER" — per PBI: first 10 chars = name, rest = number
        // Actually, CAMPUS is a separate column. But if not available, parse from combined
        const combined = values[campusNameNumIdx] ?? "";
        const numPart = combined.substring(0, 10).trim();
        campusNumber = parseInt(numPart) || 0;
      } else {
        continue;
      }

      // Filter to the jurisdiction's county only
      if (countyCampuses.size > 0 && !countyCampuses.has(campusNumber)) continue;

      // Parse value
      const valueStr = values[valueColIdx] ?? "";
      const value = parseInt(valueStr);
      if (isNaN(value) || value === -999 || value === 0) continue; // -999 = null sentinel

      let section = sectionIdx >= 0 ? (values[sectionIdx] ?? "").trim() : "";
      // Some TEA files carry a 0x1A substitute byte where a character failed to encode
      // (e.g. "61-BULLYING \x1a TEC 37.0052(B)"); drop it so the crosswalk key matches.
      const headingName =
        headnameIdx >= 0 ? (values[headnameIdx] ?? "").replace(/\x1a/g, "").trim() : "";

      let type: string;
      let description: string;
      if (indicatorIdx >= 0 && section === NEW_SUMMARY_SECTION) {
        // New layout: actions come from the unmasked campus summary (see SUMMARY_ACTIONS).
        const label = SUMMARY_ACTIONS[headingName];
        if ((values[indicatorIdx] ?? "").trim() !== "ACTION COUNTS" || !label) continue;
        section = ACTION_SECTION;
        type = "Incident Type";
        description = label;
      } else {
        if (indicatorIdx >= 0) {
          // Student counts are distinct students, not actions: keep one count per row.
          if ((values[indicatorIdx] ?? "").trim() === "STUDENT COUNTS") continue;
          if (section === NEW_DROPPED_ACTION_SECTION) continue;
          if (section === NEW_REASON_SECTION) section = REASON_SECTION;
        }
        const dEntry = disciplineXwalk.get(headingName);
        if (section === ACTION_SECTION) {
          // Old layout: group action codes onto the summary labels; skip the rest.
          const label = OLD_ACTION_GROUPS[headingName.slice(0, 2)];
          if (!label) continue;
          type = "Incident Type";
          description = label;
        } else if (section === REASON_SECTION) {
          // Every reason code counts, including codes the crosswalk predates (marijuana/THC,
          // e-cigarettes, the 2025 HB 6 codes). Ben approved 2026-11-17. DESC_ALIASES keeps
          // renamed codes on one row so year-over-year trends line up.
          type = "Incident Type";
          description =
            DESC_ALIASES[headingName] || dEntry?.description || titleFromHeading(headingName);
        } else {
          type = dEntry?.type || "";
          description = dEntry?.description || headingName;
        }
      }

      const dirEntry = directory.get(campusNumber);
      const campusName = dirEntry?.schoolName || `Campus ${campusNumber}`;

      if (section) sectionSet.add(section);
      if (headingName) headingNameSet.add(headingName);
      if (type) typeSet.add(type);
      campusNumberSet.add(campusNumber);
      totalIncluded++;

      records.push({
        sy: schoolYear,
        cn: campusNumber,
        nm: campusName,
        se: section,
        hn: headingName,
        tp: type,
        ds: description,
        v: value,
      });
    }
  }

  // Build school metadata array
  const schools: CampusSchool[] = [];
  for (const cn of campusNumberSet) {
    const dir = directory.get(cn);
    if (dir) {
      schools.push({
        cn,
        name: dir.schoolName,
        instructionType: dir.instructionType,
        gradeRange: dir.gradeRange,
        lat: dir.lat,
        lon: dir.lon,
        enrollment: dir.enrollment,
        districtType: dir.districtType,
        charterType: dir.charterType,
      });
    }
  }

  // Collect unique descriptions
  const descriptionSet = new Set<string>();
  for (const r of records) {
    if (r.ds) descriptionSet.add(r.ds);
  }

  console.log(`[campus-etl] Parsed ${totalParsed.toLocaleString()} rows, included ${totalIncluded.toLocaleString()}`);
  console.log(`[campus-etl] Schools: ${schools.length}, Sections: ${Array.from(sectionSet).join(", ")}`);
  console.log(`[campus-etl] Types: ${Array.from(typeSet).join(", ")}`);

  return {
    lastUpdated: new Date().toISOString(),
    records,
    schools,
    schoolYears: Array.from(schoolYearSet).sort(),
    sections: Array.from(sectionSet).sort(),
    types: Array.from(typeSet).sort(),
    headingNames: Array.from(headingNameSet).sort(),
    descriptions: Array.from(descriptionSet).sort(),
    summary: {
      totalRecords: totalIncluded,
      totalSchools: schools.length,
    },
  };
}

function emptyPayload(): CampusPayload {
  return {
    lastUpdated: new Date().toISOString(),
    records: [],
    schools: [],
    schoolYears: [],
    sections: [],
    types: [],
    headingNames: [],
    descriptions: [],
    summary: { totalRecords: 0, totalSchools: 0 },
  };
}
