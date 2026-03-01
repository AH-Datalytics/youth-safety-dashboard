# Dallas Youth Safety Dashboard

## Overview
Public safety dashboard for Dallas County youth — Lone Star Justice Alliance (LSJA).
Migrated from Power BI Desktop to Next.js web app deployed on Vercel with automated GitHub Actions ETL.

## Tech Stack
- **Framework**: Next.js 16 + React 19 + TypeScript (App Router, src/ directory)
- **Styling**: Tailwind CSS 4 (CSS variables, no config file)
- **Charts**: Recharts 3
- **Maps**: Leaflet + React-Leaflet (GeoJSON boundaries needed)
- **State**: Zustand (per-domain filter stores)
- **Data Fetching**: SWR (client-side, 15min revalidation)
- **ETL**: tsx scripts fetching from Socrata APIs + local Excel/CSV files
- **Deploy**: Vercel + GitHub Actions daily data refresh

## Brand / Theme
- **Primary**: `#2C1A6B` (LSJA deep purple) — NOT AHD navy
- **Accent**: `#7C3AED` (lighter purple)
- **Background**: `#faf9f6` (warm cream)
- **Fonts**: Libre Baskerville (headings), Roboto Condensed (body), IBM Plex Mono (data)
- **Semantic**: Red `#dc2626` = bad/increase, Blue `#2563eb` = good/decrease

## Data Architecture
1. **ETL scripts** (`scripts/`) fetch from Socrata APIs or read local files
2. **JSON.gz files** written to `data/generated/` (committed to git)
3. **API routes** (`src/app/api/`) decompress and serve with cache headers
4. **SWR hooks** (`src/hooks/`) fetch from API, apply Zustand filters
5. **Measure functions** (`src/lib/measures/`) compute YTD, rolling, category groupings
6. **React components** render charts/tables from filtered data

## 6 Data Domains
| Domain | Source | ETL Script | Endpoint |
|--------|--------|------------|----------|
| Incidents | Socrata `qv6i-rri7` | `etl-incidents.ts` | `/api/incidents` |
| Arrests | Socrata `sdr7-6v3j` | `etl-arrests.ts` | `/api/arrests` |
| 311 | Socrata `gc4d-8a49` | `etl-311.ts` | `/api/311` |
| CFS | Local Excel | `etl-cfs.ts` | `/api/cfs` |
| Campus | Local CSVs | `etl-campus.ts` | `/api/campus` |
| TJJD | Local Excel | `etl-tjjd.ts` | `/api/tjjd` |

## 13 Pages
1. Home — Section cards + data source info
2. Offense Overview — KPIs + monthly trend + NIBRS categories
3. Offense Time of Day — Heat matrix + DOW breakdown
4. Offense Map — Choropleth by district/zip
5. Arrest Demographics — Charge bars + race/sex/age donuts
6. CFS Overview — KPIs + monthly trend + priority donut
7. CFS Time of Day — Heat matrix
8. CFS Map — Choropleth by district
9. 311 Requests — Type bars + department table + status donut
10. Youth Court Referrals — Offense bars + demographic donuts
11. Referrals Over Time — Annual trend + stacked bars
12. Disciplinary Incidents — SY trend + campus bars + demographics
13. Disciplinary Outcomes — Stacked actions + disparity table

## Per-Domain File Pattern
```
scripts/etl-{domain}.ts              → ETL: raw data → aggregated JSON.gz
src/app/api/{domain}/route.ts        → API: serves JSON.gz with cache headers
src/lib/types/{domain}.ts            → Types: payload + record interfaces
src/stores/{domain}-store.ts         → State: Zustand filter store
src/hooks/use-{domain}.ts            → Hooks: SWR fetch + filter application
src/app/(sections)/{section}/*/page.tsx → Page components
```

## Commands
```bash
npm run dev                    # Local dev server
npm run build                  # Production build (run before pushing)
npm run refresh-data           # Run all ETL pipelines
npx tsx scripts/etl-incidents.ts  # Run single ETL
```

## Key Conventions
- Compact JSON keys: `d`=date, `c`=count, `ot`=offenseType, etc.
- Pre-aggregated data: daily counts, not per-incident records
- API routes serve raw file buffer (no JSON.parse/stringify)
- Filter application in hooks, not components
- Public safety: red = bad (increase), blue = good (decrease)
- `npx next build` must pass before every push

## Reference Files
- `DATA_MODEL_DOCUMENTATION.md` — Complete PBI model documentation
- `dallas-youth-safety-dashboard-spec.md` — Visual spec for all 13 pages
