/**
 * One-time script: Batch geocode Dallas County schools via Census Geocoder API.
 * Reads Directory2024.csv, filters to Dallas County, geocodes addresses,
 * writes data/crosswalks/school-geocodes.json keyed by campus number.
 *
 * Usage: npx tsx scripts/geocode-schools.ts
 */
import fs from "fs";
import path from "path";
import Papa from "papaparse";

const DIRECTORY_PATH = path.join(process.cwd(), "data", "source", "Directory2024.csv");
const OUTPUT_PATH = path.join(process.cwd(), "data", "crosswalks", "school-geocodes.json");
const CENSUS_URL = "https://geocoding.geo.census.gov/geocoder/locations/addressbatch";
const BATCH_SIZE = 100; // Census API recommends ≤1000 per batch

interface SchoolAddress {
  campusNumber: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

function loadDallasSchools(): SchoolAddress[] {
  if (!fs.existsSync(DIRECTORY_PATH)) {
    throw new Error(`Directory2024.csv not found at ${DIRECTORY_PATH}`);
  }

  const text = fs.readFileSync(DIRECTORY_PATH, "utf-8");
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const schools: SchoolAddress[] = [];

  for (const row of parsed.data as Record<string, string>[]) {
    const county = (row["County Name"] ?? "").trim().toUpperCase();
    if (county !== "DALLAS COUNTY") continue;

    const campusNumber = (row["School Number"] ?? "").replace(/'/g, "").trim();
    const street = (row["School Street Address"] ?? "").trim();
    const city = (row["School City"] ?? "").trim();
    const state = (row["School State"] ?? "").trim();
    const zip = (row["School Zip"] ?? "").trim();

    if (!campusNumber || !street) continue;
    schools.push({ campusNumber, street, city, state, zip });
  }

  return schools;
}

function buildBatchCSV(batch: SchoolAddress[]): string {
  // Census Geocoder expects: UniqueID, Street, City, State, ZIP
  return batch
    .map((s) => `${s.campusNumber},${s.street},${s.city},${s.state},${s.zip}`)
    .join("\n");
}

async function geocodeBatch(
  batch: SchoolAddress[],
): Promise<Map<string, { lat: number; lon: number }>> {
  const csv = buildBatchCSV(batch);
  const blob = new Blob([csv], { type: "text/csv" });

  const form = new FormData();
  form.append("addressFile", blob, "addresses.csv");
  form.append("benchmark", "Public_AR_Current");

  const res = await fetch(CENSUS_URL, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Census API error: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  const results = new Map<string, { lat: number; lon: number }>();

  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    // Response CSV format: "ID","InputAddress","Match","MatchType","MatchedAddress","Coordinates","TIGER ID","Side"
    // Coordinates are "lon,lat"
    const parts = line.split('","');
    if (parts.length < 6) continue;

    const id = parts[0].replace(/"/g, "").trim();
    const matchStatus = parts[2]?.replace(/"/g, "").trim();

    if (matchStatus !== "Match") continue;

    const coords = parts[5]?.replace(/"/g, "").trim();
    if (!coords) continue;

    const [lonStr, latStr] = coords.split(",");
    const lon = parseFloat(lonStr);
    const lat = parseFloat(latStr);

    if (!isNaN(lat) && !isNaN(lon)) {
      results.set(id, { lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6 });
    }
  }

  return results;
}

async function main() {
  console.log("[geocode] Loading Dallas County schools...");
  const schools = loadDallasSchools();
  console.log(`[geocode] Found ${schools.length} schools to geocode`);

  const allResults: Record<string, { lat: number; lon: number }> = {};
  let matched = 0;

  // Process in batches
  for (let i = 0; i < schools.length; i += BATCH_SIZE) {
    const batch = schools.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(schools.length / BATCH_SIZE);
    console.log(`[geocode] Batch ${batchNum}/${totalBatches} (${batch.length} addresses)...`);

    const results = await geocodeBatch(batch);
    for (const [id, coords] of results) {
      allResults[id] = coords;
      matched++;
    }

    // Small delay between batches to be nice to the API
    if (i + BATCH_SIZE < schools.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  const matchRate = ((matched / schools.length) * 100).toFixed(1);
  console.log(`[geocode] Matched ${matched}/${schools.length} (${matchRate}%)`);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allResults, null, 2));
  console.log(`[geocode] Wrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("[geocode] Fatal error:", err);
  process.exit(1);
});
