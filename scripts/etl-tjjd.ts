/**
 * ETL: TJJD Youth Court Referrals (Local Excel — wide-to-long unpivot)
 * Source: data/source/Redacted Youth Justice Data.xlsx
 * Output: data/generated/tjjd-data.json(.gz)
 *
 * TJJD Data sheet: Wide format with monthly columns (January-2020 through December-2023)
 *   Rows: Category + Description combinations
 *   After unpivot: ~3,400 rows with: Category, Description, Year, Month #, Month, Total
 *
 * Zip Code sheet: Wide format with year columns (2020-2023)
 *   Rows: ZIP codes
 *   After unpivot: ~738 rows, filtered to Dallas-area zips (75000-75300),
 *   excluding: 75005, 75022, 75129, 75200, 75280
 */
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import type { TJJDPayload, TJJDRecord, TJJDZipRecord } from "../src/lib/types/tjjd";

const TJJD_PATH = path.join(process.cwd(), "data", "source", "Redacted Youth Justice Data.xlsx");

const EXCLUDED_ZIPS = new Set([75005, 75022, 75129, 75200, 75280]);

/** Month name → number mapping */
const MONTH_MAP: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

export async function runTJJDETL(): Promise<TJJDPayload> {
  if (!fs.existsSync(TJJD_PATH)) {
    console.log("[tjjd-etl] WARNING: TJJD Excel not found, returning empty payload");
    return emptyPayload();
  }

  console.log("[tjjd-etl] Reading Excel file...");
  const workbook = XLSX.readFile(TJJD_PATH);
  console.log(`[tjjd-etl] Found sheets: ${workbook.SheetNames.join(", ")}`);

  const records = processMainSheet(workbook);
  const zipRecords = processZipSheet(workbook);

  const categories = [...new Set(records.map(r => r.cat))].sort();
  const descriptions = [...new Set(records.map(r => r.desc))].sort();
  const years = [...new Set(records.map(r => r.yr))].sort();

  const totalReferrals = records.reduce((s, r) => s + r.v, 0);
  const totalZipReferrals = zipRecords.reduce((s, r) => s + r.v, 0);

  console.log(`[tjjd-etl] Main data: ${records.length.toLocaleString()} rows, total=${totalReferrals.toLocaleString()}`);
  console.log(`[tjjd-etl] Zip data: ${zipRecords.length.toLocaleString()} rows, total=${totalZipReferrals.toLocaleString()}`);
  console.log(`[tjjd-etl] Categories: ${categories.join(", ")}`);
  console.log(`[tjjd-etl] Years: ${years.join(", ")}`);

  return {
    lastUpdated: new Date().toISOString(),
    records,
    zipRecords,
    categories,
    descriptions,
    years,
    summary: { totalReferrals, totalZipReferrals },
  };
}

/**
 * Process the main TJJD Data sheet — wide-to-long unpivot.
 * Expected format: first 2 columns are Category/Description, rest are monthly columns
 * like "January-2020", "February-2020", ..., "December-2023"
 */
function processMainSheet(workbook: XLSX.WorkBook): TJJDRecord[] {
  // Try "TJJD Data" sheet name, fall back to first sheet
  const sheetName = workbook.SheetNames.find(s =>
    s.toLowerCase().includes("tjjd") || s.toLowerCase().includes("data")
  ) ?? workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
  if (rows.length === 0) return [];

  console.log(`[tjjd-etl] Processing sheet "${sheetName}" (${rows.length} rows)...`);

  // Identify category/description columns and monthly columns
  const headers = Object.keys(rows[0]);
  const catCol = headers.find(h =>
    h.toLowerCase() === "category" || h.toLowerCase() === "cat"
  ) ?? headers[0];
  const descCol = headers.find(h =>
    h.toLowerCase() === "description" || h.toLowerCase() === "desc"
  ) ?? headers[1];

  // Monthly columns: "Month-Year" format like "January-2020"
  const monthCols: { header: string; month: string; monthNum: number; year: string }[] = [];
  for (const h of headers) {
    const match = h.match(/^(\w+)-(\d{4})$/);
    if (match) {
      const monthName = match[1];
      const year = match[2];
      const monthNum = MONTH_MAP[monthName];
      if (monthNum) {
        monthCols.push({ header: h, month: monthName, monthNum, year });
      }
    }
  }

  console.log(`[tjjd-etl] Found ${monthCols.length} monthly columns`);

  const records: TJJDRecord[] = [];

  for (const row of rows) {
    const cat = String(row[catCol] ?? "").trim();
    const desc = String(row[descCol] ?? "").trim();
    if (!cat || !desc) continue;

    for (const mc of monthCols) {
      const rawVal = row[mc.header];
      const v = typeof rawVal === "number" ? rawVal : parseInt(String(rawVal));
      if (isNaN(v) || v === 0) continue;

      records.push({
        cat,
        desc,
        yr: mc.year,
        mo: mc.monthNum,
        mn: mc.month,
        v,
      });
    }
  }

  return records;
}

/**
 * Process the Zip Code sheet — wide-to-long unpivot of year columns.
 * Filter to Dallas-area zips (75000-75300), exclude 5 specific zips.
 */
function processZipSheet(workbook: XLSX.WorkBook): TJJDZipRecord[] {
  const sheetName = workbook.SheetNames.find(s =>
    s.toLowerCase().includes("zip")
  );
  if (!sheetName) {
    console.log("[tjjd-etl] No Zip Code sheet found");
    return [];
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
  if (rows.length === 0) return [];

  console.log(`[tjjd-etl] Processing sheet "${sheetName}" (${rows.length} rows)...`);

  const headers = Object.keys(rows[0]);
  const zipCol = headers.find(h =>
    h.toLowerCase().includes("zip")
  ) ?? headers[0];

  // Year columns: 4-digit numbers
  const yearCols = headers.filter(h => /^\d{4}$/.test(h.trim()));
  console.log(`[tjjd-etl] Found ${yearCols.length} year columns: ${yearCols.join(", ")}`);

  const records: TJJDZipRecord[] = [];

  for (const row of rows) {
    const zipRaw = row[zipCol];
    const zip = typeof zipRaw === "number" ? zipRaw : parseInt(String(zipRaw));
    if (isNaN(zip)) continue;

    // Filter to Dallas-area zips (75000-75300)
    if (zip < 75000 || zip > 75300) continue;
    // Exclude specific zips per PBI
    if (EXCLUDED_ZIPS.has(zip)) continue;

    for (const yr of yearCols) {
      const rawVal = row[yr];
      const v = typeof rawVal === "number" ? rawVal : parseInt(String(rawVal));
      if (isNaN(v) || v === 0) continue;

      records.push({ zip, yr: yr.trim(), v });
    }
  }

  return records;
}

function emptyPayload(): TJJDPayload {
  return {
    lastUpdated: new Date().toISOString(),
    records: [],
    zipRecords: [],
    categories: [],
    descriptions: [],
    years: [],
    summary: { totalReferrals: 0, totalZipReferrals: 0 },
  };
}
