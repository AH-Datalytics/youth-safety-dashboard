"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";

/** Point data for the dot map */
export interface DotMapPoint {
  lat: number;
  lon: number;
  /** Category for color coding */
  category?: string;
  /** Count at this location */
  count: number;
  /** Optional tooltip label */
  label?: string;
}

interface DotMapProps {
  points: DotMapPoint[];
  /** Map of category name → hex color */
  colorMap?: Record<string, string>;
  /** Default color when category not in colorMap */
  defaultColor?: string;
  title?: string;
  height?: number;
  /** Map center [lat, lon] */
  center?: [number, number];
  zoom?: number;
}

/** Dallas center coordinates */
const DALLAS_CENTER: [number, number] = [32.78, -96.8];
const DEFAULT_ZOOM = 11;
const DEFAULT_COLOR = "#7C3AED";

// Lazy-load the actual map to avoid SSR issues with Leaflet
const MapInner = dynamic(() => import("./dot-map-inner"), { ssr: false });

export function DotMap({
  points,
  colorMap = {},
  defaultColor = DEFAULT_COLOR,
  title,
  height = 450,
  center = DALLAS_CENTER,
  zoom = DEFAULT_ZOOM,
}: DotMapProps) {
  const totalPoints = useMemo(() => points.reduce((s, p) => s + p.count, 0), [points]);

  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      {title && (
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <h3 className="font-serif font-bold text-sm">{title}</h3>
          <span className="text-xs text-muted-foreground font-mono">
            {totalPoints.toLocaleString()} total
          </span>
        </div>
      )}
      <div style={{ height }}>
        <MapInner
          points={points}
          colorMap={colorMap}
          defaultColor={defaultColor}
          center={center}
          zoom={zoom}
        />
      </div>
      {Object.keys(colorMap).length > 0 && (
        <div className="px-4 py-2 flex flex-wrap gap-3 border-t border-border">
          {Object.entries(colorMap).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1.5 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span>{cat}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
