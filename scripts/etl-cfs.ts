/**
 * ETL: Calls for Service (Local Excel file)
 * Source: data/Calls for Service.xlsx (9 yearly sheets)
 * Output: data/generated/cfs-data.json(.gz)
 *
 * CRITICAL: 4.8M rows — must pre-aggregate heavily.
 * Requires NODE_OPTIONS=--max-old-space-size=8192
 */
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import type { CFSPayload, CFSRecord, CFSHourly } from "../src/lib/types/cfs";

const CFS_PATH = path.join(process.cwd(), "data", "Calls for Service.xlsx");
const CFS_CUTOFF = "2020-01-01"; // Only last ~5 years

function parseDate(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (typeof raw === "string") {
    // Try ISO or MM/DD/YYYY
    const iso = raw.substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const parts = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (parts) {
      return `${parts[3]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    }
  }
  return null;
}

function parseHour(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "number") {
    // Excel time as fraction of day
    const hours = Math.floor(raw * 24);
    return hours >= 0 && hours < 24 ? hours : null;
  }
  if (typeof raw === "string") {
    const match = raw.match(/^(\d{1,2}):/);
    if (match) return parseInt(match[1]);
  }
  return null;
}

export async function runCFSETL(): Promise<CFSPayload> {
  if (!fs.existsSync(CFS_PATH)) {
    console.log("[cfs-etl] WARNING: CFS Excel not found, returning empty payload");
    return emptyPayload();
  }

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

      // Find date column (flexible header matching)
      const dateVal = row["Date"] ?? row["date"] ?? row["DATE"] ?? row["Call Date"];
      const date = parseDate(dateVal);
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

      // Daily aggregation
      const key = `${date}|${callType}|${priority}|${district}|${nature}`;
      aggMap.set(key, (aggMap.get(key) ?? 0) + 1);

      // Hourly distribution
      const timeVal = row["Time"] ?? row["time"] ?? row["Call Time"];
      const hour = parseHour(timeVal);
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

  // Build records
  const records: CFSRecord[] = [];
  for (const [key, count] of aggMap) {
    const [d, ct, pr, di, na] = key.split("|");
    records.push({ d, ct, pr, di, na, c: count });
  }

  // Build hourly
  const hourly: CFSHourly[] = [];
  for (const [key, count] of hourlyMap) {
    const [h, dw] = key.split("-").map(Number);
    hourly.push({ h, dw, c: count });
  }

  // YTD
  const now = new Date();
  const cy = now.getFullYear();
  const py = cy - 1;
  const md = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  let ytdCurrent = 0, ytdPrior = 0;
  for (const r of records) {
    if (r.d >= `${cy}-01-01` && r.d <= `${cy}-${md}`) ytdCurrent += r.c;
    if (r.d >= `${py}-01-01` && r.d <= `${py}-${md}`) ytdPrior += r.c;
  }

  // Avg daily (last 365 days)
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
