# Dallas Youth Safety Dashboard

## Overview
Public safety dashboard for Dallas County youth — Lone Star Justice Alliance (LSJA).
Migrated from Power BI Desktop to Next.js web app deployed on Vercel with automated GitHub Actions ETL.

## Tech Stack
- **Framework**: Next.js 16 + React 19 + TypeScript (App Router, src/ directory)
- **Styling**: Tailwind CSS 4 (CSS variables, no config file)
- **Charts**: Recharts 3
- **Maps**: Leaflet + React-Leaflet (dot maps + choropleth)
- **State**: Zustand 5 (per-domain filter stores)
- **Data Fetching**: SWR 2 (client-side, 15min revalidation)
- **Icons**: Lucide React
- **Utilities**: date-fns, clsx + tailwind-merge (via `cn()`), zod, xlsx (for data export)
- **ETL**: tsx scripts fetching from Socrata APIs + OneDrive source files (Excel/CSV)
- **Python**: prepare-incidents-parquet.py, prepare-cfs-csv.py
- **Deploy**: Vercel + GitHub Actions daily data refresh

## Brand / Theme
- **Primary**: `#2C1A6B` (LSJA deep purple) — NOT AHD navy
- **Accent**: `#7C3AED` (lighter purple)
- **Background**: `#faf9f6` (warm cream)
- **Fonts**: Libre Baskerville (headings), Roboto Condensed (body), IBM Plex Mono (data)
- **Semantic**: Red `#dc2626` = bad/increase, Blue `#2563eb` = good/decrease

## Multi-Jurisdiction Architecture
- **Dynamic routing**: All pages under `src/app/[jurisdiction]/` — currently only `dallas` registered
- **Jurisdiction registry**: `src/lib/jurisdictions.ts` — `JurisdictionConfig`, `DomainId`, `JURISDICTIONS[]`, `getSections()`, `getJurisdictionOrThrow()`
- **Context**: `src/lib/jurisdiction-context.tsx` — `JurisdictionProvider` + `useJurisdiction()` hook
- **Layout**: `src/app/[jurisdiction]/layout.tsx` — sets CSS vars per jurisdiction, wraps in provider + AppShell
- **DomainId type**: `"offense-arrest" | "cfs" | "311" | "map" | "youth-court" | "school-discipline"`
- **Nav sections**: `DOMAIN_SECTIONS` record maps each `DomainId` to nav `Section[]` with pages

## Data Architecture
1. **Source files** (`data/source/`) downloaded from OneDrive at CI time (Excel/CSV — CFS, Campus, TJJD)
2. **Crosswalks** (`data/crosswalks/`) downloaded from OneDrive (NIBRS, Discipline, Call Type xlsx)
3. **Static data** (`data/static/`) — `crosswalks.json` served by `/api/crosswalks`
4. **OneDrive download** (`scripts/download-sharepoint-files.ts`) uses MSAL client credentials → Graph API
5. **Python scripts** — `prepare-incidents-parquet.py` (Socrata CSV → Parquet), `prepare-cfs-csv.py` (CFS Excel → CSV)
6. **ETL scripts** (`scripts/`) fetch from Socrata APIs or read from `data/source/`
7. **JSON.gz files** written to `data/generated/{jurisdiction}/` (committed to git)
8. **API route** — single catch-all at `src/app/api/[jurisdiction]/[domain]/route.ts` decompresses and serves with cache headers
9. **SWR hooks** (`src/hooks/`) fetch from API via `useApiUrl()`, apply Zustand filters
10. **Measure functions** (`src/lib/measures/`) compute YTD, rolling, category groupings
11. **React components** render charts/tables from filtered data

Source files are NOT in git — downloaded from OneDrive at CI time or manually placed locally.

### API Routes
| Route | Purpose |
|-------|---------|
| `/api/[jurisdiction]/[domain]` | Single dynamic catch-all — serves `data/generated/{jurisdiction}/{domain}-data.json.gz` |
| `/api/crosswalks` | Serves `data/static/crosswalks.json` |
| `/api/health` | Health check listing required `.json.gz` files |

