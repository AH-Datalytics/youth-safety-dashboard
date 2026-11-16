import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { JURISDICTIONS } from "@/lib/jurisdictions";

// Every jurisdiction's refresh writes all of these, including an empty payload for a
// domain it has no source for, so each one is required in every jurisdiction folder.
const REQUIRED_FILES = [
  "incidents-data.json.gz",
  "arrests-data.json.gz",
  "cfs-data.json.gz",
  "311-data.json.gz",
  "campus-data.json.gz",
  "tjjd-data.json.gz",
  "overview-summary-data.json.gz",
];

export async function GET() {
  const root = path.join(process.cwd(), "data", "generated");
  const missing: string[] = [];

  // Payloads live in data/generated/<jurisdiction>/, not at the top of data/generated/.
  for (const { id } of JURISDICTIONS) {
    for (const file of REQUIRED_FILES) {
      const gz = path.join(root, id, file);
      const json = path.join(root, id, file.replace(".json.gz", ".json"));
      if (!fs.existsSync(gz) && !fs.existsSync(json)) {
        missing.push(`${id}/${file}`);
      }
    }
  }

  if (missing.length > 0) {
    return NextResponse.json(
      { status: "unhealthy", missing },
      { status: 503 },
    );
  }

  return NextResponse.json({ status: "ok" });
}
