/**
 * ETL: Dallas Police Incidents (Socrata)
 * Source: data/generated/_incidents-etl.csv (from Python) or Socrata bulk CSV
 * Output: data/generated/incidents-data.json(.gz)
 *
 * Now includes: hourly data, case status, lat/lon points, NIBRS tree hierarchy.
 */
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import type { IncidentPayload, IncidentRecord, IncidentHourly, IncidentPoint, NIBRSTreeNode } from "../src/lib/types/incidents";
import { normalizeDistrict, caseStatus, normalizeCrimeAgainst, normalizeOffenseGroup, normalizeNibrs } from "./utils/normalize";
import { fetchSocrataJSON } from "./utils/socrata-fetch";
import { fetchArcGISEach } from "./utils/arcgis-fetch";
import { loadNIBRS } from "./utils/load-crosswalks";

const DEFAULT_ETL_CSV = path.join(process.cwd(), "data", "generated", "_incidents-etl.csv");
const DEFAULT_SOCRATA_URL = "https://www.dallasopendata.com/resource/qv6i-rri7.json";
const DATA_FLOOR = "2017-01-01";
const PAGE_SIZE = 50_000;
const MAX_RECORDS = 2_000_000;

// Only store points from last 24 months for dot map (controls payload size)
const POINTS_MONTHS = 24;

export interface ArcGISIncidentFields {
  date: string;
  offenseCode: string;
  offenseDesc: string;
  district: string;
  location: string;
}

export interface IncidentsETLConfig {
  baseUrl?: string;
  datasetId?: string;
  etlCsvPath?: string;
  /** ArcGIS layer + field mapping, for non-Socrata portals (e.g. Fort Worth). */
  arcgis?: { layerUrl: string; fields: ArcGISIncidentFields };
}

export async function runIncidentsETL(config?: IncidentsETLConfig): Promise<IncidentPayload> {
  if (config?.arcgis) {
    return runFromArcGIS(config.arcgis.layerUrl, config.arcgis.fields);
  }
  const etlCsv = config?.etlCsvPath ?? DEFAULT_ETL_CSV;
  if (fs.existsSync(etlCsv)) {
    return runFromCSV(etlCsv);
  }
  console.log("[incidents-etl] No ETL CSV found, falling back to Socrata API...");
  const socrataUrl = config?.baseUrl && config?.datasetId
    ? `${config.baseUrl}/${config.datasetId}.json`
    : DEFAULT_SOCRATA_URL;
  return runFromSocrataJSON(socrataUrl);
}

/**
 * Offense codes Fort Worth uses that are absent from the Dallas NIBRS
 * crosswalk. 90A/90I are genuine NIBRS Group B codes the Dallas extract never
 * emitted; EDU/TCG/TRC/WAR are Fort Worth local codes. Together they are ~3%
 * of Fort Worth records since 2017.
 */
const LOCAL_OFFENSE_CODES: Record<
  string,
  { crimeAgainst: string; offenseGroup: string; description: string }
> = {
  "90A": { crimeAgainst: "Group B Offenses", offenseGroup: "Bad Checks", description: "Bad Checks" },
  "90I": { crimeAgainst: "Group B Offenses", offenseGroup: "Runaway", description: "Runaway" },
  EDU: { crimeAgainst: "Group B Offenses", offenseGroup: "All Other Offenses", description: "Education Code Violation" },
  TCG: { crimeAgainst: "Group B Offenses", offenseGroup: "All Other Offenses", description: "Traffic Code — General" },
  TRC: { crimeAgainst: "Group B Offenses", offenseGroup: "All Other Offenses", description: "Traffic Code Violation" },
  WAR: { crimeAgainst: "Group B Offenses", offenseGroup: "All Other Offenses", description: "Warrant Service" },
};

/** Parse an ArcGIS "(lat, lon)" string field. */
function parseLocationString(raw: unknown): { lat: number; lon: number } | null {
  if (typeof raw !== "string") return null;
  const m = raw.match(/\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lon = parseFloat(m[2]);
  if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) return null;
  return { lat, lon };
}

/**
 * ETL from an ArcGIS Feature Service layer (Fort Worth).
 *
 * Two structural differences from the Socrata sources are worth knowing when
 * reading the output:
 *   - The layer carries no clearance/disposition field, so every record lands
 *     in case status "Unknown". The youth-clearance KPIs are therefore empty
 *     for ArcGIS-sourced jurisdictions.
 *   - There is no ZIP field; district comes from CouncilDistrict instead.
 */
