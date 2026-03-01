/**
 * ETL: CAMPUS Disciplinary Data (Local CSVs)
 * Source: data/campus/ directory with 7 CSV files (SY18 through SY24)
 * Output: data/generated/campus-data.json(.gz)
 */
import fs from "fs";
import path from "path";
import type { CampusPayload, CampusRecord } from "../src/lib/types/campus";

const CAMPUS_DIR = path.join(process.cwd(), "data");
const SKIP_ROWS = 6; // TEA CSV files have 6 header rows before data

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
  // Find all campus CSV files
  const csvFiles = fs.readdirSync(CAMPUS_DIR).filter(
    (f) => f.toLowerCase().includes("campus") && f.endsWith(".csv"),
  );

  if (csvFiles.length === 0) {
    console.log("[campus-etl] WARNING: No CAMPUS CSV files found, returning empty payload");
    return emptyPayload();
  }

  console.log(`[campus-etl] Found ${csvFiles.length} CSV files: ${csvFiles.join(", ")}`);

  const aggMap = new Map<string, number>();
  const schoolYearSet = new Set<string>();
  const campusSet = new Set<string>();
  const categorySet = new Set<string>();
  const incidentTypeSet = new Set<string>();
  const actionSet = new Set<string>();
  const raceSet = new Set<string>();
  const sexSet = new Set<string>();
  const gradeSet = new Set<string>();
  let totalParsed = 0;

  for (const csvFile of csvFiles) {
    const filePath = path.join(CAMPUS_DIR, csvFile);
    console.log(`[campus-etl] Processing: ${csvFile}`);

    const text = fs.readFileSync(filePath, "utf-8");
    const lines = text.split("\n");

    // Determine school year from filename (e.g., "campus_SY2324.csv" → "2023-24")
    const syMatch = csvFile.match(/(\d{2})(\d{2})/);
    const schoolYear = syMatch ? `20${syMatch[1]}-${syMatch[2]}` : "Unknown";
    schoolYearSet.add(schoolYear);

    // Skip header rows, find actual data headers
    let headerLine = SKIP_ROWS;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      if (lines[i].toLowerCase().includes("campus") || lines[i].toLowerCase().includes("district")) {
        headerLine = i;
        break;
      }
    }

    if (headerLine >= lines.length) continue;
    const headers = parseCSVLine(lines[headerLine]);
    const colIdx: Record<string, number> = {};
    for (let i = 0; i < headers.length; i++) colIdx[headers[i].toLowerCase()] = i;

    for (let i = headerLine + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      totalParsed++;

      const campus = values[colIdx["campus name"] ?? colIdx["campus"]] || "Unknown";
      const category = values[colIdx["category"] ?? colIdx["incident category"]] || "Unknown";
      const incidentType = values[colIdx["incident type"] ?? colIdx["type"]] || "Unknown";
      const action = values[colIdx["action"] ?? colIdx["disciplinary action"]] || "Unknown";
      const race = values[colIdx["race/ethnicity"] ?? colIdx["race"]] || "Unknown";
      const sex = values[colIdx["sex"] ?? colIdx["gender"]] || "Unknown";
      const grade = values[colIdx["grade"] ?? colIdx["grade level"]] || "Unknown";
      const eco = values[colIdx["economic disadvantage"] ?? colIdx["eco disadv"]] || "";
      const countStr = values[colIdx["count"] ?? colIdx["student count"]] || "1";
      const count = parseInt(countStr) || 1;

      campusSet.add(campus);
      categorySet.add(category);
      incidentTypeSet.add(incidentType);
      actionSet.add(action);
      raceSet.add(race);
      sexSet.add(sex);
      gradeSet.add(grade);

      const key = `${schoolYear}|${campus}|${category}|${incidentType}|${action}|${race}|${sex}|${grade}|${eco}`;
      aggMap.set(key, (aggMap.get(key) ?? 0) + count);
    }
  }

  console.log(`[campus-etl] Parsed ${totalParsed.toLocaleString()} rows`);

  const records: CampusRecord[] = [];
  const totalByAction: Record<string, number> = {};
  let totalIncidents = 0;

  for (const [key, count] of aggMap) {
    const [sy, cn, ca, inc, ac, ra, sx, gr, ec] = key.split("|");
    records.push({ sy, cn, ca, in: inc, ac, ra, sx, gr, ec, c: count });
    totalByAction[ac] = (totalByAction[ac] ?? 0) + count;
    totalIncidents += count;
  }

  console.log(`[campus-etl] Aggregated to ${records.length.toLocaleString()} rows, total=${totalIncidents.toLocaleString()}`);

  return {
    lastUpdated: new Date().toISOString(),
    records,
    schoolYears: Array.from(schoolYearSet).sort(),
    campuses: Array.from(campusSet).sort(),
    categories: Array.from(categorySet).sort(),
    incidentTypes: Array.from(incidentTypeSet).sort(),
    actions: Array.from(actionSet).sort(),
    races: Array.from(raceSet).sort(),
    sexes: Array.from(sexSet).sort(),
    grades: Array.from(gradeSet).sort(),
    summary: { totalIncidents, totalByAction },
  };
}

function emptyPayload(): CampusPayload {
  return {
    lastUpdated: new Date().toISOString(),
    records: [],
    schoolYears: [],
    campuses: [],
    categories: [],
    incidentTypes: [],
    actions: [],
    races: [],
    sexes: [],
    grades: [],
    summary: { totalIncidents: 0, totalByAction: {} },
  };
}
