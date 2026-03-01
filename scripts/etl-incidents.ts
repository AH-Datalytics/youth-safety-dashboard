/**
 * ETL: Dallas Police Incidents (Socrata)
 * Source: https://www.dallasopendata.com/resource/qv6i-rri7
 * Output: data/generated/incidents-data.json(.gz)
 */
import type { IncidentPayload, IncidentRecord } from "../src/lib/types/incidents";

const ENDPOINT = "https://www.dallasopendata.com/resource/qv6i-rri7.json";
const PAGE_SIZE = 50_000;
const MAX_RECORDS = 2_000_000;
const DATA_FLOOR = "2017-01-01T00:00:00";

interface SocrataIncident {
  date1: string;
  offincident: string;
  nibrs_crime_category?: string;
  nibrs_crime?: string;
  compstat_council_district?: string;
  zip_code?: string;
  [key: string]: unknown;
}

export async function runIncidentsETL(): Promise<IncidentPayload> {
  console.log("[incidents-etl] Fetching from Socrata...");

  const allRecords: SocrataIncident[] = [];
  let offset = 0;

  while (offset < MAX_RECORDS) {
    const url = `${ENDPOINT}?$where=date1>='${DATA_FLOOR}'&$limit=${PAGE_SIZE}&$offset=${offset}&$order=date1 DESC`;
    console.log(`[incidents-etl] Fetching offset=${offset}...`);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Socrata ${res.status}: ${res.statusText}`);
    const batch: SocrataIncident[] = await res.json();

    if (batch.length === 0) break;
    allRecords.push(...batch);
    offset += batch.length;

    if (batch.length < PAGE_SIZE) break;
  }

  console.log(`[incidents-etl] Fetched ${allRecords.length.toLocaleString()} records`);

  // Aggregate to daily counts
  const aggMap = new Map<string, { rec: IncidentRecord; count: number }>();
  const offenseTypeSet = new Set<string>();
  const categorySet = new Set<string>();
  const districtSet = new Set<string>();
  const zipSet = new Set<string>();
  const nibrsSet = new Set<string>();
  let maxDate = "";

  for (const raw of allRecords) {
    if (!raw.date1) continue;
    const date = raw.date1.substring(0, 10); // YYYY-MM-DD
    const offenseType = raw.offincident?.trim() || "Unknown";
    const category = raw.nibrs_crime_category?.trim() || "Unknown";
    const district = raw.compstat_council_district?.trim() || "";
    const zip = raw.zip_code?.trim() || "";
    const nibrs = raw.nibrs_crime?.trim() || "";

    offenseTypeSet.add(offenseType);
    categorySet.add(category);
    if (district) districtSet.add(district);
    if (zip) zipSet.add(zip);
    if (nibrs) nibrsSet.add(nibrs);
    if (date > maxDate) maxDate = date;

    const key = `${date}|${offenseType}|${category}|${district}|${zip}|${nibrs}`;
    const existing = aggMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      aggMap.set(key, {
        rec: { d: date, ot: offenseType, ca: category, di: district, zi: zip, n: nibrs, c: 1 },
        count: 1,
      });
    }
  }

  const records: IncidentRecord[] = Array.from(aggMap.values()).map(({ rec, count }) => ({
    ...rec,
    c: count,
  }));

  // Compute YTD
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