async function runFromArcGIS(
  layerUrl: string,
  fields: ArcGISIncidentFields,
): Promise<IncidentPayload> {
  console.log("[incidents-etl] Fetching from ArcGIS Feature Service...");

  // NIBRS code → { crimeAgainst, offenseGroup, description }
  const nibrsByCode = new Map<
    string,
    { crimeAgainst: string; offenseGroup: string; description: string }
  >();
  for (const e of loadNIBRS()) {
    if (!e.nibrsCode) continue;
    nibrsByCode.set(e.nibrsCode, {
      crimeAgainst: e.crimeAgainst,
      offenseGroup: e.offense,
      description: e.offenseDescription || e.offense,
    });
  }
  for (const [code, entry] of Object.entries(LOCAL_OFFENSE_CODES)) {
    if (!nibrsByCode.has(code)) nibrsByCode.set(code, entry);
  }

  const aggMap = new Map<string, number>();
  const hourlyMap = new Map<string, number>();
  const pointMap = new Map<string, { lat: number; lon: number; cs: string; ca: string; d: string; c: number }>();
  const offenseTypeSet = new Set<string>();
  const crimeAgainstSet = new Set<string>();
  const categorySet = new Set<string>();
  const districtSet = new Set<string>();
  const zipSet = new Set<string>();
  const nibrsSet = new Set<string>();
  const caseStatusSet = new Set<string>();
  const nibrsTreeMap = new Map<string, Map<string, Set<string>>>();
  let minDate = "9999";
  let maxDate = "";
  let unmatchedCodes = 0;

  const now = new Date();
  const cutoffDate = new Date(now.getFullYear(), now.getMonth() - POINTS_MONTHS, 1);
  const pointsCutoff = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().substring(0, 10);

  // Rows are aggregated as each page lands rather than collected first —
  // holding ~576k row objects is enough to exhaust a default Node heap.
  function ingestRow(raw: Record<string, unknown>): void {
    const rawDate = raw[fields.date];
    if (!rawDate) return;
    const iso =
      typeof rawDate === "number"
        ? new Date(rawDate).toISOString()
        : String(rawDate);
    const date = iso.substring(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    if (date < DATA_FLOOR) return;
    // The layer holds a handful of future-dated records; they would skew the
    // "data through" label and the YTD comparison.
    if (date > today) return;

    const code = String(raw[fields.offenseCode] ?? "").trim().toUpperCase();
    const mapped = nibrsByCode.get(code);
    if (!mapped) unmatchedCodes++;

    const offenseType = String(raw[fields.offenseDesc] ?? "").trim() || "Unknown";
    const crimeAgainst = normalizeCrimeAgainst(mapped?.crimeAgainst ?? "");
    const category = normalizeOffenseGroup(mapped?.offenseGroup ?? "");
    const nibrs = normalizeNibrs(mapped?.description ?? offenseType);
    const districtRaw = String(raw[fields.district] ?? "").trim();
    const district = districtRaw ? normalizeDistrict(districtRaw) : "";
    // No clearance/disposition field is published on the layer.
    const cs = caseStatus(undefined);
    const zip = "";

    offenseTypeSet.add(offenseType);
    crimeAgainstSet.add(crimeAgainst);
    categorySet.add(category);
    if (district) districtSet.add(district);
    if (nibrs) nibrsSet.add(nibrs);
    caseStatusSet.add(cs);
    if (date > maxDate) maxDate = date;
    if (date < minDate) minDate = date;

    if (crimeAgainst && category && nibrs) {
      if (!nibrsTreeMap.has(crimeAgainst)) nibrsTreeMap.set(crimeAgainst, new Map());
      const catMap = nibrsTreeMap.get(crimeAgainst)!;
      if (!catMap.has(category)) catMap.set(category, new Set());
      catMap.get(category)!.add(nibrs);
    }

    const key = `${date}|${offenseType}|${crimeAgainst}|${category}|${district}|${zip}|${nibrs}|${cs}`;
    aggMap.set(key, (aggMap.get(key) ?? 0) + 1);

    const hourMatch = iso.match(/T(\d{2}):/);
    if (hourMatch) {
      const h = parseInt(hourMatch[1]);
      if (h >= 0 && h < 24) {
        const dw = new Date(date + "T00:00:00").getDay();
        hourlyMap.set(`${h}-${dw}`, (hourlyMap.get(`${h}-${dw}`) ?? 0) + 1);
      }
    }

    if (date >= pointsCutoff) {
      const pt = parseLocationString(raw[fields.location]);
      if (pt) {
        const ptKey = `${pt.lat.toFixed(4)},${pt.lon.toFixed(4)}|${cs}|${category}|${date}`;
        const existing = pointMap.get(ptKey);
        if (existing) existing.c++;
        else pointMap.set(ptKey, { lat: pt.lat, lon: pt.lon, cs, ca: category, d: date, c: 1 });
      }
    }
  }

  const totalRows = await fetchArcGISEach<Record<string, unknown>>(
    {
      label: "incidents-etl",
      layerUrl,
      outFields: [
        fields.date,
        fields.offenseCode,
        fields.offenseDesc,
        fields.district,
        fields.location,
      ],
      // Reported_Date is stored as an ISO string, so a lexical compare is a
      // correct date filter and lets the service use its index.
      where: `${fields.date} >= '${DATA_FLOOR}'`,
      // Ordering is left to the layer's object-id field — see arcgis-fetch.
      maxRecords: MAX_RECORDS,
    },
    (batch) => {
      for (const raw of batch) ingestRow(raw);
    },
  );

  if (unmatchedCodes > 0) {
    console.log(
      `[incidents-etl] ${unmatchedCodes.toLocaleString()} records had an offense code ` +
        `absent from the NIBRS crosswalk — grouped as "All Other Offenses"`,
    );
  }

  const nibrsTree = buildTreeFromData(nibrsTreeMap);
  console.log(`[incidents-etl] Processed ${totalRows.toLocaleString()} ArcGIS records`);
  return buildPayload(aggMap, hourlyMap, pointMap, nibrsTree, offenseTypeSet, crimeAgainstSet, categorySet, districtSet, zipSet, nibrsSet, caseStatusSet, minDate, maxDate);
}

async function runFromCSV(
  csvPath: string,
): Promise<IncidentPayload> {
  console.log(`[incidents-etl] Reading from ${path.basename(csvPath)}...`);

  const aggMap = new Map<string, number>();
  const hourlyMap = new Map<string, number>();
  const pointMap = new Map<string, { lat: number; lon: number; cs: string; ca: string; d: string; c: number }>();
  const offenseTypeSet = new Set<string>();
  const crimeAgainstSet = new Set<string>();
  const categorySet = new Set<string>();
  const districtSet = new Set<string>();
  const zipSet = new Set<string>();
  const nibrsSet = new Set<string>();
  const caseStatusSet = new Set<string>();
  // For building NIBRS tree from data
  const nibrsTreeMap = new Map<string, Map<string, Set<string>>>();
  let minDate = "9999";
  let maxDate = "";
  let totalRows = 0;

  const now = new Date();
  const cutoffDate = new Date(now.getFullYear(), now.getMonth() - POINTS_MONTHS, 1);
  const pointsCutoff = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, "0")}-01`;

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
        const crimeAgainst = normalizeCrimeAgainst(row.crime_against ?? "");
        const category = normalizeOffenseGroup(row.category ?? "");
        const district = normalizeDistrict(row.district);
        const zip = row.zip?.trim() || "";
        const nibrs = row.nibrs?.trim() || "";
        const cs = caseStatus(row.case_status);
        const hour = row.hour?.trim() || "";

        offenseTypeSet.add(offenseType);
        crimeAgainstSet.add(crimeAgainst);
        categorySet.add(category);
        if (district) districtSet.add(district);
        if (zip) zipSet.add(zip);
        if (nibrs) nibrsSet.add(nibrs);
        caseStatusSet.add(cs);
        if (date > maxDate) maxDate = date;
        if (date < minDate) minDate = date;

        // Build NIBRS tree from data
        if (crimeAgainst && category && nibrs) {
          if (!nibrsTreeMap.has(crimeAgainst)) nibrsTreeMap.set(crimeAgainst, new Map());
          const catMap = nibrsTreeMap.get(crimeAgainst)!;
          if (!catMap.has(category)) catMap.set(category, new Set());
          catMap.get(category)!.add(nibrs);
        }

        const key = `${date}|${offenseType}|${crimeAgainst}|${category}|${district}|${zip}|${nibrs}|${cs}`;
        aggMap.set(key, (aggMap.get(key) ?? 0) + 1);

        if (hour !== "") {
          const h = parseInt(hour);
          if (h >= 0 && h < 24) {
            const d = new Date(date + "T00:00:00");
            const dw = d.getDay();
            hourlyMap.set(`${h}-${dw}`, (hourlyMap.get(`${h}-${dw}`) ?? 0) + 1);
          }
        }

        if (date >= pointsCutoff) {
          const lat = parseFloat(row.lat ?? "");
          const lon = parseFloat(row.lon ?? "");
          if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
            const ptKey = `${lat.toFixed(4)},${lon.toFixed(4)}|${cs}|${category}|${date}`;
            const existing = pointMap.get(ptKey);
            if (existing) existing.c++;
            else pointMap.set(ptKey, { lat, lon, cs, ca: category, d: date, c: 1 });
          }
        }

        if (totalRows % 100_000 === 0) {
          console.log(`[incidents-etl] Processed ${totalRows.toLocaleString()} rows...`);
        }
      },
      complete: () => resolve(),
      error: (err) => reject(err),
    });
  });

  const nibrsTree = buildTreeFromData(nibrsTreeMap);
  console.log(`[incidents-etl] Parsed ${totalRows.toLocaleString()} rows from CSV`);
  return buildPayload(aggMap, hourlyMap, pointMap, nibrsTree, offenseTypeSet, crimeAgainstSet, categorySet, districtSet, zipSet, nibrsSet, caseStatusSet, minDate, maxDate);
}

async function runFromSocrataJSON(socrataJsonUrl: string = DEFAULT_SOCRATA_URL): Promise<IncidentPayload> {
  console.log("[incidents-etl] Fetching from Socrata JSON API...");

  const aggMap = new Map<string, number>();
  const hourlyMap = new Map<string, number>();
  const pointMap = new Map<string, { lat: number; lon: number; cs: string; ca: string; d: string; c: number }>();
  const offenseTypeSet = new Set<string>();
  const crimeAgainstSet = new Set<string>();
  const categorySet = new Set<string>();
  const districtSet = new Set<string>();
  const zipSet = new Set<string>();
  const nibrsSet = new Set<string>();
  const caseStatusSet = new Set<string>();
  const nibrsTreeMap = new Map<string, Map<string, Set<string>>>();
  let minDate = "9999";
  let maxDate = "";
  let totalFetched = 0;
  let offset = 0;

  const now = new Date();
  const cutoffDate = new Date(now.getFullYear(), now.getMonth() - POINTS_MONTHS, 1);
  const pointsCutoff = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, "0")}-01`;

  while (offset < MAX_RECORDS) {
    const url = `${socrataJsonUrl}?$where=date1>='${DATA_FLOOR}T00:00:00'&$select=date1,offincident,nibrs_crimeagainst,nibrs_crime_category,nibrs_crime,district,zip_code,ucr_disp,time1,geocoded_column&$limit=${PAGE_SIZE}&$offset=${offset}&$order=date1 DESC`;
    console.log(`[incidents-etl] Fetching offset=${offset}...`);

    const batch = await fetchSocrataJSON<Array<Record<string, unknown>>>(url, { label: "incidents-etl" });

    if (batch.length === 0) break;
    totalFetched += batch.length;

    for (const raw of batch) {
      if (!raw.date1) continue;
      const date = String(raw.date1).substring(0, 10);
      const offenseType = String(raw.offincident ?? "Unknown").trim();
      const crimeAgainst = normalizeCrimeAgainst(String(raw.nibrs_crimeagainst ?? ""));
      const category = normalizeOffenseGroup(String(raw.nibrs_crime_category ?? ""));
      const district = normalizeDistrict(String(raw.district ?? ""));
      const zip = String(raw.zip_code ?? "").trim();
      const nibrs = normalizeNibrs(String(raw.nibrs_crime ?? ""));
      const cs = caseStatus(String(raw.ucr_disp ?? ""));

      offenseTypeSet.add(offenseType);
      crimeAgainstSet.add(crimeAgainst);
      categorySet.add(category);
      if (district) districtSet.add(district);
      if (zip) zipSet.add(zip);
      if (nibrs) nibrsSet.add(nibrs);
      caseStatusSet.add(cs);
      if (date > maxDate) maxDate = date;
      if (date < minDate) minDate = date;

      // Build NIBRS tree from data
      if (crimeAgainst !== "Unknown" && category !== "Unknown" && nibrs) {
        if (!nibrsTreeMap.has(crimeAgainst)) nibrsTreeMap.set(crimeAgainst, new Map());
        const catMap = nibrsTreeMap.get(crimeAgainst)!;
        if (!catMap.has(category)) catMap.set(category, new Set());
        catMap.get(category)!.add(nibrs);
      }

      const key = `${date}|${offenseType}|${crimeAgainst}|${category}|${district}|${zip}|${nibrs}|${cs}`;
      aggMap.set(key, (aggMap.get(key) ?? 0) + 1);

      // Hour from time1
      const time1 = String(raw.time1 ?? "");
      const hMatch = time1.match(/^(\d{1,2}):/);
      if (hMatch) {
        const h = parseInt(hMatch[1]);
        if (h >= 0 && h < 24) {
          const d = new Date(date + "T00:00:00");
          const dw = d.getDay();
          hourlyMap.set(`${h}-${dw}`, (hourlyMap.get(`${h}-${dw}`) ?? 0) + 1);
        }
      }

      // Lat/lon from geocoded_column
      if (date >= pointsCutoff && raw.geocoded_column) {
        const geo = raw.geocoded_column as Record<string, unknown>;
        let lat: number | undefined, lon: number | undefined;
        if (geo.coordinates && Array.isArray(geo.coordinates)) {
          // GeoJSON coordinates are [lon, lat]
          lon = geo.coordinates[0] as number;
          lat = geo.coordinates[1] as number;
        } else if (geo.latitude && geo.longitude) {
          lat = parseFloat(String(geo.latitude));
          lon = parseFloat(String(geo.longitude));
        }
        if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
          const ptKey = `${lat.toFixed(4)},${lon.toFixed(4)}|${cs}|${category}|${date}`;
          const existing = pointMap.get(ptKey);
          if (existing) existing.c++;
          else pointMap.set(ptKey, { lat, lon, cs, ca: category, d: date, c: 1 });
        }
      }
    }

    offset += batch.length;
    if (batch.length < PAGE_SIZE) break;
  }

  const nibrsTree = buildTreeFromData(nibrsTreeMap);
  console.log(`[incidents-etl] Fetched ${totalFetched.toLocaleString()} records from Socrata`);
  return buildPayload(aggMap, hourlyMap, pointMap, nibrsTree, offenseTypeSet, crimeAgainstSet, categorySet, districtSet, zipSet, nibrsSet, caseStatusSet, minDate, maxDate);
}

