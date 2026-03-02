import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getJurisdiction } from "@/lib/jurisdictions";

const VALID_DOMAINS = [
  "incidents",
  "arrests",
  "311",
  "cfs",
  "campus",
  "tjjd",
  "overview-summary",
  "crosswalks",
];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jurisdiction: string; domain: string }> },
) {
  const { jurisdiction, domain } = await params;

  if (!getJurisdiction(jurisdiction)) {
    return NextResponse.json({ error: "Unknown jurisdiction" }, { status: 404 });
  }

  if (!VALID_DOMAINS.includes(domain)) {
    return NextResponse.json({ error: "Unknown domain" }, { status: 404 });
  }

  try {
    const base = path.join(process.cwd(), "data", "generated", jurisdiction);
    const gzPath = path.join(base, `${domain}-data.json.gz`);
    const jsonPath = path.join(base, `${domain}-data.json`);

    if (fs.existsSync(gzPath)) {
      const buf = fs.readFileSync(gzPath);
      return new Response(buf, {
        headers: {
          "Content-Type": "application/json",
          "Content-Encoding": "gzip",
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }

    if (fs.existsSync(jsonPath)) {
      return new Response(fs.readFileSync(jsonPath), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }

    return NextResponse.json(
      { error: "Data not yet generated. Run: npm run refresh-data" },
      { status: 503 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
