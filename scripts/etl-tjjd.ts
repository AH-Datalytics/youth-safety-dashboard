/**
 * ETL: TJJD Youth Court Referrals
 * Output: data/generated/{jurisdiction}/tjjd-data.json(.gz)
 *
 * Two sources, selected by the jurisdiction's `youthCourt` config:
 *
 * 1. "tjjd-request" — TJJD's response to a Family Code 58.009 data request,
 *    at data/source/tjjd-referrals.xlsx. Monthly, six category cuts (age,
 *    gender, race/ethnicity, disposition, offense type, offense category),
 *    plus residence ZIP by year. One workbook covers several counties; the
 *    config's `county` picks one. See runFromReferralWorkbook.
 * 2. "tjjd-county" — TJJD's statewide county-level referral file on
 *    data.texas.gov (54dk-5ghb). Annual, offense-type splits only, no ZIP.
 *    For a county not covered by a data request.
 */
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import type { TJJDPayload, TJJDRecord, TJJDZipRecord } from "../src/lib/types/tjjd";
import { fetchSocrataJSON } from "./utils/socrata-fetch";

const TJJD_PATH = path.join(process.cwd(), "data", "source", "tjjd-referrals.xlsx");

/** Month name → number mapping */
const MONTH_MAP: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

/** data.texas.gov — TJJD County Level Referral Data, FY 2013-2021. */
const TJJD_COUNTY_ENDPOINT = "https://data.texas.gov/resource/54dk-5ghb.json";

/**
 * Offense-type columns in the TJJD county file, in reporting order. These six
 * partition every referral exactly once, so they also give the annual total.
 */
const COUNTY_OFFENSE_COLUMNS: Array<{ field: string; label: string }> = [
  { field: "violent_felony", label: "Violent Felony" },
  { field: "other_felony", label: "Other Felony" },
  { field: "misd", label: "Misdemeanor" },
  { field: "vop", label: "Violation of Probation" },
  { field: "status", label: "Status Offense" },
  { field: "other_cins", label: "Other Conduct in Need of Supervision" },
];

const COUNTY_TOTAL_CATEGORY = "Referrals";

interface TJJDCountyRow {
  calendar_year?: string;
  county?: string;
  juvenile_population?: string;
  referrals?: string;
  youth_referred?: string;
  referral_rate_1_000?: string;
  [key: string]: unknown;
}

export interface TJJDETLConfig {
  /** "tjjd-request" reads the 58.009 request workbook; "tjjd-county" pulls data.texas.gov. */
  kind: "tjjd-request" | "tjjd-county";
  /** County name as spelled by TJJD, e.g. "TARRANT". */
  county: string;
  /** ZIPs drawn on the jurisdiction's choropleth; others are dropped. */
  zipAllowList?: Set<string>;
}

export async function runTJJDETL(config: TJJDETLConfig): Promise<TJJDPayload> {
  if (!config.county) {
    throw new Error(`[tjjd-etl] youthCourt.kind=${config.kind} requires a county name`);
  }
  if (config.kind === "tjjd-county") return runFromTJJDCounty(config.county);
  return runFromReferralWorkbook(config.county, config.zipAllowList);
}

/**
 * TJJD statewide county-level referral data (data.texas.gov `54dk-5ghb`).
 *
 * Annual rather than monthly, and split only by offense type — there is no
 * age, race, gender, disposition, or ZIP detail. `mo` is set to 1 on every row
 * so the shared monthly plumbing still keys correctly; the payload's
 * `granularity: "annual"` tells the UI to label the axis by year alone.
 */
