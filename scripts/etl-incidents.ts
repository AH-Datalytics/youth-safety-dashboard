/**
 * ETL: Dallas Police Incidents (Socrata)
 * Source: data/generated/_incidents-etl.csv (from Python) or Socrata bulk CSV
 * Output: data/generated/incidents-data.json(.gz)
 *
 * Prefers reading from the Python-generated ETL CSV (fast, already downloaded).
 * Falls back to Socrata JSON pagination if the CSV doesn't exist.
 */
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import Papa from "papaparse";
import type { IncidentPayload, IncidentRecord } from "../src/lib/types/incidents";

const ETL_CSV = path.join(process.cwd(), "data", "generated", "_incidents-etl.csv");
const SOCRATA_CSV_URL = "https://www.dallasopendata.com/api/views/qv6i-rri7/rows.csv?accessType=DOWNLOAD";
const SOCRATA_JSON_URL = "https://www.dallasopendata.com/resource/qv6i-rri7.json";
const DATA_FLOOR = "2017-01-01";
const PAGE_SIZE = 50_000;
const MAX_RECORDS = 2_000_000;

export async function runIncidentsETL(): Promise<IncidentPayload> {
  if (fs.existsSync(ETL_CSV)) {
    return runFromCSV(ETL_CSV);
  }
  console.log("[incidents-etl] No ETL CSV found, falling back to Socrata API...");
  return runFromSocrataJSON();
}

/**
 * Fast path: read from Python-generated CSV (6 columns, pre-filtered).
 */
async function runFromCSV(csvPath: string): Promise<IncidentPayload> {
  console.log(`[incidents-etl] Reading from ${path.basename(csvPath)}...`);

  const aggMap = new Map<string, number>();
  const offenseTypeSet = new Set<string>();
  const categorySet = new Set<string>();
  const districtSet = new Set<string>();
  const zipSet = new Set<string>();
  const nibrsSet = new Set<string>();
  let maxDate = "";
  let totalRows = 0;

  await new Promise<void>((resolve, reject) => {
    const readStream = fs.createReadStream(csvPath, { encoding: "utf-8" });
    Papa.parse(readStream, {
      header: true,
      skipEmptyLines: true,
      step: (result) => {
        totalRows++;
        const row = result.data as Record<string, string>;
        const date = row.date;
        if (!date || date < DATA_FLOOR) return;

        const offenseType = row.offense?.trim() || "Unknown";
        const category = row.category?.trim() || "Unknown";
        const district = row.district?.trim() || "";
        const zip = row.zip?.trim() || "";
        const nibrs = row.nibrs?.trim() || "";

        offenseTypeSet.add(offenseType);
        categorySet.add(category);
        if (district) districtSet.add(district);
        if (zip) zipSet.add(zip);
        if (nibrs) nibrsSet.add(nibrs);
        if (date > maxDate) maxDate = date;

        const key = `${date}|${offenseType}|${category}|${district}|${zip}|${nibrs}`;
        aggMap.set(key, (aggMap.get(key) ?? 0) + 1);

        if (totalRows % 100_000 === 0) {
          console.log(`[incidents-etl] Processed ${totalRows.toLocaleString()} rows...`);
        }
      },
      complete: () => resolve(),
      error: (err) => reject(err),
    });
  });

  console.log(`[incidents-etl] Parsed ${totalRows.toLocaleString()} rows from CSV`);
  return buildPayload(aggMap, offenseTypeSet, categorySet, districtSet, zipSet, nibrsSet, maxDate);
}

/**
 * Fallback: paginated JSON from Socrata API (slow for large datasets).
 */
async function runFromSocrataJSON(): Promise<IncidentPayload> {
  console.log("[incidents-etl] Fetching from Socrata JSON API...");

  const aggMap = new Map<string, number>();
  const offenseTypeSet = new Set<string>();
  const categorySet = new Set<string>();
  const districtSet = new Set<string>();
  const zipSet = new Set<string>();
  const nibrsSet = new Set<string>();
  let maxDate = "";
  let totalFetched = 0;
  let offset = 0;

  while (offset < MAX_RECORDS) {
    const url = `${SOCRATA_JSON_URL}?$where=date1>='${DATA_FLOOR}T00:00:00'&$limit=${PAGE_SIZE}&$offset=${offset}&$order=date1 DESC`;
    console.log(`[incidents-etl] Fetching offset=${offset}...`);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Socrata ${res.status}: ${res.statusText}`);
    const batch = await res.json() as Array<Record<string, string>>;

    if (batch.length === 0) break;
    totalFetched += batch.length;

    for (const raw of batch) {
      if (!raw.date1) continue;
      const date = raw.date1.substring(0, 10);
      const offenseType = raw.offincident?.trim() || "Unknown";
      const category = raw.nibrs_crime_category?.trim() || "Unknown";
      const district = raw.district?.trim() || "";
      const zip = raw.zip_code?.trim() || "";
      const nibrs = raw.nibrs_crime?.trim() || "";

      offenseTypeSet.add(offenseType);
      categorySet.add(category);
      if (district) districtSet.add(district);
      if (zip) zipSet.add(zip);
      if (nibrs) nibrsSet.add(nibrs);
      if (date > maxDate) maxDate = date;

      const key = `${date}|${offenseType}|${category}|${district}|${zip}|${nibrs}`;
      aggMap.set(key, (aggMap.get(key) ?? 0) + 1);
    }

    offset += batch.length;
    if (batch.length < PAGE_SIZE) break;
  }

  console.log(`[incidents-etl] Fetched ${totalFetched.toLocaleString()} records from Socrata`);
  return buildPayload(aggMap, offenseTypeSet, categorySet, districtSet, zipSet, nibrsSet, maxDate);
}

function buildPayload(
  aggMap: Map<string, number>,
  offenseTypeSet: Set<string>,
  categorySet: Set<string>,
  districtSet: Set<string>,
  zipSet: Set<string>,
  nibrsSet: Set<string>,
  maxDate: string,
): IncidentPayload {
  const records: IncidentRecord[] = [];
  for (const [key, count] of aggMap) {
    const [d, ot, ca, di, zi, n] = key.split("|");
    records.push({ d, ot, ca, di, zi, n, c: count });
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const priorYear = currentYear - 1;
  const monthDay = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  let ytdCurrent = 0, ytdPrior = 0;
  for (const r of records) {
    if (r.d >= `${currentYear}-01-01` && r.d <= `${currentYear}-${monthDay}`) ytdCurrent += r.c;
    if (r.d >= `${priorYear}-01-01` && r.d <= `${priorYear}-${monthDay}`) ytdPrior += r.c;
  }

  const total = records.reduce((s, r) => s + r.c, 0);
  const pctChange = ytdPrior === 0 ? 0 : (ytdCurrent - ytdPrior) / ytdPrior;

  console.log(`[incidents-etl] Aggregated to ${records.length.toLocaleString()} rows, total=${total.toLocaleString()}`);

  return {
    lastUpdated: new Date().toISOString(),
    dataThrough: maxDate,
    records,
    offenseTypes: Array.from(offenseTypeSet).sort(),
    categories: Array.from(categorySet).sort(),
    districts: Array.from(districtSet).sort(),
    zipCodes: Array.from(zipSet).sort(),
    nibrsCodes: Array.from(nibrsSet).sort(),
    summary: { total, ytdCurrent, ytdPrior, pctChange },
  };
}
