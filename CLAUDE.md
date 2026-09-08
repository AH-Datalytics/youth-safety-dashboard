# Youth Safety Dashboard

## Overview

Public safety dashboard for Texas youth, built for Lone Star Justice Alliance.
The app is a Next.js dashboard with automated ETL that publishes public and public-records data as compact JSON payloads.

Registered jurisdictions live in `src/lib/jurisdictions.ts`. Adding one means adding a
`JurisdictionConfig` there — routes, nav, branding, and ETL dispatch all derive from it.

| Jurisdiction | Route | Offense source | Notes |
|---|---|---|---|
| Dallas County | `/dallas` | Dallas Open Data (Socrata) | All 7 domains populated |
| Tarrant County | `/tarrant` | Fort Worth Open Data (ArcGIS) | No arrests, CFS, or 311 published; youth court is annual only |

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
| `youthCourt` | `local-excel` (58.009 extract) or `tjjd-county` (data.texas.gov statewide file) |
| `hiddenPages` | Page ids dropped from nav; the page itself 404s |
| `dataNotices` | Per-domain banner explaining why a scaffolded page is empty |

A domain with no source for a jurisdiction emits an empty payload rather than failing, so
the routed page renders its notice instead of a fetch error.

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

## Data Domains

| Domain | Source Type | ETL Script | API Path |
|--------|-------------|------------|----------|
| Incidents | Socrata or ArcGIS, per jurisdiction | `scripts/etl-incidents.ts` | `/api/{jurisdiction}/incidents` |
| Arrests | Open data, where published | `scripts/etl-arrests.ts` | `/api/{jurisdiction}/arrests` |
| 311 | Open data, where published | `scripts/etl-311.ts` | `/api/{jurisdiction}/311` |
| CFS | Public-records source file | `scripts/etl-cfs.ts` | `/api/{jurisdiction}/cfs` |
| Campus | Public education data files | `scripts/etl-campus.ts` | `/api/{jurisdiction}/campus` |
| TJJD | 58.009 extract, or statewide county file | `scripts/etl-tjjd.ts` | `/api/{jurisdiction}/tjjd` |
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