async function runFromTJJDCounty(county: string): Promise<TJJDPayload> {
  const upper = county.trim().toUpperCase();
  const url =
    `${TJJD_COUNTY_ENDPOINT}?county=${encodeURIComponent(upper)}` +
    `&$order=calendar_year&$limit=200`;

  console.log(`[tjjd-etl] Fetching TJJD county referral data for ${upper}...`);
  const rows = await fetchSocrataJSON<TJJDCountyRow[]>(url, { label: "tjjd-etl" });

  if (rows.length === 0) {
    console.log(`[tjjd-etl] WARNING: no TJJD rows for county "${upper}"`);
    return emptyTJJDPayload();
  }

  const records: TJJDRecord[] = [];

  const num = (v: unknown): number => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
    return isNaN(n) ? 0 : n;
  };

  for (const row of rows) {
    const yr = String(row.calendar_year ?? "").trim();
    if (!/^\d{4}$/.test(yr)) continue;

    // Offense-type breakdown.
    for (const col of COUNTY_OFFENSE_COLUMNS) {
      const v = num(row[col.field]);
      if (v === 0) continue;
      records.push({ cat: "Offense Type", desc: col.label, yr, mo: 1, mn: "", v });
    }

    // Total partition — drives the time series and the headline count.
    const referrals = num(row.referrals);
    if (referrals > 0) {
      records.push({
        cat: COUNTY_TOTAL_CATEGORY,
        desc: "Total Referrals",
        yr,
        mo: 1,
        mn: "",
        v: referrals,
      });
    }

    // Distinct youth is a separate measure, not a partition of referrals.
    const youth = num(row.youth_referred);
    if (youth > 0) {
      records.push({
        cat: "Youth Referred",
        desc: "Distinct Youth Referred",
        yr,
        mo: 1,
        mn: "",
        v: youth,
      });
    }
  }

  const categories = [...new Set(records.map((r) => r.cat))].sort();
  const descriptions = [...new Set(records.map((r) => r.desc))].sort();
  const years = [...new Set(records.map((r) => r.yr))].sort();
  const totalReferrals = records
    .filter((r) => r.cat === COUNTY_TOTAL_CATEGORY)
    .reduce((s, r) => s + r.v, 0);

  console.log(
    `[tjjd-etl] ${upper}: ${records.length} rows across ${years.length} years ` +
      `(${years[0]}-${years[years.length - 1]}), total=${totalReferrals.toLocaleString()}`,
  );

  return {
    lastUpdated: new Date().toISOString(),
    records,
    // The county file carries no ZIP detail, so the choropleth stays hidden.
    zipRecords: [],
    categories,
    descriptions,
    years,
    granularity: "annual",
    totalCategory: COUNTY_TOTAL_CATEGORY,
    sourceLabel: "TJJD County Level Referral Data (data.texas.gov)",
    summary: { totalReferrals, totalZipReferrals: 0 },
  };
}

/** ZIPs in a jurisdiction's ZCTA GeoJSON (public/…), or undefined if none. */
export function loadZctaZips(publicPath?: string): Set<string> | undefined {
  if (!publicPath) return undefined;
  const file = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  if (!fs.existsSync(file)) {
    console.log(`[tjjd-etl] WARNING: ${publicPath} not found; ZIP records unfiltered`);
    return undefined;
  }
  const geo = JSON.parse(fs.readFileSync(file, "utf-8")) as {
    features: Array<{ properties: { zip: string } }>;
  };
  return new Set(geo.features.map((f) => f.properties.zip));
}

/**
 * Reads the TJJD referral-disposition data request workbook
 * (data/source/tjjd-referrals.xlsx — currently request #42717, Dallas and
 * Tarrant, CY 2020 onward).
 *
 * TJJD returns this as a formatted report, not a table. Every sheet shares the
 * same skeleton, which is what the parser keys on:
 *
 *   row 0      title
 *   rows 1..k  header bands, merged across columns: county ("DALLAS COUNTY"),
 *              then group ("Gender", "Race/Ethnicity", "Disposition", ...)
 *   row k+1    value labels ("Male", "Felony", "10 -- 11", ...)
 *   data       Calendar Year (only on a year's first row) | Month | values...
 *              A "Total" row closes each year; it is skipped.
 *
 * Offense Category is split one sheet per county ("Offense Category-Dallas")
 * with no county band, so the county comes from the sheet name. The ZIP sheet
 * has year columns instead of months.
 */
