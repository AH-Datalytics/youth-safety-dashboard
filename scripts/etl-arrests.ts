/**
 * ETL: Dallas Arrests (Socrata)
 * Source: https://www.dallasopendata.com/resource/sdr7-6v3j
 * Output: data/generated/arrests-data.json(.gz)
 *
 * Age groups match PBI exactly:
 *   Young Adult/Adult binary: "Young Adult (18-24)" vs "Adult (25+)"
 *   Age Group Broad: 18-24, 25-40, 41-55, 56-70, Over 70
 * Uses ageatarresttime (preferred) falling back to age (per PBI DAX "Age No Blank").
 * Race cleanup: H→Hispanic or Latino, NH→Native Hawaiian/Pacific Islander.
 */
import type { ArrestPayload, ArrestRecord } from "../src/lib/types/arrests";
import { normalizeDistrict } from "./utils/normalize";

const DEFAULT_ENDPOINT = "https://www.dallasopendata.com/resource/sdr7-6v3j.json";
const PAGE_SIZE = 50_000;
const MAX_RECORDS = 500_000;

export interface ArrestsETLConfig {
  baseUrl?: string;
  datasetId?: string;
}

interface SocrataArrest {
  ararrestdate?: string;
  araction?: string;
  race?: string;
  sex?: string;
  age?: string;
  ageatarresttime?: string;
  arldistrict?: string;
  arlzip?: string;
  incidentnum?: string;
  arrestnumber?: string;
  [key: string]: unknown;
}

/** PBI DAX: Age Group Broad */
function ageGroupBroad(ageNum: number): string {
  if (ageNum >= 18 && ageNum <= 24) return "18-24";
  if (ageNum >= 25 && ageNum <= 40) return "25-40";
  if (ageNum >= 41 && ageNum <= 55) return "41-55";
  if (ageNum >= 56 && ageNum <= 70) return "56-70";
  if (ageNum > 70) return "Over 70";
  return "";
}

/** PBI DAX: Young Adult vs Adult binary */
function youngAdultBin(ageNum: number): string {
  if (ageNum >= 18 && ageNum <= 24) return "Young Adult (18-24)";
  if (ageNum >= 25) return "Adult (25+)";
  return "";
}

/** PBI: Race cleanup — H→Hispanic or Latino, NH→Native Hawaiian/Pacific Islander */
function cleanRace(raw: string | undefined): string {
  if (!raw || raw.trim() === "") return "Unknown";
  const v = raw.trim();
  if (v === "H") return "Hispanic or Latino";
  if (v === "NH") return "Native Hawaiian/Pacific Islander";
  return v;
}

function cleanSex(raw: string | undefined): string {
  if (!raw || raw.trim() === "") return "Unknown";
  const v = raw.trim().toUpperCase();
  if (v === "M" || v === "MALE") return "Male";
  if (v === "F" || v === "FEMALE") return "Female";
  return raw.trim();
}

export async function runArrestsETL(config?: ArrestsETLConfig): Promise<ArrestPayload> {
  const endpoint = config?.baseUrl && config?.datasetId
    ? `${config.baseUrl}/${config.datasetId}.json`
    : DEFAULT_ENDPOINT;
  console.log("[arrests-etl] Fetching from Socrata...");

  const allRecords: SocrataArrest[] = [];
  let offset = 0;

  while (offset < MAX_RECORDS) {
    // Fetch ageatarresttime in addition to age (PBI: "Age No Blank" = IF(ageatarresttime=BLANK(), age, ageatarresttime))
    const url = `${endpoint}?$select=ararrestdate,araction,race,sex,age,ageatarresttime,arldistrict,incidentnum,arrestnumber&$limit=${PAGE_SIZE}&$offset=${offset}&$order=ararrestdate DESC`;
    console.log(`[arrests-etl] Fetching offset=${offset}...`);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Socrata ${res.status}: ${res.statusText}`);
    const batch: SocrataArrest[] = await res.json();

    if (batch.length === 0) break;
    allRecords.push(...batch);
    offset += batch.length;

    if (batch.length < PAGE_SIZE) break;
  }

  console.log(`[arrests-etl] Fetched ${allRecords.length.toLocaleString()} records`);

  const aggMap = new Map<string, number>();
  const records: ArrestRecord[] = [];
  const chargeSet = new Set<string>();
  const raceSet = new Set<string>();
  const sexSet = new Set<string>();
  const ageGroupSet = new Set<string>();
  const youngAdultSet = new Set<string>();
  const districtSet = new Set<string>();
  let maxDate = "";

  for (const raw of allRecords) {
    if (!raw.ararrestdate) continue;
    const date = raw.ararrestdate.substring(0, 10);
    const charge = raw.araction?.trim() || "Unknown";
    const race = cleanRace(raw.race);
    const sex = cleanSex(raw.sex);
    if (sex === "TEST") continue;
    const district = normalizeDistrict(raw.arldistrict);

    // PBI: "Age No Blank" = IF(AgeAtArrestTime = BLANK(), Age, AgeAtArrestTime)
    const ageAtArrest = raw.ageatarresttime?.trim() ?? "";
    const ageRaw = raw.age?.trim() ?? "";
    const ageStr = ageAtArrest || ageRaw;
    const ageNum = parseInt(ageStr);
    const ag = isNaN(ageNum) ? "" : ageGroupBroad(ageNum);
    const ya = isNaN(ageNum) ? "" : youngAdultBin(ageNum);

    chargeSet.add(charge);
    raceSet.add(race);
    sexSet.add(sex);
    if (ag) ageGroupSet.add(ag);
    if (ya) youngAdultSet.add(ya);
    if (district) districtSet.add(district);
    if (date > maxDate) maxDate = date;

    const key = `${date}|${charge}|${race}|${sex}|${ag}|${ya}|${district}`;
    aggMap.set(key, (aggMap.get(key) ?? 0) + 1);
  }

  for (const [key, count] of aggMap) {
    const [d, ch, ra, sx, ag, ya, di] = key.split("|");
    records.push({ d, ch, ra, sx, ag, ya, di, c: count });
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

  console.log(`[arrests-etl] Aggregated to ${records.length.toLocaleString()} rows, total=${total.toLocaleString()}`);
  console.log(`[arrests-etl] Age groups: ${Array.from(ageGroupSet).join(", ")}`);
  console.log(`[arrests-etl] Young adult groups: ${Array.from(youngAdultSet).join(", ")}`);

  // Canonical sort order per PBI
  const ageGroupOrder = ["18-24", "25-40", "41-55", "56-70", "Over 70"];
  const youngAdultOrder = ["Young Adult (18-24)", "Adult (25+)"];

  return {
    lastUpdated: new Date().toISOString(),
    dataThrough: maxDate,
    records,
    charges: Array.from(chargeSet).sort(),
    races: Array.from(raceSet).sort(),
    sexes: Array.from(sexSet).filter((s) => s !== "TEST").sort(),
    ageGroups: ageGroupOrder.filter((a) => ageGroupSet.has(a)),
    youngAdultGroups: youngAdultOrder.filter((a) => youngAdultSet.has(a)),
    districts: Array.from(districtSet).sort(),
    summary: {
      total,
      ytdCurrent,
      ytdPrior,
      pctChange: ytdPrior === 0 ? 0 : (ytdCurrent - ytdPrior) / ytdPrior,
    },
  };
}