Valid domain values: `incidents`, `arrests`, `311`, `cfs`, `campus`, `tjjd`, `overview-summary`, `crosswalks`

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
| Domain | Source | ETL Script | API Path |
|--------|--------|------------|----------|
| Incidents | Socrata `qv6i-rri7` | `etl-incidents.ts` | `/api/{jurisdiction}/incidents` |
| Arrests | Socrata `sdr7-6v3j` | `etl-arrests.ts` | `/api/{jurisdiction}/arrests` |
| 311 | Socrata `gc4d-8a49` | `etl-311.ts` | `/api/{jurisdiction}/311` |
| CFS | OneDrive Excel (`data/source/`) | `etl-cfs.ts` | `/api/{jurisdiction}/cfs` |
| Campus | OneDrive CSVs (`data/source/`) | `etl-campus.ts` | `/api/{jurisdiction}/campus` |
| TJJD | OneDrive Excel (`data/source/`) | `etl-tjjd.ts` | `/api/{jurisdiction}/tjjd` |
| Overview | Computed from all 6 above | `compute-overview-summary.ts` | `/api/{jurisdiction}/overview-summary` |

### Socrata Column Names (verified)
- **Incidents** (`qv6i-rri7`): `date1`, `offincident`, `nibrs_crime_category`, `nibrs_crime`, `district`, `zip_code`
- **Arrests** (`sdr7-6v3j`): `ararrestdate`, `araction`, `race`, `sex`, `age`, `arldistrict`, `arlzip`
- **311** (`gc4d-8a49`): `created_date`, `service_request_type`, `department`, `status`, `city_council_district`, `address` (zip extracted via regex)

## Pages (10 actual routes)
| # | Page | Route | Description |
|---|------|-------|-------------|
| 1 | Landing | `/` | Multi-jurisdiction selector (redirects to `/dallas`) |
| 2 | Home | `/[jurisdiction]` | KPI banner + 4 domain cards with sparklines |
| 3 | Offense Overview | `/[jurisdiction]/offense-arrest/overview` | KPIs + monthly trend + NIBRS tree + heat map |
| 4 | Arrest Demographics | `/[jurisdiction]/offense-arrest/arrests` | Charge bars + demographic multi-line chart |
| 5 | CFS Overview | `/[jurisdiction]/cfs-311/overview` | KPIs + monthly trend + call type bars + heat map |
| 6 | CFS Time of Day | `/[jurisdiction]/cfs-311/time-of-day` | Heat matrix + DOW breakdown |
| 7 | 311 Requests | `/[jurisdiction]/cfs-311/requests` | Type/priority bars + monthly trend |
| 8 | Youth Court Referrals | `/[jurisdiction]/youth-court/referrals` | Brush bar chart + category tabs + ZIP choropleth |
| 9 | School Discipline | `/[jurisdiction]/school-discipline/incidents` | CompStat table + incident/action bars + school dot map |
| 10 | Map | `/[jurisdiction]/map` | Dot map combining offenses + 311 requests |
| 11 | Downloads | `/[jurisdiction]/downloads` | Card layout with CSV/Excel download for all 6 datasets |
| 12 | About | `/[jurisdiction]/about` | Project information + data sources |

## Per-Domain File Pattern
```
scripts/etl-{domain}.ts                              → ETL: raw data → aggregated JSON.gz
src/app/api/[jurisdiction]/[domain]/route.ts          → API: single catch-all serves all domains
src/lib/types/{domain}.ts                             → Types: payload + record interfaces
src/stores/{domain}-store.ts                          → State: Zustand filter store
src/hooks/use-{domain}.ts                             → Hooks: SWR fetch + filter application
src/hooks/use-api-url.ts                              → Shared: builds /api/{jurisdiction}/{domain} URL
src/app/[jurisdiction]/(sections)/{section}/*/page.tsx → Page components
```

## Component Inventory
```
src/components/
  charts/     bar-chart-horizontal, brush-bar-chart, choropleth-map, compstat-discipline-table,
              donut-chart, dot-map, monthly-bar-chart, multi-line-chart, stacked-bar-chart,
              time-matrix, trend-chart, ytd-change-table
  filters/    date-range-slicer, multi-select, tree-filter
  layout/     app-shell, footer, header
  overview/   domain-card, kpi-banner, mini-bar-chart
  ui/         data-table, download-button, kpi-card, loading-skeleton
```

