# Youth Safety Dashboard

## Overview

Public safety dashboard for Texas youth, built for Lone Star Justice Alliance.
The app is a Next.js dashboard with automated ETL that publishes public and public-records data as compact JSON payloads.

Registered jurisdictions live in `src/lib/jurisdictions.ts`. Adding one means adding a
`JurisdictionConfig` there — routes, nav, branding, and ETL dispatch all derive from it.

Live: **https://youth-safety-dashboards.vercel.app** (note the plural; the singular
`youth-safety-dashboard.vercel.app` does not exist). Vercel deploys on every push to
`master`, including the nightly bot data commits.

| Jurisdiction | Route | Offense source | Notes |
|---|---|---|---|
| Dallas County | `/dallas` | Dallas Open Data (Socrata) | All 7 domains populated |
| Tarrant County | `/tarrant` (live 2026-09-28) | Fort Worth Open Data (ArcGIS) | No CFS or 311 section; no arrests or clearance. Offense data covers Fort Worth city only |

**Tarrant differences, and where they come from:**
- CFS and 311 are left out of `domains`, so they have no nav tab, home card, download or
  About entry, and their URLs 404.
- The offense section reads "Offense", not "Offense & Arrest" (`offenseSectionLabel`,
  driven by `unavailableMeasures: ["arrests"]`).
- The home KPI banner drops measures listed in `unavailableMeasures` and shows the Youth
  Court and School Discipline headlines instead (`src/components/overview/kpi-banner.tsx`).
  Dallas keeps its five KPIs.
- Offense map dots are colored by NIBRS crime-against (`MAP_DOT_COLORS`), because Fort
  Worth publishes no case status, so every record is "Unknown". Dallas colors by case status.

See `docs/plans/2026-09-08-tarrant-county-data-availability.md` for exactly what is and
isn't available per jurisdiction, and what it would take to close each gap.

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript, App Router
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Maps**: Leaflet and React-Leaflet
- **State**: Zustand
- **Data fetching**: SWR
- **ETL**: TypeScript scripts, Python prep scripts, GitHub Actions

## Data Architecture

1. Source files are downloaded into `data/source/` and `data/crosswalks/` at runtime.
2. Runtime source directories are intentionally not committed — except
   `data/crosswalks/school-geocodes.json`, which IS committed. It is a derived geocode
   cache that is not in the OneDrive download list; without it the campus ETL emits
   schools with lat/lon 0 and the school dot map renders empty.
3. `scripts/refresh-data.ts` loops the registered jurisdictions and dispatches each
   domain's ETL from the jurisdiction config. Pass a jurisdiction id to run just one:
   `npx tsx scripts/refresh-data.ts tarrant`.
4. ETL scripts write compact public payloads to `data/generated/{jurisdiction}/`.
5. The API route at `src/app/api/[jurisdiction]/[domain]/route.ts` serves generated `.json.gz` payloads.
6. Client hooks in `src/hooks/` fetch those payloads and apply local filters.

### Per-jurisdiction source dispatch

| Config field | Effect |
|---|---|
| `socrata` | Incidents/arrests/311 pull from a Socrata portal |
| `arcgis` | Incidents pull from an ArcGIS Feature Service instead (`scripts/utils/arcgis-fetch.ts`) |
| `teaCounty` | County the statewide TEA CAMPUS extract is filtered to |
| `youthCourt` | `tjjd-request` (58.009 request workbook, per county) or `tjjd-county` (data.texas.gov statewide file, annual) |
| `geo.zcta` | ZCTA GeoJSON in `public/` for the ZIP choropleth; also the ZIP allow-list for TJJD records |
| `hiddenPages` | Page ids dropped from nav; the page itself 404s |
| `dataNotices` | Per-domain banner explaining why a scaffolded page is empty |
| `dataCurrency` | Per-domain "Data through <date>" banner for rarely refreshed sources (Dallas CFS: annual records request) |

A domain left out of `domains` has no nav tab, and its pages 404 server-side via
`src/lib/require-domain.tsx` (Tarrant has no CFS or 311).

A domain with no source for a jurisdiction emits an empty payload rather than failing, so
the routed page renders its notice instead of a fetch error.

### Maps

- **Basemap:** Esri World Light Gray Canvas, base plus labels (`src/components/charts/basemap.tsx`).
  It needs no API key. CARTO's basemaps were dropped on 2026-09-29 because they now serve
  "API KEY REQUIRED" watermark tiles to keyless requests. An HTTP 200 PNG does not prove a
  tile is good, so look at the image.
- **Map cards use `isolation: isolate`.** Without it, Leaflet's panes (z-index 400–1000)
  cover page dropdowns (z-50).
