/**
 * Pre-compute overview summary from ETL output files.
 * Produces JSON for instant homepage rendering:
 *   - 4 banner KPIs (Offenses, Arrests, CFS, 311 — all YTD)
 *   - 4 domain card summaries with monthly sparkline data
 *
 * Output: data/generated/overview-summary.json(.gz)
 */

import fs from "fs";
import path from "path";
import zlib from "zlib";

// ---- Types ----

interface CardSummary {
  ytdCount: number;
  ytdPctChange: number | null;
  monthlyData: Array<{ month: string; count: number }>;
}

interface BannerKPI {
  count: number;
  pctChange: number | null;
}

interface OverviewSummary {
  banner: {
    offenses: BannerKPI;
    arrests: BannerKPI;
    clearedUnder17: BannerKPI;
    clearedOver18: BannerKPI;
    requests311: BannerKPI;
  };
  offenseArrest: CardSummary | null;
  requests311: CardSummary | null;
  youthCourt: CardSummary | null;
  schoolDiscipline: CardSummary | null;
}

// ---- Helpers ----

let dataDir = path.join(process.cwd(), "data", "generated");

function loadJSON(filename: string): unknown | null {
  try {
    const gzPath = path.join(dataDir, filename + ".gz");
    if (fs.existsSync(gzPath)) {
      return JSON.parse(zlib.gunzipSync(fs.readFileSync(gzPath)).toString("utf-8"));
    }
    const jsonPath = path.join(dataDir, filename);
    if (fs.existsSync(jsonPath)) {
      return JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    }
    return null;
  } catch {
    return null;
  }
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

function computeYTD(records: Array<{ d: string; c: number }>) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const asOfMMDD = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  let current = 0;
  let last = 0;
  for (const r of records) {
    const year = parseInt(r.d.slice(0, 4));
    const mmdd = r.d.slice(5);
    if (year === currentYear && mmdd <= asOfMMDD) current += r.c;
    if (year === currentYear - 1 && mmdd <= asOfMMDD) last += r.c;
  }

  return { ytdCount: current, ytdPctChange: percentChange(current, last) };
}

function toMonthly(records: Array<{ d: string; c: number }>): Array<{ month: string; count: number }> {
  const map = new Map<string, number>();
  for (const r of records) {
    const month = r.d.slice(0, 7);
    map.set(month, (map.get(month) || 0) + r.c);
  }
  const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  return sorted.slice(-24).map(([month, count]) => ({ month, count }));
}

/** For school-year-based domains (Campus, TJJD): latest SY vs prior SY */
function computeSYComparison(records: Array<{ sy: string; c: number }>) {
  const bySY = new Map<string, number>();
  for (const r of records) {
    bySY.set(r.sy, (bySY.get(r.sy) || 0) + r.c);
  }
  const sortedYears = Array.from(bySY.keys()).sort();
  if (sortedYears.length === 0) return null;

  const latestSY = sortedYears[sortedYears.length - 1];
  const priorSY = sortedYears.length >= 2 ? sortedYears[sortedYears.length - 2] : null;
  const latestCount = bySY.get(latestSY) || 0;
  const priorCount = priorSY ? (bySY.get(priorSY) || 0) : 0;

  const monthlyData = sortedYears.slice(-8).map((sy) => ({
    month: sy,
    count: bySY.get(sy) || 0,
  }));

  return {
    ytdCount: latestCount,
    ytdPctChange: priorCount > 0 ? percentChange(latestCount, priorCount) : null,
    monthlyData,
  } satisfies CardSummary;
}

// ---- Data type casts ----

type IncidentsData = {
  records?: Array<{ d: string; c: number; cs?: string }>;
  summary?: { ytdCurrent: number; ytdPrior: number; pctChange: number };
};

type ArrestsData = {
  records?: Array<{ d: string; c: number }>;
  summary?: { ytdCurrent: number; ytdPrior: number; pctChange: number };
};

type CFSData = {
  records?: Array<{ d: string; c: number }>;
  summary?: { ytdCurrent: number; ytdPrior: number; pctChange: number };
};

type Request311Data = {
  records?: Array<{ d: string; c: number }>;
  summary?: { ytdCurrent: number; ytdPrior: number; pctChange: number };
};

type TJJDData = {
  records?: Array<{ cat: string; desc: string; yr: string; mo: number; v: number }>;
  summary?: { totalReferrals: number };
};

type CampusData = {
  records?: Array<{ sy: string; v: number }>;
  summary?: { totalRecords: number };
};

// ---- Main ----

