/**
 * Load crosswalk Excel files for ETL enrichment.
 * Crosswalks live at data/crosswalks/*.xlsx
 */
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const CROSSWALK_DIR = path.join(process.cwd(), "data", "crosswalks");

// ─── NIBRS Crosswalk ──────────────────────────────────────────────

export interface NIBRSEntry {
  crimeAgainst: string;
  offense: string;
  offenseDescription: string;
  nibrsCode: string;
}

/** NIBRS tree node for frontend tree filter */
export interface NIBRSTreeNode {
  crimeAgainst: string;
  offenseGroup: string;
  nibrsCodes: { code: string; description: string }[];
}

let nibrsCache: NIBRSEntry[] | null = null;

/** Load XWalk - NIBRS.xlsx → flat array of 84 entries */
export function loadNIBRS(): NIBRSEntry[] {
  if (nibrsCache) return nibrsCache;
  const filePath = path.join(CROSSWALK_DIR, "XWalk - NIBRS.xlsx");
  if (!fs.existsSync(filePath)) {
    console.warn("[crosswalks] XWalk - NIBRS.xlsx not found");
    return [];
  }
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, string>[];

  nibrsCache = rows.map((r) => ({
    crimeAgainst: (r["Crime Against"] ?? "").trim(),
    offense: (r["Offense"] ?? "").trim(),
    offenseDescription: (r["Offense Description"] ?? "").trim(),
    nibrsCode: (r["NIBRS Code"] ?? "").trim(),
  }));
  console.log(`[crosswalks] Loaded ${nibrsCache.length} NIBRS entries`);
  return nibrsCache;
}

/** Build NIBRS tree for frontend tree filter component */
export function buildNIBRSTree(): NIBRSTreeNode[] {
  const entries = loadNIBRS();
  const treeMap = new Map<string, Map<string, { code: string; description: string }[]>>();

  for (const e of entries) {
    if (!treeMap.has(e.crimeAgainst)) treeMap.set(e.crimeAgainst, new Map());
    const offMap = treeMap.get(e.crimeAgainst)!;
    if (!offMap.has(e.offense)) offMap.set(e.offense, []);
    offMap.get(e.offense)!.push({ code: e.nibrsCode, description: e.offenseDescription });
  }

  const tree: NIBRSTreeNode[] = [];
  for (const [ca, offMap] of treeMap) {
    for (const [og, codes] of offMap) {
      tree.push({ crimeAgainst: ca, offenseGroup: og, nibrsCodes: codes });
    }
  }
  return tree;
}

/** Build a lookup: NIBRS Code → { crimeAgainst, offense } */
export function buildNIBRSLookup(): Map<string, { crimeAgainst: string; offense: string }> {
  const entries = loadNIBRS();
  const lookup = new Map<string, { crimeAgainst: string; offense: string }>();
  for (const e of entries) {
    lookup.set(e.nibrsCode, { crimeAgainst: e.crimeAgainst, offense: e.offense });
  }
  return lookup;
}

// ─── Call Type Crosswalk (Problem + Disposition) ──────────────────

export interface ProblemEntry {
  problem: string;
  category: string;
  subCategory: string;
  descriptionNoCode: string;
}

export interface DispositionEntry {
  disposition: string;
  dispositionGroup: string;
}

let problemCache: Map<string, ProblemEntry> | null = null;
let dispositionCache: Map<string, DispositionEntry> | null = null;

/** Load Problem sheet from XWALK - Call Type.xlsx → Map keyed by Problem */
export function loadProblemCrosswalk(): Map<string, ProblemEntry> {
  if (problemCache) return problemCache;
  const filePath = path.join(CROSSWALK_DIR, "XWALK - Call Type.xlsx");
  if (!fs.existsSync(filePath)) {
    console.warn("[crosswalks] XWALK - Call Type.xlsx not found");
    return new Map();
  }
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets["Problem"];
  if (!sheet) {
    console.warn("[crosswalks] 'Problem' sheet not found in XWALK - Call Type.xlsx");
    return new Map();
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, string>[];

  problemCache = new Map();
  for (const r of rows) {
    const problem = (r["Problem"] ?? "").trim();
    if (!problem) continue;
    problemCache.set(problem, {
      problem,
      category: (r["Category"] ?? "").trim(),
      subCategory: (r["Sub-Category"] ?? "").trim(),
      descriptionNoCode: (r["Description - No Code"] ?? "").trim(),
    });
  }
  console.log(`[crosswalks] Loaded ${problemCache.size} Problem entries`);
  return problemCache;
}

/** Load Disposition sheet from XWALK - Call Type.xlsx → Map keyed by Disposition */
export function loadDispositionCrosswalk(): Map<string, DispositionEntry> {
  if (dispositionCache) return dispositionCache;
  const filePath = path.join(CROSSWALK_DIR, "XWALK - Call Type.xlsx");
  if (!fs.existsSync(filePath)) {
    console.warn("[crosswalks] XWALK - Call Type.xlsx not found");
    return new Map();
  }
  const wb = XLSX.readFile(filePath);
  // Note: "Dipsosition" typo exists in actual sheet name per PBI docs
  const sheet = wb.Sheets["Disposition"] ?? wb.Sheets["Dipsosition"];
  if (!sheet) {
    console.warn("[crosswalks] 'Disposition' sheet not found in XWALK - Call Type.xlsx");
    return new Map();
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, string>[];

  dispositionCache = new Map();
  for (const r of rows) {
    const disp = (r["Disposition"] ?? "").trim();
    if (!disp) continue;
    dispositionCache.set(disp, {
      disposition: disp,
      // Note: "Dipsosition Groups" typo in source
      dispositionGroup: (r["Dipsosition Groups"] ?? r["Disposition Groups"] ?? "").trim(),
    });
  }
  console.log(`[crosswalks] Loaded ${dispositionCache.size} Disposition entries`);
  return dispositionCache;
}

// ─── Discipline Crosswalk ─────────────────────────────────────────

export interface DisciplineEntry {
  headingName: string;
  type: string;
  description: string;
}

let disciplineCache: Map<string, DisciplineEntry> | null = null;

/** Load XWalk - Discipline.xlsx → Map keyed by HEADING NAME */
export function loadDisciplineCrosswalk(): Map<string, DisciplineEntry> {
  if (disciplineCache) return disciplineCache;
  const filePath = path.join(CROSSWALK_DIR, "XWalk - Discipline.xlsx");
  if (!fs.existsSync(filePath)) {
    console.warn("[crosswalks] XWalk - Discipline.xlsx not found");
    return new Map();
  }
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, string>[];

  disciplineCache = new Map();
  for (const r of rows) {
    const hn = (r["HEADING NAME"] ?? "").trim();
    if (!hn) continue;
    disciplineCache.set(hn, {
      headingName: hn,
      type: (r["Type"] ?? "").trim(),
      description: (r["Description"] ?? "").trim(),
    });
  }
  console.log(`[crosswalks] Loaded ${disciplineCache.size} Discipline entries`);
  return disciplineCache;
}