async function runFromReferralWorkbook(
  county: string,
  zipAllowList?: Set<string>,
): Promise<TJJDPayload> {
  if (!fs.existsSync(TJJD_PATH)) {
    console.log("[tjjd-etl] WARNING: TJJD referral workbook not found, returning empty payload");
    return emptyTJJDPayload();
  }

  const countyKey = normalizeCounty(county);
  console.log(`[tjjd-etl] Reading TJJD referral workbook for ${countyKey} COUNTY...`);
  const workbook = XLSX.readFile(TJJD_PATH);

  const records: TJJDRecord[] = [];
  let zipRecords: TJJDZipRecord[] = [];
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
      raw: true,
    }) as unknown[][];
    if (/zip/i.test(sheetName)) {
      zipRecords = parseZipSheet(rows, countyKey, zipAllowList);
    } else {
      records.push(...parseMonthlySheet(sheetName, rows, countyKey));
    }
  }

  if (records.length === 0) {
    throw new Error(`[tjjd-etl] No rows for ${countyKey} COUNTY — has the workbook layout changed?`);
  }

  const categories = [...new Set(records.map((r) => r.cat))].sort();
  const descriptions = [...new Set(records.map((r) => r.desc))].sort();
  const years = [...new Set(records.map((r) => r.yr))].sort();

  const totalReferrals = records
    .filter((r) => r.cat === TOTAL_CATEGORY)
    .reduce((s, r) => s + r.v, 0);
  const totalZipReferrals = zipRecords.reduce((s, r) => s + r.v, 0);
  const lastYr = years[years.length - 1];
  const lastMo = Math.max(...records.filter((r) => r.yr === lastYr).map((r) => r.mo));

  console.log(`[tjjd-etl] ${records.length.toLocaleString()} rows, total=${totalReferrals.toLocaleString()}`);
  console.log(`[tjjd-etl] Coverage: ${years[0]}-01 through ${lastYr}-${String(lastMo).padStart(2, "0")}`);
  console.log(`[tjjd-etl] ZIP: ${zipRecords.length.toLocaleString()} rows, total=${totalZipReferrals.toLocaleString()}`);
  console.log(`[tjjd-etl] Categories: ${categories.join(", ")}`);

  return {
    lastUpdated: new Date().toISOString(),
    records,
    zipRecords,
    categories,
    descriptions,
    years,
    granularity: "monthly",
    totalCategory: TOTAL_CATEGORY,
    sourceLabel: "TJJD referral dispositions (Family Code 58.009 request)",
    summary: { totalReferrals, totalZipReferrals },
  };
}

/**
 * Suppressed cells (" < 5") are counted as 1. This matches how the original
 * Dallas extract was prepared, so historical figures stay comparable. It is a
 * floor, not an estimate.
 */
const SUPPRESSED_VALUE = 1;

/** Gender partitions every referral exactly once, so it carries the totals. */
const TOTAL_CATEGORY = "Gender";

const str = (v: unknown) => String(v ?? "").trim();

/** "DALLAS COUNTY", "Dallas", "dallas county" → "DALLAS". */
function normalizeCounty(s: string): string {
  return s.trim().toUpperCase().replace(/\s+COUNTY$/, "");
}