- **Offense Type filter on the map** filters dots by offense group or crime-against. Points
  carry no NIBRS code, so the map's tree stops at group level.
- **Offense point coordinates:** Dallas's location text is `(lat, lon)` and GeoJSON is
  `[lon, lat]`. `extract_lonlat` in `prepare-incidents-parquet.py` (the path CI uses)
  orders the pair by sign (western hemisphere: longitude negative). A swap here leaves the
  map empty without any error, which happened until 2026-09-29.

### Overview summary measures

- **Youth court card/KPI:** the latest (partial) year compared with the same months of the
  prior year, labelled e.g. "Jan–Aug 2026".
- **School discipline card/KPI:** disciplinary incidents only, meaning CAMPUS section
  `W-REASON INCIDENT COUNTS` with type `Incident Type`, labelled with the school year. This
  matches the "Incident Reasons" subtotal on the School Discipline page. **Never sum every
  CAMPUS row.** The extract mixes enrollment, student counts, actions and demographic
  re-cuts of the same actions, and summing them all inflated the card about 20 times until
  2026-09-29.

### ArcGIS extraction notes

ArcGIS Feature Service layers cap `maxRecordCount` at 1,000 and ignore a larger
`resultRecordCount`, so bulk extraction is many small `resultOffset` pages (~576 for Fort
Worth's crime layer). Two things matter:

- **Order by the layer's object-id field, never an attribute.** Sorting on an unindexed
  column makes the service re-sort the full result set per page — 14s vs 4s on Fort
  Worth's crime layer. `fetchArcGISEach` defaults to the OID.
- **Aggregate per page; don't collect first.** Holding ~576k row objects is enough to
  exhaust a default Node heap. Use `fetchArcGISEach(opts, onRows)` and fold each batch
  into the aggregation maps. `fetchArcGISAll` accumulates and is only for small layers.

### TJJD payload shape

Every category in a TJJD payload (`Age`, `Gender`, `Offense Type`, …) is an alternative
cut of the same referrals. **Summing across categories multiplies the count** by the
number of cuts. The payload's `totalCategory` names the one partition that may be summed;
`granularity` tells the UI whether the time axis is monthly or annual.

### TJJD referral workbook

`data/source/tjjd-referrals.xlsx` is downloaded from the OneDrive path in the
`SHAREPOINT_TJJD_FILE_PATH` repo variable (currently request #42717, CY2020 through Aug
2026, both counties). A new TJJD request is swapped in by changing that variable only.
The parser reads TJJD's formatted report layout directly — county and group header bands
above a label row — so a new request in the same layout needs no code change. `" < 5"`
cells count as 1, matching the original Dallas extract. For a new county, build its
boundaries with `python scripts/build-zcta-geojson.py <county GEOID> <slug>`.

## Data Domains

| Domain | Source Type | ETL Script | API Path |
|--------|-------------|------------|----------|
| Incidents | Socrata or ArcGIS, per jurisdiction | `scripts/etl-incidents.ts` | `/api/{jurisdiction}/incidents` |
| Arrests | Open data, where published | `scripts/etl-arrests.ts` | `/api/{jurisdiction}/arrests` |
| 311 | Open data, where published | `scripts/etl-311.ts` | `/api/{jurisdiction}/311` |
| CFS | Public-records source file | `scripts/etl-cfs.ts` | `/api/{jurisdiction}/cfs` |
| Campus | Public education data files | `scripts/etl-campus.ts` | `/api/{jurisdiction}/campus` |
| TJJD | 58.009 request workbook, or statewide county file | `scripts/etl-tjjd.ts` | `/api/{jurisdiction}/tjjd` |
| Overview | Computed summary | `scripts/compute-overview-summary.ts` | `/api/{jurisdiction}/overview-summary` |

## Local Development

```bash
npm install
npm run dev
```

To regenerate data locally, place the required source files in `data/source/` and `data/crosswalks/`, then run:

```bash
npm run refresh-data
```

## Commands

```bash
npm run dev
npm run build
npm run refresh-data                          # every registered jurisdiction
npx tsx scripts/refresh-data.ts tarrant       # one jurisdiction
npx tsx scripts/etl-incidents.ts
npx tsx scripts/geocode-schools.ts "TARRANT COUNTY"   # merges into school-geocodes.json
python scripts/prepare-incidents-parquet.py
python scripts/prepare-cfs-csv.py
```

## Conventions

- Compact JSON keys are used in generated payloads, for example `d` for date and `c` for count.
- Raw source files are excluded from git.
- Generated `.json.gz` files are committed so the deployed app can serve data without runtime source access.
- API routes serve raw generated file buffers with cache headers.
