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
import { runTJJDETL } from "./etl-tjjd";
import { computeOverviewSummary } from "./compute-overview-summary";

interface ETLResult {
  name: string;
  status: "OK" | "FAILED";
  rows?: number;
  error?: string;
}

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

  // Socrata ETLs (if configured)
  if (j.socrata) {
    console.log("  --- Socrata APIs (Incidents, Arrests, 311) ---");
    const socrataResults = await Promise.all([
      runETL("incidents", () =>
        runIncidentsETL({ baseUrl: j.socrata!.baseUrl, datasetId: j.socrata!.incidents }),
      ),
      runETL("arrests", () =>
        runArrestsETL({ baseUrl: j.socrata!.baseUrl, datasetId: j.socrata!.arrests }),
      ),
      runETL("311", () =>
        run311ETL({ baseUrl: j.socrata!.baseUrl, datasetId: j.socrata!.requests311 }),
      ),
    ]);
    allResults.push(...socrataResults);
  }

  // Local file ETLs (CFS, Campus, TJJD — always run, they gracefully handle missing files)
  console.log("  --- Local Files (CFS, Campus, TJJD) ---");
  const localResults = await Promise.all([
    runETL("cfs", runCFSETL),
    runETL("campus", runCampusETL),
    runETL("tjjd", runTJJDETL),
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
  console.log("=== Youth Safety Dashboards — Data Refresh ===");
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`  Jurisdictions: ${JURISDICTIONS.map((j) => j.id).join(", ")}`);
  console.log("");

  let totalFailed = 0;

  for (const j of JURISDICTIONS) {
    console.log(`\n========== ${j.name} (${j.id}) ==========`);
    const results = await refreshJurisdiction(j);

    const failed = results.filter((r) => r.status === "FAILED");
    console.log(`\n  Summary for ${j.id}:`);
    for (const r of results) {
      const icon = r.status === "OK" ? "OK" : "FAILED";
      const detail = r.status === "OK" ? `${r.rows?.toLocaleString()} rows` : r.error;
      console.log(`    ${icon}: ${r.name} — ${detail}`);
    }
    totalFailed += failed.length;
  }

  if (totalFailed > 0) {
    console.error(`\n${totalFailed} ETL(s) failed across all jurisdictions!`);
    process.exit(1);
  }

  console.log("\nAll ETLs completed successfully.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