function cellValue(raw: unknown): number {
  if (typeof raw === "number") return raw;
  const s = str(raw);
  if (s === "") return 0;
  if (s.startsWith("<")) return SUPPRESSED_VALUE;
  const n = parseInt(s.replace(/,/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

/** Header band text → payload category name. */
function categoryFor(group: string, sheetName: string): string {
  const g = group || sheetName.replace(/-.*$/, "").trim();
  if (/^age/i.test(g)) return "Age";
  if (/^race/i.test(g)) return "Race/Ethnicity";
  if (/^offense category/i.test(g)) return "Offense Category";
  if (/^offense/i.test(g)) return "Offense Type";
  return g;
}

/** Value label → payload description, keeping the names the UI already uses. */
function descriptionFor(cat: string, label: string): string {
  if (cat === "Age") return `Age ${label.replace(/\s*--\s*/, " & ")}`;
  if (cat === "Race/Ethnicity" && label === "Other") return "Other Race/Ethnicity";
  return label;
}

/** Forward-fill a merged header band across the value columns. */
function fillRight(row: unknown[] | undefined, width: number, firstCol: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (let c = 0; c < width; c++) {
    const v = str(row?.[c]);
    if (c >= firstCol && v) cur = v;
    out.push(c >= firstCol ? cur : "");
  }
  return out;
}

interface ColumnSpec {
  col: number;
  county: string;
  cat: string;
  label: string;
}

/**
 * Resolves each value column to (county, category, label) from the header
 * bands between the title and `labelRow`. A band naming a COUNTY sets the
 * county; any other band sets the category group. Value columns start at
 * `firstCol` — 2 on monthly sheets (Year | Month | …), 1 on the ZIP sheet.
 */
function resolveColumns(
  rows: unknown[][],
  labelRow: number,
  sheetName: string,
  firstCol: number,
  valueLabel: (raw: unknown) => string,
): ColumnSpec[] {
  const width = Math.max(...rows.slice(0, labelRow + 1).map((r) => r?.length ?? 0));
  const bands = rows.slice(1, labelRow).map((r) => fillRight(r, width, firstCol));
  const sheetCounty = /-\s*(\w+)\s*$/.exec(sheetName)?.[1] ?? "";

  const specs: ColumnSpec[] = [];
  for (let c = firstCol; c < width; c++) {
    const label = valueLabel(rows[labelRow]?.[c]);
    if (!label) continue;
    let county = normalizeCounty(sheetCounty);
    let group = "";
    for (const band of bands) {
      const v = band[c];
      if (!v) continue;
      if (/COUNTY$/i.test(v)) county = normalizeCounty(v);
      else if (!/calendar year/i.test(v)) group = v;
    }
    specs.push({ col: c, county, cat: categoryFor(group, sheetName), label });
  }
  return specs;
}

function parseMonthlySheet(sheetName: string, rows: unknown[][], county: string): TJJDRecord[] {
  const firstData = rows.findIndex((r) => MONTH_MAP[str(r?.[1])] !== undefined);
  if (firstData < 2) {
    console.log(`[tjjd-etl] Sheet "${sheetName}": no monthly rows found, skipped`);
    return [];
  }

  const specs = resolveColumns(rows, firstData - 1, sheetName, 2, str).filter(
    (s) => s.county === county,
  );
  if (specs.length === 0) return [];

  const records: TJJDRecord[] = [];
  let yr = "";
  for (const row of rows.slice(firstData)) {
    const y = str(row?.[0]);
    if (/^\d{4}$/.test(y)) yr = y;
    const mn = str(row?.[1]);
    const mo = MONTH_MAP[mn];
    if (!mo || !yr) continue; // "Total" rows, notes, blanks

    for (const s of specs) {
      const v = cellValue(row[s.col]);
      if (v === 0) continue;
      records.push({ cat: s.cat, desc: descriptionFor(s.cat, s.label), yr, mo, mn, v });
    }
  }

  console.log(`[tjjd-etl] Sheet "${sheetName}": ${records.length} rows from ${specs.length} columns`);
  return records;
}

/**
 * ZIP of the child's residence, by calendar year. When an allow-list is given
 * (the ZIPs drawn on the jurisdiction's choropleth), out-of-area and
 * placeholder ZIPs are dropped.
 */
function parseZipSheet(rows: unknown[][], county: string, allow?: Set<string>): TJJDZipRecord[] {
  const firstData = rows.findIndex((r) => /^\d{4,5}$/.test(str(r?.[0])));
  if (firstData < 2) return [];

  const specs = resolveColumns(rows, firstData - 1, "Zip Code", 1, (raw) => {
    const y = str(raw);
    return /^\d{4}$/.test(y) ? y : "";
  }).filter((s) => s.county === county);

  const records: TJJDZipRecord[] = [];
  for (const row of rows.slice(firstData)) {
    const zip = str(row?.[0]).padStart(5, "0");
    if (!/^\d{5}$/.test(zip) || zip === "00000") continue;
    if (allow && !allow.has(zip)) continue;
    for (const s of specs) {
      const v = cellValue(row[s.col]);
      if (v === 0) continue;
      records.push({ zip: parseInt(zip, 10), yr: s.label, v });
    }
  }
  return records;
}

export function emptyTJJDPayload(): TJJDPayload {
  return {
    lastUpdated: new Date().toISOString(),
    records: [],
    zipRecords: [],
    categories: [],
    descriptions: [],
    years: [],
    granularity: "monthly",
    totalCategory: "Gender",
    summary: { totalReferrals: 0, totalZipReferrals: 0 },
  };
}
