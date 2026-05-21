/**
 * ETL: Dallas 311 Service Requests (Socrata)
 * Source: https://www.dallasopendata.com/resource/d7e7-envw
 * Output: data/generated/311-data.json(.gz)
 *
 * Fetches all departments. lat_location for dot map, priority for priority groups.
 * Uses unique_key for DISTINCTCOUNT matching PBI.
 */
import type { Request311Payload, Request311Record, Request311Point } from "../src/lib/types/requests311";
import { priorityGroup311 } from "./utils/normalize";

const DEFAULT_ENDPOINT = "https://www.dallasopendata.com/resource/d7e7-envw.json";
const PAGE_SIZE = 10_000;
const MAX_RECORDS = 5_000_000;
const DATA_FLOOR = "2020-01-01T00:00:00";

export interface ETL311Config {
  baseUrl?: string;
  datasetId?: string;
}

interface Socrata311 {
  unique_key?: string;
  created_date?: string;
  service_request_type?: string;
  department?: string;
  status?: string;
  priority?: string;
  city_council_district?: string;
  address?: string;
  lat_location?: string | { latitude?: string; longitude?: string };
  [key: string]: unknown;
}

function cleanRequestType(raw: string | undefined): string {
  if (!raw) return "Unknown";
  const parts = raw.split(" - ");
  return parts[0].trim();
}

/** Parse lat/lon from Socrata lat_location field (handles multiple formats) */
function parseLatLon(raw: unknown): { lat: number; lon: number } | null {
  if (!raw) return null;
  // Object format: { latitude: "...", longitude: "..." }
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const lat = parseFloat(String(obj.latitude ?? ""));
    const lon = parseFloat(String(obj.longitude ?? ""));
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) return { lat, lon };
    // GeoJSON coordinates format
    if (obj.coordinates && Array.isArray(obj.coordinates)) {
      const [lo, la] = obj.coordinates as number[];
      if (!isNaN(la) && !isNaN(lo) && la !== 0 && lo !== 0) return { lat: la, lon: lo };
    }
    return null;
  }
  // String format: "(lat, lon)" or "POINT(lon lat)"
  if (typeof raw === "string") {
    const parenMatch = raw.match(/\(([^,]+),\s*([^)]+)\)/);
    if (parenMatch) {
      const lat = parseFloat(parenMatch[1]);
      const lon = parseFloat(parenMatch[2]);
      if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
    }
    const pointMatch = raw.match(/POINT\s*\(([^ ]+)\s+([^)]+)\)/i);
    if (pointMatch) {
      const lon = parseFloat(pointMatch[1]);
      const lat = parseFloat(pointMatch[2]);
      if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
    }
  }
  return null;
}

