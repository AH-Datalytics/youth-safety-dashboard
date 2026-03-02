/**
 * ETL: CAMPUS Disciplinary Data (Local CSVs — TEA format)
 * Source: data/source/CAMPUS_summary_18.csv through CAMPUS_summary_24.csv
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
 *   - Filter to County Name = "DALLAS COUNTY"
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

/** School year mapping by filename suffix */
const SY_MAP: Record<string, string> = {
  "18": "2017-2018",
  "19": "2018-2019",
  "20": "2019-2020",
  "21": "2020-2021",
  "22": "2021-2022",
  "23": "2022-2023",
  "24": "2023-2024",
};

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

function loadDirectory(): Map<number, DirectoryEntry> {
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
  const dallasCount = Array.from(map.values()).filter(d => d.countyName === "DALLAS COUNTY").length;
  console.log(`[campus-etl] Dallas County schools: ${dallasCount}`);
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

export async function runCampusETL(): Promise<CampusPayload> {
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
  const directory = loadDirectory();

  // Build set of Dallas County campus numbers
  const dallasCampuses = new Set<number>();
  for (const [num, entry] of directory) {
    if (entry.countyName === "DALLAS COUNTY") {
      dallasCampuses.add(num);
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

      // Filter to Dallas County only
      if (dallasCampuses.size > 0 && !dallasCampuses.has(campusNumber)) continue;

      // Parse value
      const valueStr = values[valueColIdx] ?? "";
      const value = parseInt(valueStr);
      if (isNaN(value) || value === -999 || value === 0) continue; // -999 = null sentinel

      const section = sectionIdx >= 0 ? (values[sectionIdx] ?? "").trim() : "";
      const headingName = headnameIdx >= 0 ? (values[headnameIdx] ?? "").trim() : "";

      // Crosswalk join
      const dEntry = disciplineXwalk.get(headingName);
      const type = dEntry?.type || "";
      const description = dEntry?.description || headingName;

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
