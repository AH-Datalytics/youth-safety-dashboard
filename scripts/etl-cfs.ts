/**
 * ETL: Calls for Service (Local Excel or pre-converted CSVs)
 * Source: data/generated/_cfs-sheets/*.csv (fast) or data/source/Calls for Service.xlsx (slow fallback)
 * Output: data/generated/cfs-data.json(.gz)
 *
 * Joins to crosswalks:
 *   Problem → Category, Sub-Category (from XWALK - Call Type.xlsx, "Problem" sheet)
 *   Call_Disposition → Disposition Group (from XWALK - Call Type.xlsx, "Disposition" sheet)
 * Calculates response times per PBI DAX:
 *   Response Time = Time_First_Unit_Arrived - Time_First_Unit_Assigned (minutes)
 *   Time Spent = Time_CallClosed - Time_First_Unit_Assigned (minutes)
 */
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import type { CFSPayload, CFSRecord, CFSHourly, CFSTreeNode } from "../src/lib/types/cfs";
import { loadProblemCrosswalk, loadDispositionCrosswalk } from "./utils/load-crosswalks";
import { normalizeDistrict, priorityLabel } from "./utils/normalize";

const CFS_PATH = path.join(process.cwd(), "data", "source", "Calls for Service.xlsx");
const CFS_CSV_DIR = path.join(process.cwd(), "data", "generated", "_cfs-sheets");
const CFS_CUTOFF = "2020-01-01"; // Only last ~5 years

