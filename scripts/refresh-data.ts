/**
 * Data Refresh Orchestrator
 * Loops over all registered jurisdictions and runs ETL pipelines per jurisdiction.
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { JURISDICTIONS } from "../src/lib/jurisdictions";
import type { JurisdictionConfig } from "../src/lib/jurisdictions";
import { runIncidentsETL } from "./etl-incidents";
import { runArrestsETL } from "./etl-arrests";
import { run311ETL } from "./etl-311";
import { runCFSETL } from "./etl-cfs";
import { runCampusETL } from "./etl-campus";
import { emptyTJJDPayload, loadZctaZips, runTJJDETL } from "./etl-tjjd";
import { computeOverviewSummary } from "./compute-overview-summary";

interface ETLResult {
  name: string;
  status: "OK" | "FAILED";
  rows?: number;
  error?: string;
}

/**
 * ETLs pulling from a third-party open-data API (Dallas Socrata, Fort Worth
 * ArcGIS). Those portals are intermittently flaky; when one of these fails the
 * last-good committed JSON.gz is retained and the dashboard keeps serving it,
 * so we don't fail the whole refresh (which would also block the
 * OneDrive-sourced data from being published). Local-file ETL failures remain
 * fatal.
 */
const SOFT_FAIL_ETLS = new Set(["incidents", "arrests", "311"]);

let currentOutputDir = "";

function writeOutput(name: string, payload: unknown): void {
  const json = JSON.stringify(payload);
  const jsonPath = path.join(currentOutputDir, `${name}-data.json`);
  const gzPath = path.join(currentOutputDir, `${name}-data.json.gz`);

  fs.writeFileSync(jsonPath, json);
  fs.writeFileSync(gzPath, zlib.gzipSync(json));

  const jsonSize = (Buffer.byteLength(json) / 1024).toFixed(0);
  const gzSize = (fs.statSync(gzPath).size / 1024).toFixed(0);
  console.log(`  [${name}] Written: ${jsonSize}KB JSON, ${gzSize}KB gzip`);
}

async function runETL(
  name: string,
  fn: () => Promise<{ records?: unknown[]; summary?: unknown }>,
): Promise<ETLResult> {
  const start = Date.now();
  try {
    const payload = await fn();
    const rows = Array.isArray((payload as { records?: unknown[] }).records)
      ? (payload as { records: unknown[] }).records.length
      : 0;
    writeOutput(name, payload);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  [${name}] OK — ${rows.toLocaleString()} rows in ${elapsed}s`);
    return { name, status: "OK", rows };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`  [${name}] FAILED: ${msg}`);
    return { name, status: "FAILED", error: msg };
  }
}

async function refreshJurisdiction(j: JurisdictionConfig): Promise<ETLResult[]> {
  currentOutputDir = path.join(process.cwd(), "data", "generated", j.id);
  fs.mkdirSync(currentOutputDir, { recursive: true });

  const allResults: ETLResult[] = [];

  // Open-data ETLs. A jurisdiction is on Socrata (Dallas) or on an ArcGIS
  // Feature Service (Fort Worth). Domains with no published dataset emit an
  // empty payload so the routed page renders its "no source" notice instead of
  // a fetch error.
  if (j.socrata || j.arcgis) {
    console.log("  --- Open Data APIs (Incidents, Arrests, 311) ---");
    const openDataResults = await Promise.all([
      runETL("incidents", () =>
        runIncidentsETL(
          j.arcgis
            ? {
                arcgis: {
                  layerUrl: j.arcgis.incidents,
                  fields: j.arcgis.incidentFields,
                },
              }
            : { baseUrl: j.socrata!.baseUrl, datasetId: j.socrata!.incidents },
        ),
      ),
      runETL("arrests", () =>
        runArrestsETL(
          j.socrata
            ? { baseUrl: j.socrata.baseUrl, datasetId: j.socrata.arrests }
            : { available: false },
        ),
      ),
      runETL("311", () =>
        run311ETL(
          j.socrata
            ? { baseUrl: j.socrata.baseUrl, datasetId: j.socrata.requests311 }
            : { available: false },
        ),
      ),
    ]);
    allResults.push(...openDataResults);
  }

  // CFS is a public-records source file, held only for Dallas today.
  // Campus reads the statewide TEA extract, filtered to the jurisdiction's
  // county. TJJD reads the 58.009 request workbook or the statewide county file.
  console.log("  --- CFS, Campus, TJJD ---");
  const localResults = await Promise.all([
    runETL("cfs", () => runCFSETL({ available: j.cfsSource === "local-file" })),
    runETL("campus", () => runCampusETL({ county: j.teaCounty })),
    runETL("tjjd", () =>
      j.youthCourt
        ? runTJJDETL({
            kind: j.youthCourt.kind,
            county: j.youthCourt.county,
            zipAllowList: loadZctaZips(j.geo?.zcta),
          })
        : Promise.resolve(emptyTJJDPayload()),
    ),
  ]);
  allResults.push(...localResults);

  // Overview summary
  console.log("  --- Overview Summary ---");
  try {
    const summary = computeOverviewSummary(currentOutputDir);
    writeOutput("overview-summary", summary);
    console.log("  [overview-summary] OK");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`  [overview-summary] FAILED: ${msg}`);
  }

  return allResults;
}

async function main() {
  // Optional jurisdiction filter, for running one jurisdiction during dev:
  //   npx tsx scripts/refresh-data.ts tarrant
  const only = process.argv.slice(2).map((a) => a.trim().toLowerCase()).filter(Boolean);
  const targets =
    only.length > 0 ? JURISDICTIONS.filter((j) => only.includes(j.id)) : JURISDICTIONS;

  if (targets.length === 0) {
    throw new Error(
      `No jurisdictions matched ${only.join(", ")} — known: ${JURISDICTIONS.map((j) => j.id).join(", ")}`,
    );
  }

  console.log("=== Youth Safety Dashboards — Data Refresh ===");
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`  Jurisdictions: ${targets.map((j) => j.id).join(", ")}`);
  console.log("");

  let criticalFailed = 0;
  let softFailed = 0;

  for (const j of targets) {
    console.log(`\n========== ${j.name} (${j.id}) ==========`);
    const results = await refreshJurisdiction(j);

    console.log(`\n  Summary for ${j.id}:`);
    for (const r of results) {
      const icon = r.status === "OK" ? "OK" : "FAILED";
      const detail = r.status === "OK" ? `${r.rows?.toLocaleString()} rows` : r.error;
      console.log(`    ${icon}: ${r.name} — ${detail}`);
    }

    for (const r of results.filter((r) => r.status === "FAILED")) {
      if (SOFT_FAIL_ETLS.has(r.name)) {
        softFailed++;
        // GitHub Actions warning annotation — visible without failing the run.
        console.log(`::warning::[${j.id}] Open-data ETL "${r.name}" failed (${r.error}); serving last-good data.`);
      } else {
        criticalFailed++;
      }
    }
  }

  if (softFailed > 0) {
    console.warn(
      `\n${softFailed} open-data ETL(s) failed — last-good data retained for those domains, other data published.`,
    );
  }

  if (criticalFailed > 0) {
    console.error(`\n${criticalFailed} critical (local-source) ETL(s) failed!`);
    process.exit(1);
  }

  console.log(
    softFailed > 0
      ? "\nRefresh completed with open-data degradation (see warnings above)."
      : "\nAll ETLs completed successfully.",
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
