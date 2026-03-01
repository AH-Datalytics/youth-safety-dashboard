import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const REQUIRED_FILES = [
  "incidents-data.json.gz",
  "arrests-data.json.gz",
  "cfs-data.json.gz",
  "311-data.json.gz",
  "campus-data.json.gz",
  "tjjd-data.json.gz",
];

export async function GET() {
  const dir = path.join(process.cwd(), "data", "generated");
  const missing: string[] = [];

  for (const file of REQUIRED_FILES) {
    const gz = path.join(dir, file);
    const json = path.join(dir, file.replace(".json.gz", ".json"));
    if (!fs.existsSync(gz) && !fs.existsSync(json)) {
      missing.push(file);
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
