/**
 * ETL: Dallas Arrests (Socrata)
 * Source: https://www.dallasopendata.com/resource/sdr7-6v3j
 * Output: data/generated/arrests-data.json(.gz)
 */
import type { ArrestPayload, ArrestRecord } from "../src/lib/types/arrests";

const ENDPOINT = "https://www.dallasopendata.com/resource/sdr7-6v3j.json";
const PAGE_SIZE = 50_000;
const MAX_RECORDS = 500_000;

interface SocrataArrest {
  arrestdate?: string;
  charge_description?: string;
  race?: string;
  sex?: string;
  age?: string;
  councildist?: string;
  [key: string]: unknown;
}

function ageGroupBin(ageStr: string | undefined): string {
  if (!ageStr) return "Unknown";
  const age = parseInt(ageStr);
  if (isNaN(age)) return "Unknown";
  if (age < 17) return "Juvenile";
  if (age <= 24) return "17-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  return "45+";
}

function cleanRace(raw: string | undefined): string {
  if (!raw || raw.trim() === "") return "Unknown";
  return raw.trim();
}

function cleanSex(raw: string | undefined): string {
  if (!raw || raw.trim() === "") return "Unknown";
  const v = raw.trim().toUpperCase();
  if (v === "M" || v === "MALE") return "Male";
  if (v === "F" || v === "FEMALE") return "Female";
  return raw.trim();
}

export async function runArrestsETL(): Promise<ArrestPayload> {
  console.log("[arrests-etl] Fetching from Socrata...");

  const allRecords: SocrataArrest[] = [];
  let offset = 0;

  while (offset < MAX_RECORDS) {
    const url = `${ENDPOINT}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=arrestdate DESC`;
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

  // Aggregate
  const aggMap = new Map<string, number>();
  const records: ArrestRecord[] = [];
  const chargeSet = new Set<string>();
  const raceSet = new Set<string>();
  const sexSet = new Set<string>();
  const ageGroupSet = new Set<string>();
  const districtSet = new Set<string>();
  let maxDate = "";

  for (const raw of allRecords) {
    if (!raw.arrestdate) continue;
    const date = raw.arrestdate.substring(0, 10);
    const charge = raw.charge_description?.trim() || "Unknown";
    const race = cleanRace(raw.race);
    const sex = cleanSex(raw.sex);
    const ageGroup = ageGroupBin(raw.age);
    const district = raw.councildist?.trim() || "";

    chargeSet.add(charge);
    raceSet.add(race);
    sexSet.add(sex);
    ageGroupSet.add(ageGroup);
    if (district) districtSet.add(district);
    if (date > maxDate) maxDate = date;

    const key = `${date}|${charge}|${race}|${sex}|${ageGroup}|${district}`;
    aggMap.set(key, (aggMap.get(key) ?? 0) + 1);
  }

  for (const [key, count] of aggMap) {
    const [d, ch, ra, sx, ag, di] = key.split("|");
    records.push({ d, ch, ra, sx, ag, di, c: count });
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

  return {
    lastUpdated: new Date().toISOString(),
    dataThrough: maxDate,
    records,
    charges: Array.from(chargeSet).sort(),
    races: Array.from(raceSet).sort(),
    sexes: Array.from(sexSet).sort(),
    ageGroups: ["Juvenile", "17-24", "25-34", "35-44", "45+", "Unknown"].filter((a) =>
      ageGroupSet.has(a),
    ),
    districts: Array.from(districtSet).sort(),
    summary: {
      total,
      ytdCurrent,
      ytdPrior,
      pctChange: ytdPrior === 0 ? 0 : (ytdCurrent - ytdPrior) / ytdPrior,
    },
  };
}