export function computeOverviewSummary(dir?: string): OverviewSummary {
  if (dir) dataDir = dir;
  console.log("  Loading data files...");

  const incidentsData = loadJSON("incidents-data.json") as IncidentsData | null;
  const arrestsData = loadJSON("arrests-data.json") as ArrestsData | null;
  const cfsData = loadJSON("cfs-data.json") as CFSData | null;
  const sr311Data = loadJSON("311-data.json") as Request311Data | null;
  const tjjdData = loadJSON("tjjd-data.json") as TJJDData | null;
  const campusData = loadJSON("campus-data.json") as CampusData | null;

  // ===== BANNER KPIs =====
  console.log("  Computing banner KPIs...");

  // Offenses YTD
  let offensesBanner: BannerKPI = { count: 0, pctChange: null };
  if (incidentsData?.summary) {
    offensesBanner = {
      count: incidentsData.summary.ytdCurrent,
      pctChange: incidentsData.summary.pctChange,
    };
  } else if (incidentsData?.records) {
    const { ytdCount, ytdPctChange } = computeYTD(incidentsData.records);
    offensesBanner = { count: ytdCount, pctChange: ytdPctChange };
  }

  // Arrests YTD
  let arrestsBanner: BannerKPI = { count: 0, pctChange: null };
  if (arrestsData?.summary) {
    arrestsBanner = {
      count: arrestsData.summary.ytdCurrent,
      pctChange: arrestsData.summary.pctChange,
    };
  } else if (arrestsData?.records) {
    const { ytdCount, ytdPctChange } = computeYTD(arrestsData.records);
    arrestsBanner = { count: ytdCount, pctChange: ytdPctChange };
  }

  // Cleared by arrest (under 17 / over 18) — from incident case statuses
  let clearedUnder17Banner: BannerKPI = { count: 0, pctChange: null };
  let clearedOver18Banner: BannerKPI = { count: 0, pctChange: null };
  if (incidentsData?.records) {
    const u17 = incidentsData.records.filter((r) => r.cs === "Cleared (Arrestee Age 17 or Under)");
    const o18 = incidentsData.records.filter((r) => r.cs === "Cleared (Arrestee 18 or Older)");
    const u17ytd = computeYTD(u17);
    const o18ytd = computeYTD(o18);
    clearedUnder17Banner = { count: u17ytd.ytdCount, pctChange: u17ytd.ytdPctChange };
    clearedOver18Banner = { count: o18ytd.ytdCount, pctChange: o18ytd.ytdPctChange };
  }

  // CFS YTD
  let cfsBanner: BannerKPI = { count: 0, pctChange: null };
  if (cfsData?.summary) {
    cfsBanner = {
      count: cfsData.summary.ytdCurrent,
      pctChange: cfsData.summary.pctChange,
    };
  } else if (cfsData?.records) {
    const { ytdCount, ytdPctChange } = computeYTD(cfsData.records);
    cfsBanner = { count: ytdCount, pctChange: ytdPctChange };
  }

  // 311 YTD
  let sr311Banner: BannerKPI = { count: 0, pctChange: null };
  if (sr311Data?.summary) {
    sr311Banner = {
      count: sr311Data.summary.ytdCurrent,
      pctChange: sr311Data.summary.pctChange,
    };
  } else if (sr311Data?.records) {
    const { ytdCount, ytdPctChange } = computeYTD(sr311Data.records);
    sr311Banner = { count: ytdCount, pctChange: ytdPctChange };
  }

  // ===== CARD SUMMARIES =====
  console.log("  Computing card summaries...");

  // Offense & Arrest (use incidents data for the card)
  let offenseArrestCard: CardSummary | null = null;
  if (incidentsData?.records) {
    const { ytdCount, ytdPctChange } = computeYTD(incidentsData.records);
    offenseArrestCard = {
      ytdCount,
      ytdPctChange,
      monthlyData: toMonthly(incidentsData.records),
    };
  }

  // 311 Requests card
  let requests311Card: CardSummary | null = null;
  if (sr311Data?.records) {
    const { ytdCount, ytdPctChange } = computeYTD(sr311Data.records);
    requests311Card = {
      ytdCount,
      ytdPctChange,
      monthlyData: toMonthly(sr311Data.records),
    };
  }

  // Youth Court (TJJD — now year-based, not school-year-based)
  let youthCourtCard: CardSummary | null = null;
  if (tjjdData?.records && tjjdData.records.length > 0) {
    // Aggregate by year
    const byYear = new Map<string, number>();
    for (const r of tjjdData.records) {
      byYear.set(r.yr, (byYear.get(r.yr) || 0) + r.v);
    }
    const sortedYears = Array.from(byYear.keys()).sort();
    const latest = sortedYears[sortedYears.length - 1];
    const prior = sortedYears.length >= 2 ? sortedYears[sortedYears.length - 2] : null;
    const latestCount = byYear.get(latest) || 0;
    const priorCount = prior ? (byYear.get(prior) || 0) : 0;

    youthCourtCard = {
      ytdCount: latestCount,
      ytdPctChange: priorCount > 0 ? percentChange(latestCount, priorCount) : null,
      monthlyData: sortedYears.map(yr => ({ month: yr, count: byYear.get(yr) || 0 })),
    };
  }

  // School Discipline (Campus — school year based, value field is now `v`)
  let schoolDisciplineCard: CardSummary | null = null;
  if (campusData?.records && campusData.records.length > 0) {
    // Map to computeSYComparison format
    const mapped = campusData.records.map(r => ({ sy: r.sy, c: r.v }));
    schoolDisciplineCard = computeSYComparison(mapped);
  }

  return {
    banner: {
      offenses: offensesBanner,
      arrests: arrestsBanner,
      clearedUnder17: clearedUnder17Banner,
      clearedOver18: clearedOver18Banner,
      requests311: sr311Banner,
    },
    offenseArrest: offenseArrestCard,
    requests311: requests311Card,
    youthCourt: youthCourtCard,
    schoolDiscipline: schoolDisciplineCard,
  };
}
