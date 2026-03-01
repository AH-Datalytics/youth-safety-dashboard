/**
 * ETL: TJJD Youth Court Referrals (Local Excel)
 * Source: data/Redacted Youth Justice Data.xlsx
 * Output: data/generated/tjjd-data.json(.gz)
 */
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import type { TJJDPayload, TJJDRecord } from "../src/lib/types/tjjd";

const TJJD_PATH = path.join(process.cwd(), "data", "Redacted Youth Justice Data.xlsx");

export async function runTJJDETL(): Promise<TJJDPayload> {
  if (!fs.existsSync(TJJD_PATH)) {
    console.log("[tjjd-etl] WARNING: TJJD Excel not found, returning empty payload");
    return emptyPayload();
  }

  console.log("[tjjd-etl] Reading Excel file...");
  const workbook = XLSX.readFile(TJJD_PATH);
  console.log(`[tjjd-etl] Found sheets: ${workbook.SheetNames.join(", ")}`);

  const records: TJJDRecord[] = [];
  const aggMap = new Map<string, number>();
  const schoolYearSet = new Set<string>();
  const countySet = new Set<string>();
  const offenseSet = new Set<string>();
  const raceSet = new Set<string>();
  const sexSet = new Set<string>();
  const ageGroupSet = new Set<string>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    // Determine school year from sheet name
    const syMatch = sheetName.match(/(\d{2})-?(\d{2})/);
    const schoolYear = syMatch ? `20${syMatch[1]}-${syMatch[2]}` : sheetName;
    schoolYearSet.add(schoolYear);

    for (const rawRow of rows) {
      const row = rawRow as Record<string, unknown>;

      const county = String(row["County"] ?? row["county"] ?? "Dallas").trim();
      const offense = String(row["Offense"] ?? row["offense"] ?? row["Offense Type"] ?? "Unknown").trim();
      const race = String(row["Race"] ?? row["race"] ?? row["Race/Ethnicity"] ?? "Unknown").trim();
      const sex = String(row["Sex"] ?? row["sex"] ?? row["Gender"] ?? "Unknown").trim();
      const ageGroup = String(row["Age Group"] ?? row["age_group"] ?? row["Age"] ?? "Unknown").trim();
      const countStr = String(row["Count"] ?? row["count"] ?? row["Referrals"] ?? "1");
      const count = parseInt(countStr) || 1;

      countySet.add(county);
      offenseSet.add(offense);
      raceSet.add(race);
      sexSet.add(sex);
      ageGroupSet.add(ageGroup);

      const key = `${schoolYear}|${county}|${offense}|${race}|${sex}|${ageGroup}`;
      aggMap.set(key, (aggMap.get(key) ?? 0) + count);
    }
  }

  let totalReferrals = 0;
  for (const [key, count] of aggMap) {
    const [sy, co, of_, ra, sx, ag] = key.split("|");
    records.push({ sy, co, of: of_, ra, sx, ag, c: count });
    totalReferrals += count;
  }

  // Simple YTD (by school year)
  const sortedYears = Array.from(schoolYearSet).sort();
  const currentSY = sortedYears[sortedYears.length - 1] ?? "";
  const priorSY = sortedYears[sortedYears.length - 2] ?? "";
  let ytdCurrent = 0, ytdPrior = 0;
  for (const r of records) {
    if (r.sy === currentSY) ytdCurrent += r.c;
    if (r.sy === priorSY) ytdPrior += r.c;
  }

  console.log(`[tjjd-etl] Aggregated to ${records.length.toLocaleString()} rows, total=${totalReferrals.toLocaleString()}`);

  return {
    lastUpdated: new Date().toISOString(),
    records,
    schoolYears: sortedYears,
    counties: Array.from(countySet).sort(),
    offenses: Array.from(offenseSet).sort(),
    races: Array.from(raceSet).sort(),
    sexes: Array.from(sexSet).sort(),
    ageGroups: Array.from(ageGroupSet).sort(),
    summary: {
      totalReferrals,
      ytdCurrent,
      ytdPrior,
      pctChange: ytdPrior === 0 ? 0 : (ytdCurrent - ytdPrior) / ytdPrior,
    },
  };
}

function emptyPayload(): TJJDPayload {
  return {
    lastUpdated: new Date().toISOString(),
    records: [],
    schoolYears: [],
    counties: [],
    offenses: [],
    races: [],
    sexes: [],
    ageGroups: [],
    summary: { totalReferrals: 0, ytdCurrent: 0, ytdPrior: 0, pctChange: 0 },
  };
}
