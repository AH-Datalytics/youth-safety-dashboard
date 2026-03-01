import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import zlib from "zlib";

export async function GET() {
  try {
    const gzPath = path.join(process.cwd(), "data", "generated", "overview-summary-data.json.gz");
    const jsonPath = path.join(process.cwd(), "data", "generated", "overview-summary-data.json");

    if (fs.existsSync(gzPath)) {
      const raw = zlib.gunzipSync(fs.readFileSync(gzPath));
      return new Response(raw, {
        headers: {
          "Content-Type": "application/json",
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
      { error: "Overview summary not yet generated. Run: npm run refresh-data" },
      { status: 503 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to serve overview summary:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
