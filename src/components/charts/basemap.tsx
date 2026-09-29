"use client";

import { TileLayer } from "react-leaflet";

/**
 * Esri World Light Gray Canvas — base plus its place-name layer. Needs no API
 * key. (CARTO's basemaps now serve "API KEY REQUIRED" tiles to keyless
 * requests.) Both layers sit in the tile pane, under the data overlays, the
 * same stacking the CARTO tiles had.
 */
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";

const ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors";

export function Basemap() {
  return (
    <>
      <TileLayer
        attribution={ATTRIBUTION}
        url={`${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`}
        maxNativeZoom={16}
      />
      <TileLayer
        url={`${ESRI}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`}
        maxNativeZoom={16}
      />
    </>
  );
}