function parseDate(raw: string | undefined): string | null {
  if (!raw || raw === "None" || raw === "null") return null;
  if (raw.includes("-") && raw.length >= 10) {
    const d = raw.substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  const parts = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (parts) {
    return `${parts[3]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }
  const num = parseFloat(raw);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const d = XLSX.SSF.parse_date_code(num);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  return null;
}

/** Parse a datetime string to epoch ms for time diff calculations */
function parseDateTime(raw: string | undefined): number | null {
  if (!raw || raw === "None" || raw === "null" || raw.trim() === "") return null;
  // ISO datetime or "YYYY-MM-DD HH:MM:SS"
  const ts = Date.parse(raw);
  if (!isNaN(ts)) return ts;
  // Excel serial number
  const num = parseFloat(raw);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    // Convert Excel serial to JS epoch
    return (num - 25569) * 86400000;
  }
  return null;
}

function parseHour(raw: string | undefined): number | null {
  if (!raw || raw === "None" || raw === "null") return null;
  const match = raw.match(/^(\d{1,2}):/);
  if (match) return parseInt(match[1]);
  const num = parseFloat(raw);
  if (!isNaN(num) && num >= 0 && num < 1) {
    const hours = Math.floor(num * 24);
    return hours >= 0 && hours < 24 ? hours : null;
  }
  return null;
}

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

/** Aggregation bucket key */
interface AggBucket {
  count: number;
  totalRT: number; // sum of response times (minutes)
  rtCount: number; // number of valid response time values
  totalTS: number; // sum of time spent (minutes)
  tsCount: number; // number of valid time spent values
}

export async function runCFSETL(): Promise<CFSPayload> {
  // Load crosswalks
  const problemXwalk = loadProblemCrosswalk();
  const dispXwalk = loadDispositionCrosswalk();

  if (fs.existsSync(CFS_CSV_DIR)) {
    const csvFiles = fs.readdirSync(CFS_CSV_DIR).filter(f => f.endsWith(".csv"));
    if (csvFiles.length > 0) {
      return runFromCSVs(csvFiles, problemXwalk, dispXwalk);
    }
  }

  if (fs.existsSync(CFS_PATH)) {
    console.log("[cfs-etl] WARNING: No pre-converted CSVs found, reading Excel directly (very slow)...");
    return runFromExcel(problemXwalk, dispXwalk);
  }

  console.log("[cfs-etl] WARNING: CFS data not found, returning empty payload");
  return emptyPayload();
}

async function runFromCSVs(
  csvFiles: string[],
  problemXwalk: Map<string, { problem: string; category: string; subCategory: string; descriptionNoCode: string }>,
  dispXwalk: Map<string, { disposition: string; dispositionGroup: string }>,
): Promise<CFSPayload> {
  console.log(`[cfs-etl] Reading from ${csvFiles.length} CSV files in _cfs-sheets/...`);

  const aggMap = new Map<string, AggBucket>();
  const hourlyMap = new Map<string, number>();
  const callTypeSet = new Set<string>();
  const categorySet = new Set<string>();
  const subCategorySet = new Set<string>();
  const prioritySet = new Set<string>();
  const districtSet = new Set<string>();
  const dispGroupSet = new Set<string>();
  let maxDate = "";
  let totalParsed = 0;
  let totalIncluded = 0;
  let globalRTSum = 0, globalRTCount = 0;
  let globalTSSum = 0, globalTSCount = 0;

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

          const problem = (findCol(row, "Problem", "Call Type", "CallType", "call_type") ?? "Unknown").trim();
          const priorityNum = (findCol(row, "Priority_Number", "Priority", "priority") ?? "").trim();
          const district = normalizeDistrict(findCol(row, "MDivision", "District", "district", "Beat"));
          const disposition = (findCol(row, "Call_Disposition", "Disposition") ?? "").trim();

          // Crosswalk joins
          const pEntry = problemXwalk.get(problem);
          const category = pEntry?.category || "";
          const subCategory = pEntry?.subCategory || "";
          const dEntry = dispXwalk.get(disposition);
          const dispGroup = dEntry?.dispositionGroup || "";
          const prLabel = priorityLabel(priorityNum);

          // Response time calculation
          const tAssigned = parseDateTime(findCol(row, "Time_First_Unit_Assigned"));
          const tArrived = parseDateTime(findCol(row, "Time_First_Unit_Arrived"));
          const tClosed = parseDateTime(findCol(row, "Time_CallClosed"));

          let rt: number | null = null;
          let ts: number | null = null;
          if (tAssigned !== null && tArrived !== null) {
            const diff = (tArrived - tAssigned) / 60000; // minutes
            if (diff >= 0) rt = diff;
          }
          if (tAssigned !== null && tClosed !== null) {
            const diff = (tClosed - tAssigned) / 60000;
            if (diff >= 0) ts = diff;
          }

          callTypeSet.add(problem);
          if (category) categorySet.add(category);
          if (subCategory) subCategorySet.add(subCategory);
          if (prLabel) prioritySet.add(prLabel);
          if (district) districtSet.add(district);
          if (dispGroup) dispGroupSet.add(dispGroup);
          if (date > maxDate) maxDate = date;
          totalIncluded++;

          const key = `${date}|${problem}|${category}|${subCategory}|${prLabel}|${district}|${dispGroup}`;
          const bucket = aggMap.get(key) ?? { count: 0, totalRT: 0, rtCount: 0, totalTS: 0, tsCount: 0 };
          bucket.count++;
          if (rt !== null) { bucket.totalRT += rt; bucket.rtCount++; globalRTSum += rt; globalRTCount++; }
          if (ts !== null) { bucket.totalTS += ts; bucket.tsCount++; globalTSSum += ts; globalTSCount++; }
          aggMap.set(key, bucket);

          // Hourly extraction
          const timeVal = findCol(row, "Time_PhonePickUp", "Time", "time", "Call Time");
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
  return buildPayload(aggMap, hourlyMap, callTypeSet, categorySet, subCategorySet, prioritySet, districtSet, dispGroupSet, maxDate, totalIncluded, globalRTSum, globalRTCount, globalTSSum, globalTSCount);
}

async function runFromExcel(
  problemXwalk: Map<string, { problem: string; category: string; subCategory: string; descriptionNoCode: string }>,
  dispXwalk: Map<string, { disposition: string; dispositionGroup: string }>,
): Promise<CFSPayload> {
  console.log("[cfs-etl] Reading Excel file...");
  const workbook = XLSX.readFile(CFS_PATH, { cellDates: false });
  console.log(`[cfs-etl] Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(", ")}`);

  const aggMap = new Map<string, AggBucket>();
  const hourlyMap = new Map<string, number>();
  const callTypeSet = new Set<string>();
  const categorySet = new Set<string>();
  const subCategorySet = new Set<string>();
  const prioritySet = new Set<string>();
  const districtSet = new Set<string>();
  const dispGroupSet = new Set<string>();
  let maxDate = "";
  let totalParsed = 0;
  let totalIncluded = 0;
  let globalRTSum = 0, globalRTCount = 0;
  let globalTSSum = 0, globalTSCount = 0;

  for (const sheetName of workbook.SheetNames) {
    console.log(`[cfs-etl] Processing sheet: ${sheetName}...`);
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    for (const rawRow of rows) {
      const row = rawRow as Record<string, unknown>;
      totalParsed++;

      const dateVal = row["Response_Date"] ?? row["Date"] ?? row["date"] ?? row["DATE"] ?? row["Call Date"];
      let date: string | null = null;
      if (typeof dateVal === "number") {
        const d = XLSX.SSF.parse_date_code(dateVal);
        if (d) date = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      } else if (typeof dateVal === "string") {
        date = parseDate(dateVal);
      }
      if (!date || date < CFS_CUTOFF) continue;

      const problem = String(row["Problem"] ?? row["Call Type"] ?? row["CallType"] ?? "Unknown").trim();
      const priorityNum = String(row["Priority_Number"] ?? row["Priority"] ?? "").trim();
      const district = normalizeDistrict(String(row["MDivision"] ?? row["District"] ?? ""));
      const disposition = String(row["Call_Disposition"] ?? row["Disposition"] ?? "").trim();

      const pEntry = problemXwalk.get(problem);
      const category = pEntry?.category || "";
      const subCategory = pEntry?.subCategory || "";
      const dEntry = dispXwalk.get(disposition);
      const dispGroup = dEntry?.dispositionGroup || "";
      const prLabel = priorityLabel(priorityNum);

      // Response time
      const tAssignedRaw = row["Time_First_Unit_Assigned"];
      const tArrivedRaw = row["Time_First_Unit_Arrived"];
      const tClosedRaw = row["Time_CallClosed"];
      const tAssigned = typeof tAssignedRaw === "number" ? (tAssignedRaw - 25569) * 86400000 : parseDateTime(String(tAssignedRaw ?? ""));
      const tArrived = typeof tArrivedRaw === "number" ? (tArrivedRaw - 25569) * 86400000 : parseDateTime(String(tArrivedRaw ?? ""));
      const tClosed = typeof tClosedRaw === "number" ? (tClosedRaw - 25569) * 86400000 : parseDateTime(String(tClosedRaw ?? ""));

      let rt: number | null = null;
      let ts: number | null = null;
      if (tAssigned !== null && tArrived !== null) {
        const diff = (tArrived - tAssigned) / 60000;
        if (diff >= 0) rt = diff;
      }
      if (tAssigned !== null && tClosed !== null) {
        const diff = (tClosed - tAssigned) / 60000;
        if (diff >= 0) ts = diff;
      }

      callTypeSet.add(problem);
      if (category) categorySet.add(category);
      if (subCategory) subCategorySet.add(subCategory);
      if (prLabel) prioritySet.add(prLabel);
      if (district) districtSet.add(district);
      if (dispGroup) dispGroupSet.add(dispGroup);
      if (date > maxDate) maxDate = date;
      totalIncluded++;

      const key = `${date}|${problem}|${category}|${subCategory}|${prLabel}|${district}|${dispGroup}`;
      const bucket = aggMap.get(key) ?? { count: 0, totalRT: 0, rtCount: 0, totalTS: 0, tsCount: 0 };
      bucket.count++;
      if (rt !== null) { bucket.totalRT += rt; bucket.rtCount++; globalRTSum += rt; globalRTCount++; }
      if (ts !== null) { bucket.totalTS += ts; bucket.tsCount++; globalTSSum += ts; globalTSCount++; }
      aggMap.set(key, bucket);

      const timeVal = row["Time_PhonePickUp"] ?? row["Time"] ?? row["time"] ?? row["Call Time"];
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
  return buildPayload(aggMap, hourlyMap, callTypeSet, categorySet, subCategorySet, prioritySet, districtSet, dispGroupSet, maxDate, totalIncluded, globalRTSum, globalRTCount, globalTSSum, globalTSCount);
}

function buildPayload(
  aggMap: Map<string, AggBucket>,
  hourlyMap: Map<string, number>,
  callTypeSet: Set<string>,
  categorySet: Set<string>,
  subCategorySet: Set<string>,
  prioritySet: Set<string>,
  districtSet: Set<string>,
  dispGroupSet: Set<string>,
  maxDate: string,
  totalIncluded: number,
  globalRTSum: number,
  globalRTCount: number,
  globalTSSum: number,
  globalTSCount: number,
): CFSPayload {
  const records: CFSRecord[] = [];
  for (const [key, bucket] of aggMap) {
    const [d, ct, cat, sc, pr, di, dg] = key.split("|");
    records.push({
      d, ct, cat, sc, pr, di, dg,
      c: bucket.count,
      rt: bucket.rtCount > 0 ? Math.round((bucket.totalRT / bucket.rtCount) * 10) / 10 : 0,
      ts: bucket.tsCount > 0 ? Math.round((bucket.totalTS / bucket.tsCount) * 10) / 10 : 0,
    });
  }

  const hourly: CFSHourly[] = [];
  for (const [key, count] of hourlyMap) {
    const [h, dw] = key.split("-").map(Number);
    hourly.push({ h, dw, c: count });
  }

  // Build category tree for frontend
  const catSubMap = new Map<string, Set<string>>();
  for (const r of records) {
    if (r.cat) {
      if (!catSubMap.has(r.cat)) catSubMap.set(r.cat, new Set());
      if (r.sc) catSubMap.get(r.cat)!.add(r.sc);
    }
  }
  const categoryTree: CFSTreeNode[] = [];
  for (const [cat, subs] of catSubMap) {
    categoryTree.push({ category: cat, subCategories: Array.from(subs).sort() });
  }
  categoryTree.sort((a, b) => a.category.localeCompare(b.category));

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

  const dailyMap = new Map<string, number>();
  for (const r of records) dailyMap.set(r.d, (dailyMap.get(r.d) ?? 0) + r.c);
  const daysInRange = dailyMap.size || 1;
  const avgDaily = Math.round(totalIncluded / daysInRange);

  const avgResponseTime = globalRTCount > 0 ? Math.round((globalRTSum / globalRTCount) * 10) / 10 : 0;
  const avgTimeSpent = globalTSCount > 0 ? Math.round((globalTSSum / globalTSCount) * 10) / 10 : 0;

  console.log(`[cfs-etl] Aggregated to ${records.length.toLocaleString()} rows`);
  console.log(`[cfs-etl] Avg Response Time: ${avgResponseTime} min, Avg Time Spent: ${avgTimeSpent} min`);
  console.log(`[cfs-etl] Categories: ${Array.from(categorySet).join(", ")}`);

  return {
    lastUpdated: new Date().toISOString(),
    dataThrough: maxDate,
    records,
    hourly,
    callTypes: Array.from(callTypeSet).sort(),
    categories: Array.from(categorySet).sort(),
    subCategories: Array.from(subCategorySet).sort(),
    priorities: Array.from(prioritySet).sort(),
    districts: Array.from(districtSet).sort(),
    dispositionGroups: Array.from(dispGroupSet).sort(),
    categoryTree,
    summary: {
      total: totalIncluded,
      avgDaily,
      avgResponseTime,
      avgTimeSpent,
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
    categories: [],
    subCategories: [],
    priorities: [],
    districts: [],
    dispositionGroups: [],
    categoryTree: [],
    summary: { total: 0, avgDaily: 0, avgResponseTime: 0, avgTimeSpent: 0, ytdCurrent: 0, ytdPrior: 0, pctChange: 0 },
  };
}
