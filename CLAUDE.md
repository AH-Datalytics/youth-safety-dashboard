# Youth Safety Dashboard

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

The overview summary includes a `lastUpdated` ISO timestamp set at ETL compute time, displayed on the home page.

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
- **311** (`d7e7-envw`): `created_date`, `service_request_type`, `department`, `status`, `city_council_district`, `address` (zip extracted via regex), `lat_location`, `priority`

## Pages (14 actual routes)
| # | Page | Route | Description |
|---|------|-------|-------------|
| 1 | Landing | `/` | Multi-jurisdiction selector (redirects to `/dallas`) |
| 2 | Home | `/[jurisdiction]` | KPI banner + 4 domain cards with sparklines |
| 3 | Offense Overview | `/[jurisdiction]/offense-arrest/overview` | KPIs + monthly chart + heat map + NIBRS tree + case status tabs |
| 4 | Offense Year-to-Date | `/[jurisdiction]/offense-arrest/ytd` | Case status tabs + NIBRS filter + CompStat YTD table |
| 5 | Arrest Demographics | `/[jurisdiction]/offense-arrest/arrests` | Charge bars + demographic multi-line chart |
| 6 | CFS Overview | `/[jurisdiction]/cfs-311/overview` | 3 KPIs + monthly trend + call type bars + heat map |
| 7 | CFS Time of Day | `/[jurisdiction]/cfs-311/time-of-day` | Heat matrix + DOW breakdown |
| 8 | 311 Requests | `/[jurisdiction]/cfs-311/requests` | Type/priority bars + monthly trend |
| 9 | Youth Court Referrals | `/[jurisdiction]/youth-court/referrals` | Brush bar chart + category tabs + ZIP choropleth |
| 10 | School Discipline Summary | `/[jurisdiction]/school-discipline/incidents` | Incident Reasons / Discipline Actions tabs + CompStat table |
| 11 | School Incidents & Discipline | `/[jurisdiction]/school-discipline/charts` | Tabbed bar chart (reasons/actions) + school dot map |
| 12 | Map | `/[jurisdiction]/map` | Dot map combining offenses + 311 requests |
| 13 | Downloads | `/[jurisdiction]/downloads` | Card layout with CSV/Excel download for all 6 datasets |
| 14 | About | `/[jurisdiction]/about` | Project information + data sources |

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
- `dallas-youth-safety-dashboard-spec.md` — Visual spec (original Dallas design; 4 pages not yet built)

## GitHub Actions CI
- Workflow: `.github/workflows/refresh-data.yml`
- Trigger: `workflow_dispatch` (manual) + `schedule` (daily)
- Steps: checkout → npm ci → download OneDrive files → Python parquet → Python CFS CSV → npm run refresh-data → commit generated data

---

## Statewide Expansion — Texas Youth Justice Data Platform (April 2026)

### Status (as of 2026-04-13)
- **Proposal v2 drafted and sent for review.** Elizabeth confirmed she wants phased approach aligned to JOY Hubs prospectus with benchmarks to unlock funding at each phase.
- **v2 proposal**: `docs/proposals/2026-04-13-statewide-platform-proposal-v2.md` (markdown) and `docs/proposals/AH Datalytics - LSJA Statewide Youth Justice Data Platform.docx` (formatted .docx)
- **Previous drafts**: `docs/proposals/2026-04-08-statewide-platform-proposal.md` (full detail) and `2026-04-08-statewide-platform-financial-summary.md` (1-page)
- **Pricing**: $1M total over 5 years ($250K→$225K→$200K→$175K→$150K declining profile). Enhanced scope options noted for future discussion.
- **Tarrant County on hold** until after Elizabeth's pitch — if statewide funding comes through, Tarrant is subsumed into the statewide platform.
- **Dallas dashboard**: still needs to be deployed live on LSJA's website. Immediate action item.

### Context: What Is This?
LSJA is pitching a **$65 million "JOY Hubs" fund** to One for Justice — a pooled fund of major funders (Mellon, Vera, Blue Meridian, Aspen, Helsing Simmons, etc.) who collectively give over $1B/year to justice reform. The pitch is ~2 weeks from 2026-04-08. Elizabeth wants AHD's statewide dashboard bid included in the financial model.

JOY Hubs are a statewide network of community reengagement centers for justice-involved youth ages 16–24. $31.7M over 5 years for direct services, ~4,650 participants, phased: Year 1 infrastructure, Years 2–4 six urban hubs, Year 5 rural expansion.

**The dashboard is the measurement and accountability backbone** — the system that makes JOY Hub outcomes visible to funders, legislators, and the public.

### Key People
- **Elizabeth** — LSJA executive, the client. Fast-moving, vision-driven. "Grade them against each other."
- **Courtney Chavez** — LSJA, new point of contact for Tarrant County and ongoing work
- **Stephanie Trevino** — LSJA finance, helming the financial model for the $65M pitch
- **Haley Shaeffer** — AHD team member on the project

