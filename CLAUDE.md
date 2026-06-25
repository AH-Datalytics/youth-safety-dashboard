# Youth Safety Dashboard

## Overview

Public safety dashboard for Dallas County youth, built for Lone Star Justice Alliance.
The app is a Next.js dashboard with automated ETL that publishes public and public-records data as compact JSON payloads.

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
2. Runtime source directories are intentionally not committed.
3. ETL scripts write compact public payloads to `data/generated/{jurisdiction}/`.
4. The API route at `src/app/api/[jurisdiction]/[domain]/route.ts` serves generated `.json.gz` payloads.
5. Client hooks in `src/hooks/` fetch those payloads and apply local filters.

## Data Domains

| Domain | Source Type | ETL Script | API Path |
|--------|-------------|------------|----------|
| Incidents | Dallas Open Data | `scripts/etl-incidents.ts` | `/api/{jurisdiction}/incidents` |
| Arrests | Dallas Open Data | `scripts/etl-arrests.ts` | `/api/{jurisdiction}/arrests` |
| 311 | Dallas Open Data | `scripts/etl-311.ts` | `/api/{jurisdiction}/311` |
| CFS | Public-records source file | `scripts/etl-cfs.ts` | `/api/{jurisdiction}/cfs` |
| Campus | Public education data files | `scripts/etl-campus.ts` | `/api/{jurisdiction}/campus` |
| TJJD | Public-records source file | `scripts/etl-tjjd.ts` | `/api/{jurisdiction}/tjjd` |
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
npm run refresh-data
npx tsx scripts/etl-incidents.ts
python scripts/prepare-incidents-parquet.py
python scripts/prepare-cfs-csv.py
```

## Conventions

- Compact JSON keys are used in generated payloads, for example `d` for date and `c` for count.
- Raw source files are excluded from git.
- Generated `.json.gz` files are committed so the deployed app can serve data without runtime source access.
- API routes serve raw generated file buffers with cache headers.
