# Dallas Youth Safety Dashboard

## Overview
Public safety dashboard for Dallas County youth — Lone Star Justice Alliance (LSJA).
Migrated from Power BI Desktop to Next.js web app deployed on Vercel with automated GitHub Actions ETL.

## Tech Stack
- **Framework**: Next.js 16 + React 19 + TypeScript (App Router, src/ directory)
- **Styling**: Tailwind CSS 4 (CSS variables, no config file)
- **Charts**: Recharts 3
- **Maps**: Leaflet + React-Leaflet
- **State**: Zustand (per-domain filter stores)
- **Data Fetching**: SWR (client-side, 15min revalidation)
- **ETL**: tsx scripts fetching from Socrata APIs + OneDrive source files (Excel/CSV)
- **Python**: prepare-incidents-parquet.py (downloads CSV → Parquet via Dallas Open Data)
- **Deploy**: Vercel + GitHub Actions daily data refresh

## Brand / Theme
- **Primary**: `#2C1A6B` (LSJA deep purple) — NOT AHD navy
- **Accent**: `#7C3AED` (lighter purple)
- **Background**: `#faf9f6` (warm cream)
- **Fonts**: Libre Baskerville (headings), Roboto Condensed (body), IBM Plex Mono (data)
- **Semantic**: Red `#dc2626` = bad/increase, Blue `#2563eb` = good/decrease

## Data Architecture
1. **Source files** (`data/source/`) downloaded from OneDrive at CI time (Excel/CSV — CFS, Campus, TJJD)
2. **Crosswalks** (`data/crosswalks/`) downloaded from OneDrive (NIBRS, Discipline, Call Type xlsx)
3. **OneDrive download** (`scripts/download-sharepoint-files.ts`) uses MSAL client credentials → Graph API
4. **Python script** downloads incidents CSV from Dallas Open Data → Parquet
5. **ETL scripts** (`scripts/`) fetch from Socrata APIs or read from `data/source/`
6. **JSON.gz files** written to `data/generated/` (committed to git)
7. **API routes** (`src/app/api/`) decompress and serve with cache headers
8. **SWR hooks** (`src/hooks/`) fetch from API, apply Zustand filters
9. **Measure functions** (`src/lib/measures/`) compute YTD, rolling, category groupings
10. **React components** render charts/tables from filtered data

Source files are NOT in git — downloaded from OneDrive at CI time or manually placed locally.

### OneDrive Integration
- Auth: `@azure/msal-node` ConfidentialClientApplication (client credentials flow)
- Module: `scripts/sharepoint-auth.ts` — `downloadSharePointFile(driveId, itemPath) → Buffer`
- Orchestrator: `scripts/download-sharepoint-files.ts` — downloads all 14 source files
- OneDrive path: `/Clients/NLC/Dallas/PowerBI/` (most files)
- GitHub Secrets: `SHAREPOINT_TENANT_ID`, `SHAREPOINT_CLIENT_ID`, `SHAREPOINT_CLIENT_SECRET`, `SHAREPOINT_DRIVE_ID`

### Local Development
To run locally, you need the source data files. Either:
1. Copy files from OneDrive (`Clients/NLC/Dallas/PowerBI/`) into `data/source/` and `data/crosswalks/`
2. Or run `npx tsx scripts/download-sharepoint-files.ts` with env vars set
3. Then run `npm run refresh-data` to generate JSON.gz output files
4. Then `npm run dev` — the dev server reads from `data/generated/`

## 7 Data Domains
| Domain | Source | ETL Script | Endpoint |
|--------|--------|------------|----------|
| Incidents | Socrata `qv6i-rri7` | `etl-incidents.ts` | `/api/incidents` |
| Arrests | Socrata `sdr7-6v3j` | `etl-arrests.ts` | `/api/arrests` |
| 311 | Socrata `gc4d-8a49` | `etl-311.ts` | `/api/311` |
| CFS | OneDrive Excel (`data/source/`) | `etl-cfs.ts` | `/api/cfs` |
| Campus | OneDrive CSVs (`data/source/`) | `etl-campus.ts` | `/api/campus` |
| TJJD | OneDrive Excel (`data/source/`) | `etl-tjjd.ts` | `/api/tjjd` |
| Overview | Computed from all 6 above | `compute-overview-summary.ts` | `/api/overview-summary` |

### Socrata Column Names (verified)
- **Incidents** (`qv6i-rri7`): `date1`, `offincident`, `nibrs_crime_category`, `nibrs_crime`, `district`, `zip_code`
- **Arrests** (`sdr7-6v3j`): `ararrestdate`, `araction`, `race`, `sex`, `age`, `arldistrict`, `arlzip`
- **311** (`gc4d-8a49`): `created_date`, `service_request_type`, `department`, `status`, `city_council_district`, `address` (zip extracted via regex)

## Pages
1. **Home** — KPI banner (4 headline metrics, purple bg) + 4 domain cards with sparklines
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
npm run dev                    # Local dev server (port 3000)
npm run build                  # Production build (run before pushing)
npm run refresh-data           # Run all ETL pipelines + overview summary
npx tsx scripts/etl-incidents.ts  # Run single ETL
npx tsx scripts/download-sharepoint-files.ts  # Download source files from OneDrive
python scripts/prepare-incidents-parquet.py   # Download incidents CSV → Parquet
```

## Key Conventions
- Compact JSON keys: `d`=date, `c`=count, `ot`=offenseType, etc.
- Pre-aggregated data: daily counts, not per-incident records
- API routes serve raw file buffer (no JSON.parse/stringify)
- Filter application in hooks, not components
- Public safety: red = bad (increase), blue = good (decrease)
- `npx next build` must pass before every push
- Home page: NYT editorial style — serif headings, KPI banner, domain cards with sparklines

## Reference Files
- `DATA_MODEL_DOCUMENTATION.md` — Complete PBI model documentation
- `dallas-youth-safety-dashboard-spec.md` — Visual spec for all 13 pages

## GitHub Actions CI
- Workflow: `.github/workflows/refresh-data.yml`
- Trigger: `workflow_dispatch` (manual) + `schedule` (daily)
- Steps: checkout → npm ci → download OneDrive files → Python parquet → npm run refresh-data → commit generated data
