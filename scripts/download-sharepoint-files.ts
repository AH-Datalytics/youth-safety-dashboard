/**
 * Download all source files from OneDrive for ETL processing.
 * Replaces Git LFS — files are downloaded fresh each CI run.
 *
 * Usage: npx tsx scripts/download-sharepoint-files.ts
 * Requires env vars: SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID,
 *   SHAREPOINT_CLIENT_SECRET, SHAREPOINT_DRIVE_ID
 */

import fs from "fs";
import path from "path";
import { downloadSharePointFile } from "./sharepoint-auth";

const DRIVE_ID = process.env.SHAREPOINT_DRIVE_ID || "";

// Base path on OneDrive: Clients/NLC/Dallas/PowerBI/
const BASE = "/Clients/NLC/Dallas/PowerBI";

// Files to download: [OneDrive path (relative to drive root), local destination]
const FILES: Array<[string, string]> = [
  // Source files
  [`${BASE}/Calls for Service.xlsx`, "data/source/Calls for Service.xlsx"],
  [`${BASE}/CAMPUS_summary_18.csv`, "data/source/CAMPUS_summary_18.csv"],
  [`${BASE}/CAMPUS_summary_19.csv`, "data/source/CAMPUS_summary_19.csv"],
  [`${BASE}/CAMPUS_summary_20.csv`, "data/source/CAMPUS_summary_20.csv"],
  [`${BASE}/CAMPUS_summary_21.csv`, "data/source/CAMPUS_summary_21.csv"],
  [`${BASE}/CAMPUS_summary_22.csv`, "data/source/CAMPUS_summary_22.csv"],
  [`${BASE}/CAMPUS_summary_23.csv`, "data/source/CAMPUS_summary_23.csv"],
  [`${BASE}/CAMPUS_summary_24.csv`, "data/source/CAMPUS_summary_24.csv"],
  [`${BASE}/Redacted Youth Justice Data.xlsx`, "data/source/Redacted Youth Justice Data.xlsx"],
  [`${BASE}/Directory2024.csv`, "data/source/Directory2024.csv"],
  ["/Clients/NLC/Dallas/2025 Data Update/TJJD/Family Code 58.009 data request  #41104.xlsx", "data/source/Family Code 58.009 data request #41104.xlsx"],
  // Crosswalk files
  [`${BASE}/XWalk - NIBRS.xlsx`, "data/crosswalks/XWalk - NIBRS.xlsx"],
  [`${BASE}/XWalk - Discipline.xlsx`, "data/crosswalks/XWalk - Discipline.xlsx"],
  [`${BASE}/XWALK - Call Type.xlsx`, "data/crosswalks/XWALK - Call Type.xlsx"],
];

const CONCURRENCY = 3;

async function downloadFile(onedrivePath: string, localPath: string): Promise<void> {
  const fullPath = path.join(process.cwd(), localPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const start = Date.now();
  const buffer = await downloadSharePointFile(DRIVE_ID, onedrivePath);
  fs.writeFileSync(fullPath, buffer);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);
  console.log(`  OK: ${localPath} (${sizeMB} MB, ${elapsed}s)`);
}

async function main() {
  console.log("=== Download Source Files from OneDrive ===");

  if (!DRIVE_ID) {
    throw new Error("Missing SHAREPOINT_DRIVE_ID environment variable.");
  }

  const totalStart = Date.now();
  let failed = 0;

  // Process in batches of CONCURRENCY
  for (let i = 0; i < FILES.length; i += CONCURRENCY) {
    const batch = FILES.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(([sp, local]) => downloadFile(sp, local))
    );
    for (const r of results) {
      if (r.status === "rejected") {
        console.error(`  FAILED: ${r.reason}`);
        failed++;
      }
    }
  }

  const totalElapsed = ((Date.now() - totalStart) / 1000).toFixed(1);
  console.log(`\nDownloaded ${FILES.length - failed}/${FILES.length} files in ${totalElapsed}s`);

  if (failed > 0) {
    console.error(`${failed} file(s) failed to download.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
