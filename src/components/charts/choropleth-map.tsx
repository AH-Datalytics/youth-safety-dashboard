"use client";

import { useMemo, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { FeatureCollection } from "geojson";
import type { TJJDZipRecord } from "@/lib/types";

/** Dallas center coordinates */
const DALLAS_CENTER: [number, number] = [32.78, -96.8];
const DEFAULT_ZOOM = 10;

const MapInner = dynamic(() => import("./choropleth-map-inner"), { ssr: false });

interface ChoroplethMapProps {
  zipRecords: TJJDZipRecord[];
  title?: string;
  height?: number;
}

export function ChoroplethMap({
  zipRecords,
  title,
  height = 450,
}: ChoroplethMapProps) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/dallas-zcta.geojson")
      .then((res) => res.json())
      .then((data) => setGeojson(data))
      .catch(() => {});
  }, []);

  const zipCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const z of zipRecords) {
      const key = String(z.zip);
      map.set(key, (map.get(key) ?? 0) + z.v);
    }
    return map;
  }, [zipRecords]);

  const totalReferrals = useMemo(
    () => zipRecords.reduce((s, r) => s + r.v, 0),
    [zipRecords],
  );

  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      {title && (
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <h3 className="font-serif font-bold text-sm">{title}</h3>
          <span className="text-xs text-muted-foreground font-mono">
            {totalReferrals.toLocaleString()} total across {zipCounts.size} ZIP codes
          </span>
        </div>
      )}
      <div style={{ height }}>
        {geojson ? (
          <MapInner
            geojson={geojson}
            zipCounts={zipCounts}
            center={DALLAS_CENTER}
            zoom={DEFAULT_ZOOM}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Loading map…
          </div>
        )}
      </div>
      {/* Legend */}
      <div className="px-4 py-2 flex items-center gap-2 border-t border-border">
        <span className="text-xs text-muted-foreground">Fewer</span>
        {["#ede9fe", "#c4b5fd", "#8b5cf6", "#6d28d9", "#4c1d95", "#2C1A6B"].map((c) => (
          <span
            key={c}
            className="w-6 h-3 rounded-sm"
            style={{ backgroundColor: c }}
          />
        ))}
        <span className="text-xs text-muted-foreground">More</span>
      </div>
    </div>
  );
}
