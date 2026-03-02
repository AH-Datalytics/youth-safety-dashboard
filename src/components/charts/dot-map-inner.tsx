"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { DotMapPoint } from "./dot-map";

interface DotMapInnerProps {
  points: DotMapPoint[];
  colorMap: Record<string, string>;
  defaultColor: string;
  center: [number, number];
  zoom: number;
}

export default function DotMapInner({
  points,
  colorMap,
  defaultColor,
  center,
  zoom,
}: DotMapInnerProps) {
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
      {points.map((p, i) => {
        const color = p.category ? (colorMap[p.category] ?? defaultColor) : defaultColor;
        const radius = Math.max(3, Math.min(12, Math.sqrt(p.count) * 1.5));
        return (
          <CircleMarker
            key={`${p.lat}-${p.lon}-${i}`}
            center={[p.lat, p.lon]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.6,
              weight: 1,
              opacity: 0.8,
            }}
          >
            <Tooltip>
              <div className="text-xs">
                {p.label && <div className="font-bold">{p.label}</div>}
                {p.category && <div>{p.category}</div>}
                <div>{p.count.toLocaleString()} incidents</div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