export async function run311ETL(config?: ETL311Config): Promise<Request311Payload> {
  const endpoint = config?.baseUrl && config?.datasetId
    ? `${config.baseUrl}/${config.datasetId}.json`
    : DEFAULT_ENDPOINT;
  console.log("[311-etl] Fetching from Socrata (all departments)...");

  const allRecords: Socrata311[] = [];

  // Partition by year to avoid Socrata deep-pagination 500 errors
  const startYear = 2020;
  const endYear = new Date().getFullYear();
  for (let year = startYear; year <= endYear; year++) {
    const from = `${year}-01-01T00:00:00`;
    const to = `${year + 1}-01-01T00:00:00`;
    let offset = 0;

    while (offset < MAX_RECORDS) {
      const url = `${endpoint}?$where=created_date>='${from}' AND created_date<'${to}'&$limit=${PAGE_SIZE}&$offset=${offset}`;
      console.log(`[311-etl] Fetching ${year} offset=${offset}...`);

      let res: Response;
      let retries = 0;
      while (true) {
        res = await fetch(url);
        if (res.ok || retries >= 3) break;
        retries++;
        console.log(`[311-etl] Retry ${retries}/3 after ${res.status}...`);
        await new Promise((r) => setTimeout(r, 2000 * retries));
      }
      if (!res!.ok) throw new Error(`Socrata ${res!.status}: ${res!.statusText}`);
      const batch: Socrata311[] = await res!.json();

      if (batch.length === 0) break;
      allRecords.push(...batch);
      offset += batch.length;

      if (batch.length < PAGE_SIZE) break;
    }
  }

  console.log(`[311-etl] Fetched ${allRecords.length.toLocaleString()} records`);

  // Aggregate
  const aggMap = new Map<string, number>();
  const pointMap = new Map<string, { lat: number; lon: number; rt: string; pg: string; d: string; c: number }>();
  const requestTypeSet = new Set<string>();
  const departmentSet = new Set<string>();
  const statusSet = new Set<string>();
  const priorityGroupSet = new Set<string>();
  const districtSet = new Set<string>();
  const zipSet = new Set<string>();
  const seenKeys = new Set<string>();
  let maxDate = "";

  // Only store points from last 12 months for dot map
  const ptNow = new Date();
  const pointsCutoff = `${ptNow.getFullYear() - 1}-${String(ptNow.getMonth() + 1).padStart(2, "0")}-01`;

  for (const raw of allRecords) {
    if (!raw.created_date) continue;

    // DISTINCTCOUNT by unique_key (per PBI measure)
    const uniqueKey = raw.unique_key?.trim() ?? "";
    if (uniqueKey && seenKeys.has(uniqueKey)) continue;
    if (uniqueKey) seenKeys.add(uniqueKey);

    const date = raw.created_date.substring(0, 10);
    const requestType = cleanRequestType(raw.service_request_type);
    const department = raw.department?.trim() || "Code Compliance";
    const status = raw.status?.trim() || "Unknown";
    const pg = priorityGroup311(raw.priority);
    const district = raw.city_council_district?.trim() || "";
    const zipMatch = raw.address?.match(/\b(\d{5})\s*$/);
    const zip = zipMatch ? zipMatch[1] : "";

    requestTypeSet.add(requestType);
    departmentSet.add(department);
    statusSet.add(status);
    priorityGroupSet.add(pg);
    if (district) districtSet.add(district);
    if (zip) zipSet.add(zip);
    if (date > maxDate) maxDate = date;

    const key = `${date}|${requestType}|${department}|${status}|${pg}|${district}|${zip}`;
    aggMap.set(key, (aggMap.get(key) ?? 0) + 1);

    // Collect points for dot map (aggregate by location, recent only)
    const ll = date >= pointsCutoff ? parseLatLon(raw.lat_location) : null;
    if (ll) {
      // Round to ~100m precision for aggregation
      const ptKey = `${ll.lat.toFixed(4)},${ll.lon.toFixed(4)}|${requestType}|${pg}|${date}`;
      const existing = pointMap.get(ptKey);
      if (existing) {
        existing.c++;
      } else {
        pointMap.set(ptKey, { lat: ll.lat, lon: ll.lon, rt: requestType, pg, d: date, c: 1 });
      }
    }
  }

  const records: Request311Record[] = [];
  for (const [key, count] of aggMap) {
    const [d, rt, dp, st, pg, di, zi] = key.split("|");
    records.push({ d, rt, dp, st, pg, di, zi, c: count });
  }

  const points: Request311Point[] = Array.from(pointMap.values());

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
  console.log(`[311-etl] Points for dot map: ${points.length.toLocaleString()}`);
  console.log(`[311-etl] Priority groups: ${Array.from(priorityGroupSet).join(", ")}`);

  return {
    lastUpdated: new Date().toISOString(),
    dataThrough: maxDate,
    records,
    points,
    requestTypes: Array.from(requestTypeSet).sort(),
    departments: Array.from(departmentSet).sort(),
    statuses: Array.from(statusSet).sort(),
    priorityGroups: Array.from(priorityGroupSet).sort(),
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