### Client Meeting Summary (2026-04-08)
Key decisions from the meeting:
1. **Invoicing**: 5 annual invoices of $4,500 for Dallas maintenance (NLC grant, $500 kept by LSJA admin). Pick first-quarter dates.
2. **Tarrant County**: Green light, $10K under Rainwater grant. Courtney is point of contact. **BUT hold until after the pitch** — may skip straight to statewide.
3. **Statewide proposal needed**: Elizabeth wants a bid to include in the $65M pitch. "Send me an analysis of how much you think it would cost."
4. **Collin County next, then Denton** after Tarrant.
5. **Dashboard was cited by Evident Change** in their March 2026 Dallas evaluation. Elizabeth: "they're using the dashboard to calculate some of the data."
6. **Legislative testimony**: Elizabeth may want AHD to testify at Texas Capitol next session for crime data myth-busting.

### What Elizabeth Wants the Platform to Do
1. **Statewide dashboard** covering all 254 Texas counties
2. **Drill down** to any county (and potentially deeper)
3. **A–F letter grades** for each county — "the best way to get reform is to make them feel like they're part of the cool kids"
4. **Aligned to the YSC Strategic Plan** — specifically the Youth Justice Cornerstone (pp. 39–51) with its outcomes, impacts, and measurement callout boxes
5. **Visual representation of measured outcomes** for each county per the strategic plan
6. **Additional data**: TWC workforce data (Ray Marshall Center partnership), health data (long-term)
7. **JOY Hub outcome tracking** — dashboard shows whether Hubs are achieving their metrics

### Pricing Discussion
- **v2 approach**: Single $1M/5yr option with declining annual profile ($250K→$150K). Enhanced scope noted as future option.
- **Elizabeth's direction (2026-04-13)**: Follow prospectus phased approach. Share benchmarks to unlock funding at each phase.
- **Context**: Within $65M fund, this is 1.5%. The JOY Hubs evaluation partner alone is $1M. Phase 1 backbone is $1.35M.
- **Price sensitivity**: Keep front-end manageable (~$200-250K/yr). Options to scale toward $1.5M if enhanced scope needed.

### YSC Strategic Plan — Youth Justice Cornerstone (pp. 39–51)
Four goals with specific metrics the dashboard must track:

**Goal 1: Reform Intake**
- Quantitative: # youth diverted, reduction in # incarcerated, reduction in days in detention, recidivism rates, youth completing community programs
- Qualitative: feedback from youth/families, case studies

**Goal 2: Maximize Diversion**
- Quantitative: # youth diverted to community programs, # diversion programs with restorative justice, recidivism reduction, # CBO partnerships
- Qualitative: youth/family feedback, success stories, partnership sustainability

**Goal 3: Reduce Detention 50%**
- Quantitative: # law enforcement trained, # youth diverted from detention, recidivism rates, time-saved (Participatory Defense metric), # community programs developed
- Qualitative: success stories, stakeholder feedback on alternatives

**Goal 4: Shift Public Narrative**
- Quantitative: # media campaigns, public engagement metrics, # youth/advocates trained, # partnerships
- Qualitative: perception change feedback, case studies, public discourse analysis

### JOY Hubs Outcome Metrics (from prospectus)
- Youth connected to Hub within 24–72 hours post-release
- Warm handoff rate on release day (target: 80%+)
- Re-arrest rate at 12 and 36 months (Dallas benchmark: 10.7% at 3 years; WilCo RCT graduates: 14%)
- Credential attainment rate (benchmark: 127 lifetime credentials)
- Employment rate and average wage at 6/12 months ($18.36/hr, 68% 180-day retention)
- Housing connection at 90 days
- Youth reenrolled in school or training
- Participant Net Promoter Score (92.5% lifetime)
- Family engagement for youth under 18
- Youth advisory council participation

### Dallas Proof of Concept — Evident Change Results (March 2026)
- 59% reduction in detention-to-disposition time (140 → 57 days)
- 24% reduction in monthly detention census (103 → 78)
- 41% drop in misdemeanor filings (61/mo → 36/mo)
- 61% increase in supervisory caution (18% → 29%)
- 26% decrease in formal probation (57% → 42%)
- Low-risk youth in detention "nearly disappeared" (3–10/mo → 0–1)
- High-risk youth proportion increased (54% → 61%) — appropriate targeting

### Statewide Data Sources Identified
| Source | Data | All 254 Counties? | Effort |
|--------|------|--------------------|--------|
| **TJJD** | Referrals, dispositions, detention, probation, demographics, recidivism | Yes | Medium — need data agreement for detail beyond public reports |
| **TEA** | School discipline, referrals to justice, enrollment, demographics | Yes (by district) | Low — already built for Dallas |
| **Texas DPS / NIBRS** | Offense and arrest data by agency | All reporting agencies | Medium — public data (Crime in Texas + FBI Crime Data Explorer) |
| **Census / ACS** | Demographics, poverty, housing, education, employment | Yes | Low — free API |
| **TWC** | County employment, unemployment, industry | Yes (general) | Low — public |
| **Ray Marshall Center** | Individual wage data for JOY Hub participants | Hub counties only | High — partnership required |
| **OCA** | Case disposition times, filing types | Most counties | Medium — public + possible agreement |
| **DSHS / HHSC** | Mental health, health indicators | TBD | Very High — multi-year effort |
| **JOY Hub case management** | Participant outcomes | Hub counties only | Medium-High — depends on their system |