/** Build NIBRS tree from actual data (crimeAgainst → category → nibrs codes) */
function buildTreeFromData(
  treeMap: Map<string, Map<string, Set<string>>>,
): NIBRSTreeNode[] {
  const tree: NIBRSTreeNode[] = [];
  for (const [ca, catMap] of treeMap) {
    for (const [og, codes] of catMap) {
      tree.push({
        crimeAgainst: ca,
        offenseGroup: og,
        nibrsCodes: Array.from(codes).sort().map((c) => ({ code: "", description: c })),
      });
    }
  }
  return tree;
}

function buildPayload(
  aggMap: Map<string, number>,
  hourlyMap: Map<string, number>,
  pointMap: Map<string, { lat: number; lon: number; cs: string; ca: string; d: string; c: number }>,
  nibrsTree: NIBRSTreeNode[],
  offenseTypeSet: Set<string>,
  crimeAgainstSet: Set<string>,
  categorySet: Set<string>,
  districtSet: Set<string>,
  zipSet: Set<string>,
  nibrsSet: Set<string>,
  caseStatusSet: Set<string>,
  minDate: string,
  maxDate: string,
): IncidentPayload {
  const records: IncidentRecord[] = [];
  for (const [key, count] of aggMap) {
    const [d, ot, cag, ca, di, zi, n, cs] = key.split("|");
    records.push({ d, ot, cag, ca, di, zi, n, cs, c: count });
  }

  const hourly: IncidentHourly[] = [];
  for (const [key, count] of hourlyMap) {
    const [h, dw] = key.split("-").map(Number);
    hourly.push({ h, dw, c: count });
  }

  const points: IncidentPoint[] = Array.from(pointMap.values());

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
  console.log(`[incidents-etl] Hourly buckets: ${hourly.length}, Points: ${points.length.toLocaleString()}`);
  console.log(`[incidents-etl] Case statuses: ${Array.from(caseStatusSet).join(", ")}`);
  console.log(`[incidents-etl] Crime Against types: ${Array.from(crimeAgainstSet).join(", ")}`);
  console.log(`[incidents-etl] NIBRS tree: ${nibrsTree.length} offense group nodes`);

  return {
    lastUpdated: new Date().toISOString(),
    dataThrough: maxDate,
    dataFrom: minDate === "9999" ? DATA_FLOOR : minDate,
    records,
    hourly,
    points,
    nibrsTree,
    offenseTypes: Array.from(offenseTypeSet).sort(),
    crimeAgainsts: Array.from(crimeAgainstSet).sort(),
    categories: Array.from(categorySet).sort(),
    districts: Array.from(districtSet).sort(),
    zipCodes: Array.from(zipSet).sort(),
    nibrsCodes: Array.from(nibrsSet).sort(),
    caseStatuses: Array.from(caseStatusSet).sort(),
    summary: { total, ytdCurrent, ytdPrior, pctChange },
  };
}
