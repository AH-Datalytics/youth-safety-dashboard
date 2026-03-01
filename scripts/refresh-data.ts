/**
 * Data Refresh Orchestrator
 * Runs all 6 ETL pipelines and writes JSON + JSON.gz output
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { runIncidentsETL } from "./etl-incidents";
import { runArrestsETL } from "./etl-arrests";
import { run311ETL } from "./etl-311";
import { runCFSETL } from "./etl-cfs";
import { runCampusETL } from "./etl-campus";
import { runTJJDETL } from "./etl-tjjd";

const OUTPUT_DIR = path.join(process.cwd(), "data", "generated");

interface ETLResult {
  name: string;
  status: "OK" | "FAILED";
  rows?: number;
  error?: string;
}

function writeOutput(name: string, payload: unknown): void {
  const json = JSON.stringify(payload);
  const jsonPath = path.join(OUTPUT_DIR, `${name}-data.json`);
  const gzPath = path.join(OUTPUT_DIR, `${name}-data.json.gz`);

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

async function main() {
  console.log("=== Dallas Youth Safety Dashboard — Data Refresh ===");
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log("");

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Run Socrata ETLs in parallel (public APIs)
  console.log("--- Socrata APIs (Incidents, Arrests, 311) ---");
  const socrataResults = await Promise.all([
    runETL("incidents", runIncidentsETL),
    runETL("arrests", runArrestsETL),
    runETL("311", run311ETL),
  ]);

  console.log("");

  // Run local file ETLs in parallel (CFS, Campus, TJJD)
  console.log("--- Local Files (CFS, Campus, TJJD) ---");
  const localResults = await Promise.all([
    runETL("cfs", runCFSETL),
    runETL("campus", runCampusETL),
    runETL("tjjd", runTJJDETL),
  ]);

  console.log("");

  // Summary
  const allResults = [...socrataResults, ...localResults];
  const failed = allResults.filter((r) => r.status === "FAILED");

  console.log("=== Summary ===");
  for (const r of allResults) {
    const icon = r.status === "OK" ? "OK" : "FAILED";
    const detail = r.status === "OK" ? `${r.rows?.toLocaleString()} rows` : r.error;
    console.log(`  ${icon}: ${r.name} — ${detail}`);
  }

  if (failed.length > 0) {
    console.error(`\n${failed.length} ETL(s) failed!`);
    process.exit(1);
  }

  console.log("\nAll ETLs completed successfully.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
