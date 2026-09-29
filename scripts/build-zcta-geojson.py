"""
Build a simplified ZCTA (ZIP Code Tabulation Area) GeoJSON for one county.

Output feeds the youth-court ZIP choropleth: public/{slug}-zcta.geojson, one
feature per ZCTA with a single `zip` property.

Source: Census TIGERweb (2020 Census ZCTAs and counties). A ZCTA is kept when
at least MIN_SHARE of its area falls inside the county, so a ZIP that only
clips the county line doesn't get drawn.

Usage:
    python scripts/build-zcta-geojson.py 48439 tarrant
"""

import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from shapely.geometry import mapping, shape

TIGER = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb"
COUNTY_LAYER = f"{TIGER}/State_County/MapServer/1"
ZCTA_LAYER = f"{TIGER}/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1"

MIN_SHARE = 0.10
# Roughly 50 m at this latitude — matches the Dallas file's level of detail.
SIMPLIFY_DEG = 0.0005


def query(layer: str, params: dict) -> dict:
    qs = urllib.parse.urlencode({"f": "geojson", "outSR": 4326, **params})
    with urllib.request.urlopen(f"{layer}/query?{qs}", timeout=120) as res:
        return json.load(res)


def main(geoid: str, slug: str) -> None:
    county = query(COUNTY_LAYER, {"where": f"GEOID='{geoid}'", "outFields": "NAME"})
    if not county["features"]:
        sys.exit(f"No county with GEOID {geoid}")
    county_geom = shape(county["features"][0]["geometry"])
    minx, miny, maxx, maxy = county_geom.bounds
    print(f"County: {county['features'][0]['properties']['NAME']}")

    zctas = query(
        ZCTA_LAYER,
        {
            "geometry": f"{minx},{miny},{maxx},{maxy}",
            "geometryType": "esriGeometryEnvelope",
            "inSR": 4326,
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": "ZCTA5",
            "returnGeometry": "true",
        },
    )

    features = []
    for f in zctas["features"]:
        geom = shape(f["geometry"])
        share = geom.intersection(county_geom).area / geom.area
        if share < MIN_SHARE:
            continue
        simplified = geom.simplify(SIMPLIFY_DEG, preserve_topology=True)
        features.append(
            {
                "type": "Feature",
                "properties": {"zip": f["properties"]["ZCTA5"]},
                "geometry": mapping(simplified),
            }
        )
    features.sort(key=lambda f: f["properties"]["zip"])

    out = Path(__file__).resolve().parent.parent / "public" / f"{slug}-zcta.geojson"
    # Five decimal places is ~1 m, far finer than the simplification tolerance.
    text = json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":"))
    text = _round_coords(text)
    out.write_text(text, encoding="utf-8")
    print(f"Wrote {len(features)} ZCTAs to {out} ({out.stat().st_size / 1024:.0f} KB)")


def _round_coords(text: str) -> str:
    data = json.loads(text)

    def rnd(c):
        return [rnd(x) for x in c] if isinstance(c[0], list) else [round(c[0], 5), round(c[1], 5)]

    for f in data["features"]:
        f["geometry"]["coordinates"] = rnd(f["geometry"]["coordinates"])
    return json.dumps(data, separators=(",", ":"))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