## Data Download Feature
- **Column definitions**: `src/config/download-columns.ts` — maps compact JSON keys to readable headers per domain
- **Download utility**: `src/lib/download.ts` — CSV generation, XLSX via `xlsx` package (dynamic import), browser download trigger
- **DownloadButton component**: `src/components/ui/download-button.tsx` — dropdown with filtered/full CSV/Excel options
- **Downloads page**: `src/app/[jurisdiction]/downloads/page.tsx` — all 6 datasets with row counts and download buttons
- Each data page has a DownloadButton in its filter bar; raw SWR hooks (e.g. `useIncidents()`) provide full dataset, SWR deduplicates
- File naming: `{jurisdiction}-{domain}-{variant}-{date}.{format}` (e.g. `dallas-incidents-filtered-2026-03-02.csv`)

## Scripts
```
scripts/
  etl-incidents.ts              → Socrata → incidents JSON.gz
  etl-arrests.ts                → Socrata → arrests JSON.gz
  etl-311.ts                    → Socrata → 311 JSON.gz
  etl-cfs.ts                    → data/source/ Excel → cfs JSON.gz
  etl-campus.ts                 → data/source/ CSVs → campus JSON.gz
  etl-tjjd.ts                   → data/source/ Excel → tjjd JSON.gz
  compute-overview-summary.ts   → Aggregates all 6 → overview-summary JSON.gz
  refresh-data.ts               → Runs all ETL scripts in sequence
  download-sharepoint-files.ts  → MSAL auth → downloads 14 source files from OneDrive
  sharepoint-auth.ts            → MSAL client credentials helper
  geocode-schools.ts            → Geocodes school addresses for dot map
  prepare-incidents-parquet.py  → Downloads incidents CSV from Dallas Open Data → Parquet
  prepare-cfs-csv.py            → Converts CFS Excel to CSVs for ETL
  requirements.txt              → Python dependencies
  utils/
    load-crosswalks.ts          → Crosswalk loading utility
    normalize.ts                → Text normalization utility
```

## Commands
```bash
npm run dev                    # Local dev server (port 3000)
npm run build                  # Production build (run before pushing)
npm run refresh-data           # Run all ETL pipelines + overview summary
npx tsx scripts/etl-incidents.ts  # Run single ETL
npx tsx scripts/download-sharepoint-files.ts  # Download source files from OneDrive
python scripts/prepare-incidents-parquet.py   # Download incidents CSV → Parquet
python scripts/prepare-cfs-csv.py             # Convert CFS Excel to CSVs
```

## Key Conventions
- Compact JSON keys: `d`=date, `c`=count, `ot`=offenseType, etc.
- Pre-aggregated data: daily counts, not per-incident records
- API route serves raw file buffer (no JSON.parse/stringify)
- Filter application in hooks, not components
- Public safety: red = bad (increase), blue = good (decrease)
- `npx next build` must pass before every push
- Home page: NYT editorial style — serif headings, KPI banner, domain cards with sparklines

## Key Library Files
- `src/lib/constants.ts` — `SWR_CONFIG`, `COLORS`, `CHART_COLORS`, `MAP_DOT_COLORS`, `DATA_FLOOR`
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `src/lib/jurisdiction-context.tsx` — React context for current jurisdiction
- `src/lib/jurisdictions.ts` — Jurisdiction registry, nav sections, helpers

## Reference Files
- `DATA_MODEL_DOCUMENTATION.md` — Complete PBI model documentation
- `dallas-youth-safety-dashboard-spec.md` — Visual spec (original 13-page design; 4 pages not yet built)

## GitHub Actions CI
- Workflow: `.github/workflows/refresh-data.yml`
- Trigger: `workflow_dispatch` (manual) + `schedule` (daily)
- Steps: checkout → npm ci → download OneDrive files → Python parquet → Python CFS CSV → npm run refresh-data → commit generated data
