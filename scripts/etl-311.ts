/**
 * ETL: Dallas 311 Service Requests (Socrata)
 * Source: https://www.dallasopendata.com/resource/gc4d-8a49
 * Output: data/generated/311-data.json(.gz)
 */
import type { Request311Payload, Request311Record } from "../src/lib/types/requests311";

const ENDPOINT = "https://www.dallasopendata.com/resource/gc4d-8a49.json";
const PAGE_SIZE = 50_000;
const MAX_RECORDS = 2_000_000;
const DATA_FLOOR = "2020-01-01T00:00:00";

interface Socrata311 {
  created_date?: string;
  service_request_type?: string;
  department?: string;
  status?: string;
  city_council_district?: string;
  address?: string;
  [key: string]: unknown;
}

function cleanDepartment(raw: string | undefined): string {
  if (!raw) return "Unknown";
  // Clean up common department name issues
  return raw.trim().replace(/\s+/g, " ");
}

function cleanRequestType(raw: string | undefined): string {
  if (!raw) return "Unknown";
  // Split on " - " and take first part for high-level category
  const parts = raw.split(" - ");
  return parts[0].trim();
}

export async function run311ETL(): Promise<Request311Payload> {
  console.log("[311-etl] Fetching from Socrata...");

  const allRecords: Socrata311[] = [];
  let offset = 0;

  while (offset < MAX_RECORDS) {
    const url = `${ENDPOINT}?$where=created_date>='${DATA_FLOOR}'&$limit=${PAGE_SIZE}&$offset=${offset}&$order=created_date DESC`;
    console.log(`[311-etl] Fetching offset=${offset}...`);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Socrata ${res.status}: ${res.statusText}`);
    const batch: Socrata311[] = await res.json();

    if (batch.length === 0) break;
    allRecords.push(...batch);
    offset += batch.length;

    if (batch.length < PAGE_SIZE) break;
  }

  console.log(`[311-etl] Fetched ${allRecords.length.toLocaleString()} records`);

  // Aggregate
  const aggMap = new Map<string, number>();
  const records: Request311Record[] = [];
  const requestTypeSet = new Set<string>();
  const departmentSet = new Set<string>();
  const statusSet = new Set<string>();
  const districtSet = new Set<string>();
  const zipSet = new Set<string>();
  let maxDate = "";

  for (const raw of allRecords) {
    if (!raw.created_date) continue;
    const date = raw.created_date.substring(0, 10);
    const requestType = cleanRequestType(raw.service_request_type);
    const department = cleanDepartment(raw.department);
    const status = raw.status?.trim() || "Unknown";
    const district = raw.city_council_district?.trim() || "";
    // Extract zip from address (e.g. "123 MAIN ST, DALLAS, TX, 75201")
    const zipMatch = raw.address?.match(/\b(\d{5})\s*$/);
    const zip = zipMatch ? zipMatch[1] : "";

    requestTypeSet.add(requestType);
    departmentSet.add(department);
    statusSet.add(status);
    if (district) districtSet.add(district);
    if (zip) zipSet.add(zip);
    if (date > maxDate) maxDate = date;

    const key = `${date}|${requestType}|${department}|${status}|${district}|${zip}`;
    aggMap.set(key, (aggMap.get(key) ?? 0) + 1);
  }

  for (const [key, count] of aggMap) {
    const [d, rt, dp, st, di, zi] = key.split("|");
    records.push({ d, rt, dp, st, di, zi, c: count });
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

  const total = records.reduce((s, r) => s + r.c, 0);

  console.log(`[311-etl] Aggregated to ${records.length.toLocaleString()} rows, total=${total.toLocaleString()}`);

  return {
    lastUpdated: new Date().toISOString(),
    dataThrough: maxDate,
    records,
    requestTypes: Array.from(requestTypeSet).sort(),
    departments: Array.from(departmentSet).sort(),
    statuses: Array.from(statusSet).sort(),
    districts: Array.from(districtSet).sort(),
    zipCodes: Array.from(zipSet).sort(),
    summary: {
      total,
      ytdCurrent,
      ytdPrior,
      pctChange: ytdPrior === 0 ? 0 : (ytdCurrent - ytdPrior) / ytdPrior,
    },
  };
}