**Key insight**: TJJD + TEA + Census + TWC + DPS NIBRS gives a meaningful baseline for ALL 254 counties with no special agreements. Enough to grade every county on justice + education + economic context. Deeper data layers on for JOY Hub counties over time.

**Key dependency**: TJJD data sharing agreement for detailed county-level data is the biggest Year 1 blocker. LSJA has the relationship with TJJD to make this happen.

### A–F Grading System Design
- **Components**: Diversion rate, detention rate per capita, time to disposition, re-referral rate, school-to-justice referral rate, economic context
- **Normalization**: Peer groups or per-capita rates (Dallas ≠ Loving County)
- **Benchmarks**: National Model Time Standards, TJJD state averages, YSC Cornerstone targets
- **Transparency**: Formula, weights, and data published on platform
- **Improvement-sensitive**: Grades reflect both absolute performance and YoY improvement
- **Methodology effort**: ~100–150 hours of consulting/data science work

### Architecture Changes Needed for Statewide
- **Data pipeline**: Per-jurisdiction individual files → centralized bulk ingest (TJJD bulk, TEA bulk, Census API, DPS NIBRS, TWC)
- **New page types**: Statewide map with grade overlay, county comparison tool, grading leaderboard, JOY Hub dashboards
- **Two-tier views**: Statewide overview → County detail (like current Dallas)
- **i18n**: next-intl for full English/Spanish bilingual support
- **Grading engine**: Computes and displays A–F per county
- **Automated reports**: "State of the county" summaries for legislators

### Design Ideas Discussed (pre-client-meeting brainstorming)
- **Dual entry paths**: "Explore Dallas" (city-wide KPIs) vs. "My Neighborhood" (ZIP-filtered). Same pages, just a geography filter in a shared Zustand store. Toggle in header: "All of Dallas ↔ ZIP 75217". This was discussed but is separate from the statewide proposal.
- **Census/ACS as foundation layer**: Free, available everywhere, contextualizes justice data with conditions (poverty, housing, employment).

### Reference Documents (all reviewed)
- **YSC Strategic Plan**: `https://www.lonestarjusticealliance.org/wp-content/uploads/2024/12/final_BW_LSJA_Dallas-Youth-Safety-Collaborative.pdf` — pp. 39–51 for Youth Justice Cornerstone
- **JOY Hubs Executive Summary**: `C:\Users\bhorw\Downloads\2026 Joy Hubs Executive Summary Final.docx`
- **JOY Hubs Full Prospectus**: `C:\Users\bhorw\Downloads\2026_Joy_Hubs_Prospectus_FINAL.docx`
- **Dallas Phase 2 Proposal**: `C:\OneDrive\OneDrive - ahdatalytics.com\Proposals\AH Datalytics - LSJA Phase 2.docx`
- **Tarrant County Proposal**: `C:\OneDrive\OneDrive - ahdatalytics.com\Proposals\AH Datalytics - Tarrant County - Youth Safety Dashboard.docx` (copy to temp to read — OneDrive virtual FS issue with python-docx)
- **Evident Change Dallas Report**: `https://evidentchange.org/wp-content/uploads/2026/03/Dallas_County_Interim_Report.pdf`
- **Lab Report Dallas Article**: `C:\Users\bhorw\Downloads\Dallas' Juvenile Justice System Was Broken. Have County Leaders Fixed It_.pdf`
- **Meeting Notes**: `C:\Users\bhorw\Downloads\Notes from 4-8-26 meeting LSJA.docx`
- **Meeting Transcript**: `C:\Users\bhorw\Downloads\AHD and LSJA Transcript.txt`

### Iframe Embedding (for LSJA website)
Target iframe height: **1,400px** (tallest page is Youth Court with category expanded).

```html
<iframe
  src="https://youth-safety-dashboard.vercel.app/dallas"
  width="100%"
  height="1400"
  style="border: none; max-width: 1280px;"
  loading="lazy"
  title="Dallas Youth Safety Dashboard"
></iframe>
```

Pages were restructured in May 2026 to fit within ~1,400px:
- Offense & Arrest split into 3 tabs (Overview, Year-to-Date, Demographics) via PageToggle
- School Discipline split into 2 tabs (Summary, Incidents & Discipline) via PageToggle
- CFS Overview reduced from 4 KPIs to 3 (removed YTD Current)

### Immediate Next Steps
1. Ben sends email to Elizabeth confirming format (1–2 pager vs. full proposal) and floating $1–1.5M range
2. Wait for Elizabeth's response
3. Based on her response, either deliver the 1-page financial summary or refine the full proposal
4. ~~Deploy Dallas dashboard live on LSJA website~~ — iframe code ready, share with LSJA
5. Follow up with Courtney to schedule intro meeting and show the platform
