/**
 * ETL: Calls for Service (Local Excel or pre-converted CSVs)
 * Source: data/generated/_cfs-sheets/*.csv (fast) or data/source/Calls for Service.xlsx (slow fallback)
 * Output: data/generated/cfs-data.json(.gz)
 *
 * Prefers reading from Python-generated CSVs in _cfs-sheets/.
 * Falls back to reading the 577MB Excel directly (very slow, 30+ min).
 */
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import type { CFSPayload, CFSRecord, CFSHourly } from "../src/lib/types/cfs";

const CFS_PATH = path.join(process.cwd(), "data", "source", "Calls for Service.xlsx");
const CFS_CSV_DIR = path.join(process.cwd(), "data", "generated", "_cfs-sheets");
const CFS_CUTOFF = "2020-01-01"; // Only last ~5 years

function parseDate(raw: string | undefined): string | null {
  if (!raw || raw === "None" || raw === "null") return null;
  // ISO or YYYY-MM-DD
  if (raw.includes("-") && raw.length >= 10) {
    const d = raw.substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  // MM/DD/YYYY
  const parts = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (parts) {
    return `${parts[3]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }
  // Excel serial number (as string)
  const num = parseFloat(raw);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const d = XLSX.SSF.parse_date_code(num);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  return null;
}

function parseHour(raw: string | undefined): number | null {
  if (!raw || raw === "None" || raw === "null") return null;
  // HH:MM format
  const match = raw.match(/^(\d{1,2}):/);
  if (match) return parseInt(match[1]);
  // Excel time fraction (as string)
  const num = parseFloat(raw);
  if (!isNaN(num) && num >= 0 && num < 1) {
    const hours = Math.floor(num * 24);
    return hours >= 0 && hours < 24 ? hours : null;
  }
  return null;
}

// Flexible column lookup
function findCol(row: Record<string, string>, ...candidates: string[]): string | undefined {
  for (const c of candidates) {
    if (c in row && row[c]) return row[c];
  }
  for (const c of candidates) {
    const lower = c.toLowerCase();
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === lower && row[key]) return row[key];
    }
  }
  return undefined;
}

export async function runCFSETL(): Promise<CFSPayload> {
  // Prefer pre-converted CSVs
  if (fs.existsSync(CFS_CSV_DIR)) {
    const csvFiles = fs.readdirSync(CFS_CSV_DIR).filter(f => f.endsWith(".csv"));
    if (csvFiles.length > 0) {
      return runFromCSVs(csvFiles);
    }
  }

  // Fallback to Excel (very slow)
  if (fs.existsSync(CFS_PATH)) {
    console.log("[cfs-etl] WARNING: No pre-converted CSVs found, reading Excel directly (very slow)...");
    console.log("[cfs-etl] Run 'python scripts/prepare-cfs-csv.py' first for faster processing.");
    return runFromExcel();
  }

  console.log("[cfs-etl] WARNING: CFS data not found, returning empty payload");
  return emptyPayload();
}

async function runFromCSVs(csvFiles: string[]): Promise<CFSPayload> {
  console.log(`[cfs-etl] Reading from ${csvFiles.length} CSV files in _cfs-sheets/...`);

  const aggMap = new Map<string, number>();
  const hourlyMap = new Map<string, number>();
  const callTypeSet = new Set<string>();
  const prioritySet = new Set<string>();
  const districtSet = new Set<string>();
  const natureSet = new Set<string>();
  let maxDate = "";
  let totalParsed = 0;
  let totalIncluded = 0;

  for (const csvFile of csvFiles) {
    const csvPath = path.join(CFS_CSV_DIR, csvFile);
    console.log(`[cfs-etl] Processing ${csvFile}...`);

    await new Promise<void>((resolve, reject) => {
      const readStream = fs.createReadStream(csvPath, { encoding: "utf-8" });
      Papa.parse(readStream, {
        header: true,
        skipEmptyLines: true,
        step: (result) => {
          totalParsed++;
          const row = result.data as Record<string, string>;

          const dateVal = findCol(row, "Response_Date", "Date", "date", "DATE", "Call Date");
          const date = parseDate(dateVal);
          if (!date || date < CFS_CUTOFF) return;

          const callType = (findCol(row, "Problem", "Call Type", "CallType", "call_type") ?? "Unknown").trim();
          const priority = (findCol(row, "Priority_Number", "Priority", "priority") ?? "").trim();
          const district = (findCol(row, "MDivision", "District", "district", "Beat") ?? "").trim();
          const nature = (findCol(row, "Call_Disposition", "Nature", "nature", "Nature of Call") ?? "Unknown").trim();

          callTypeSet.add(callType);
          if (priority) prioritySet.add(priority);
          if (district) districtSet.add(district);
          natureSet.add(nature);
          if (date > maxDate) maxDate = date;
          totalIncluded++;

          const key = `${date}|${callType}|${priority}|${district}|${nature}`;
          aggMap.set(key, (aggMap.get(key) ?? 0) + 1);

          const timeVal = findCol(row, "Time_PhonePickUp", "Time", "time", "Call Time");
          // Extract hour from datetime like "2023-01-01 14:30:00"
          let hour: number | null = null;
          if (timeVal) {
            const hMatch = timeVal.match(/(\d{2}):(\d{2}):/);
            if (hMatch) hour = parseInt(hMatch[1]);
            else hour = parseHour(timeVal);
          }
          if (hour !== null) {
            const d = new Date(date + "T00:00:00");
            const dw = d.getDay();
            const hKey = `${hour}-${dw}`;
            hourlyMap.set(hKey, (hourlyMap.get(hKey) ?? 0) + 1);
          }

          if (totalParsed % 500_000 === 0) {
            console.log(`[cfs-etl] Processed ${totalParsed.toLocaleString()} rows...`);
          }
        },
        complete: () => resolve(),
        error: (err) => reject(err),
      });
    });
  }

  console.log(`[cfs-etl] Parsed ${totalParsed.toLocaleString()}, included ${totalIncluded.toLocaleString()}`);
  return buildPayload(aggMap, hourlyMap, callTypeSet, prioritySet, districtSet, natureSet, maxDate, totalIncluded);
}

async function runFromExcel(): Promise<CFSPayload> {
  console.log("[cfs-etl] Reading Excel file...");
  const workbook = XLSX.readFile(CFS_PATH, { cellDates: false });
  console.log(`[cfs-etl] Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(", ")}`);

  const aggMap = new Map<string, number>();
  const hourlyMap = new Map<string, number>();
  const callTypeSet = new Set<string>();
  const prioritySet = new Set<string>();
  const districtSet = new Set<string>();
  const natureSet = new Set<string>();
  let maxDate = "";
  let totalParsed = 0;
  let totalIncluded = 0;

  for (const sheetName of workbook.SheetNames) {
    console.log(`[cfs-etl] Processing sheet: ${sheetName}...`);
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    for (const rawRow of rows) {
      const row = rawRow as Record<string, unknown>;
      totalParsed++;

      const dateVal = row["Date"] ?? row["date"] ?? row["DATE"] ?? row["Call Date"];
      let date: string | null = null;
      if (typeof dateVal === "number") {
        const d = XLSX.SSF.parse_date_code(dateVal);
        if (d) date = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      } else if (typeof dateVal === "string") {
        date = parseDate(dateVal);
      }
      if (!date || date < CFS_CUTOFF) continue;

      const callType = String(row["Call Type"] ?? row["CallType"] ?? row["call_type"] ?? "Unknown").trim();
      const priority = String(row["Priority"] ?? row["priority"] ?? "").trim();
      const district = String(row["District"] ?? row["district"] ?? row["Beat"] ?? "").trim();
      const nature = String(row["Nature"] ?? row["nature"] ?? row["Nature of Call"] ?? "Unknown").trim();

      callTypeSet.add(callType);
      if (priority) prioritySet.add(priority);
      if (district) districtSet.add(district);
      natureSet.add(nature);
      if (date > maxDate) maxDate = date;
      totalIncluded++;

      const key = `${date}|${callType}|${priority}|${district}|${nature}`;
      aggMap.set(key, (aggMap.get(key) ?? 0) + 1);

      const timeVal = row["Time"] ?? row["time"] ?? row["Call Time"];
      let hour: number | null = null;
      if (typeof timeVal === "number") {
        const h = Math.floor(timeVal * 24);
        hour = h >= 0 && h < 24 ? h : null;
      } else if (typeof timeVal === "string") {
        hour = parseHour(timeVal);
      }
      if (hour !== null) {
        const d = new Date(date + "T00:00:00");
        const dw = d.getDay();
        const hKey = `${hour}-${dw}`;
        hourlyMap.set(hKey, (hourlyMap.get(hKey) ?? 0) + 1);
      }

      if (totalParsed % 500_000 === 0) {
        console.log(`[cfs-etl] Processed ${totalParsed.toLocaleString()} rows...`);
      }
    }
  }

  console.log(`[cfs-etl] Parsed ${totalParsed.toLocaleString()}, included ${totalIncluded.toLocaleString()}`);
  return buildPayload(aggMap, hourlyMap, callTypeSet, prioritySet, districtSet, natureSet, maxDate, totalIncluded);
}

function buildPayload(
  aggMap: Map<string, number>,
  hourlyMap: Map<string, number>,
  callTypeSet: Set<string>,
  prioritySet: Set<string>,
  districtSet: Set<string>,
  natureSet: Set<string>,
  maxDate: string,
  totalIncluded: number,
): CFSPayload {
  const records: CFSRecord[] = [];
  for (const [key, count] of aggMap) {
    const [d, ct, pr, di, na] = key.split("|");
    records.push({ d, ct, pr, di, na, c: count });
  }

  const hourly: CFSHourly[] = [];
  for (const [key, count] of hourlyMap) {
    const [h, dw] = key.split("-").map(Number);
    hourly.push({ h, dw, c: count });
  }

  const now = new Date();
  const cy = now.getFullYear();
  const py = cy - 1;
  const md = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  let ytdCurrent = 0, ytdPrior = 0;
  for (const r of records) {
    if (r.d >= `${cy}-01-01` && r.d <= `${cy}-${md}`) ytdCurrent += r.c;
    if (r.d >= `${py}-01-01` && r.d <= `${py}-${md}`) ytdPrior += r.c;
  }

  const dailyMap = new Map<string, number>();
  for (const r of records) dailyMap.set(r.d, (dailyMap.get(r.d) ?? 0) + r.c);
  const daysInRange = dailyMap.size || 1;
  const avgDaily = Math.round(totalIncluded / daysInRange);

  console.log(`[cfs-etl] Aggregated to ${records.length.toLocaleString()} rows`);

  return {
    lastUpdated: new Date().toISOString(),
    dataThrough: maxDate,
    records,
    hourly,
    callTypes: Array.from(callTypeSet).sort(),
    priorities: Array.from(prioritySet).sort(),
    districts: Array.from(districtSet).sort(),
    natures: Array.from(natureSet).sort(),
    summary: {
      total: totalIncluded,
      avgDaily,
      ytdCurrent,
      ytdPrior,
      pctChange: ytdPrior === 0 ? 0 : (ytdCurrent - ytdPrior) / ytdPrior,
    },
  };
}

function emptyPayload(): CFSPayload {
  return {
    lastUpdated: new Date().toISOString(),
    dataThrough: "",
    records: [],
    hourly: [],
    callTypes: [],
    priorities: [],
    districts: [],
    natures: [],
    summary: { total: 0, avgDaily: 0, ytdCurrent: 0, ytdPrior: 0, pctChange: 0 },
  };
}
