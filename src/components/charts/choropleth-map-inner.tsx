"use client";

import { useMemo, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, FeatureCollection } from "geojson";
import type { Layer, PathOptions } from "leaflet";

interface ChoroplethMapInnerProps {
  geojson: FeatureCollection;
  /** Map of ZIP string → count */
  zipCounts: Map<string, number>;
  center: [number, number];
  zoom: number;
}

/** Sequential purple gradient: light → dark */
const COLOR_SCALE = [
  "#ede9fe", // purple-100
  "#c4b5fd", // purple-300
  "#8b5cf6", // purple-500
  "#6d28d9", // purple-700
  "#4c1d95", // purple-900
  "#2C1A6B", // LSJA primary
];

function getColor(value: number, max: number): string {
  if (value === 0 || max === 0) return "#f5f3ff";
  const ratio = value / max;
  const idx = Math.min(Math.floor(ratio * COLOR_SCALE.length), COLOR_SCALE.length - 1);
  return COLOR_SCALE[idx];
}

export default function ChoroplethMapInner({
  geojson,
  zipCounts,
  center,
  zoom,
}: ChoroplethMapInnerProps) {
  const maxCount = useMemo(() => {
    let max = 0;
    for (const v of zipCounts.values()) {
      if (v > max) max = v;
    }
    return max;
  }, [zipCounts]);

  const style = useCallback(
    (feature?: Feature): PathOptions => {
      const zip = feature?.properties?.zip ?? "";
      const count = zipCounts.get(zip) ?? 0;
      return {
        fillColor: getColor(count, maxCount),
        weight: 1,
        opacity: 0.7,
        color: "#a78bfa",
        fillOpacity: 0.75,
      };
    },
    [zipCounts, maxCount],
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const zip = feature.properties?.zip ?? "";
      const count = zipCounts.get(zip) ?? 0;
      layer.bindTooltip(
        `<div style="font-size:12px"><strong>${zip}</strong><br/>${count.toLocaleString()} referrals</div>`,
        { sticky: true },
      );
    },
    [zipCounts],
  );

  // Use a key that changes when data changes to force GeoJSON re-render
  const geoKey = useMemo(() => {
    const entries: string[] = [];
    zipCounts.forEach((v, k) => entries.push(`${k}:${v}`));
    return entries.join(",");
  }, [zipCounts]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <GeoJSON
        key={geoKey}
        data={geojson}
        style={style}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  );
}
