import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const jsonPath = path.join(process.cwd(), "data", "static", "crosswalks.json");

    if (fs.existsSync(jsonPath)) {
      return new Response(fs.readFileSync(jsonPath), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    }

    return NextResponse.json(
      { error: "Crosswalk data not found" },
      { status: 503 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
