# Tarrant County — Open Data Availability

**Date:** 2026-09-08
**Purpose:** Record what public data exists to support a Tarrant County jurisdiction on the
Youth Safety Dashboard, what does not, and what it would take to close each gap.

All findings below were verified by querying the live endpoints on 2026-09-08, not from
portal documentation.

---

## Summary

| Domain | Dallas source | Tarrant status | Source |
|---|---|---|---|
| Offenses / incidents | Dallas Open Data (Socrata) | **Available** | Fort Worth ArcGIS Feature Service |
| Map (offense points) | Dallas incidents lat/lon | **Available** | Same layer, `Location_1` field |
| School discipline | Statewide TEA CAMPUS extract | **Available** | Same files, county filter changed |
| Youth court referrals | Family Code 58.009 extract | **Partial** | TJJD statewide county file, annual only |
| Arrests | Dallas Open Data (Socrata) | **Not published** | — |
| Calls for service | Public-records request to Dallas PD | **Not published** | — |
| 311 service requests | Dallas Open Data (Socrata) | **Not published** | — |

Four of seven domains populate from public sources. Three do not exist as open data for
any Tarrant County jurisdiction.

---

## The portal change that matters most

**Fort Worth is no longer on Socrata.** The city ran a Socrata portal (dataset ids in the
`k6ic-7kp7` four-by-four form still appear in search results), but those endpoints now
302 to `hub.arcgis.com/legacy`. `data.fortworthtexas.gov` is an ArcGIS Hub site backed by
ArcGIS Feature Services.

This is why Tarrant needed new extraction code rather than a second Socrata config. Two
practical consequences:

- **Page size is capped at 1,000 records** and the service ignores a larger
  `resultRecordCount`. Extracting the ~530K records since 2017 means ~530 paged requests
  rather than a dozen. `scripts/utils/arcgis-fetch.ts` resolves the total up front via
  `returnCountOnly`, then issues pages with bounded concurrency.
- The Hub offers an async bulk CSV export (`/api/download/v1/items/{id}/csv`) which
  generates on demand and must be polled. It was not used — paged queries are
  deterministic and avoid a second failure mode in CI.

---

## Available now

### 1. Offenses — CFW Police Crime Data

- **Layer:** `services5.arcgis.com/3ddLCBXe1bRt7mzj/.../CFW_Open_Data_Police_Crime_Data_Table_view/FeatureServer/0`
- **Volume:** 1,458,325 records total; 1971-11-17 through 2026-09-06
- **Recent annual volume:** 2017: 63,927 · 2020: 57,974 · 2023: 61,250 · 2024: 61,991 · 2025: 56,928
- **Refresh:** weekly, Sundays (per the dataset description; max date confirmed current)
- **Fields used:** `Reported_Date`, `Offense`, `Offense_Desc`, `CouncilDistrict`, `Location_1`

**Offense codes are NIBRS**, which is the significant compatibility win — the existing
`XWalk - NIBRS.xlsx` crosswalk covers **54 of the 60** codes Fort Worth has used since
2017. The six unmatched codes are 15,377 records (~2.9% of the period):

| Code | Records (2017+) | Handling |
|---|---|---|
| `WAR` | 10,206 | Warrant Service — Fort Worth local code |
| `TRC` | 4,131 | Traffic Code Violation — local |
| `90I` | 906 | Runaway — real NIBRS Group B, absent from the Dallas crosswalk |
| `TCG` | 120 | Traffic Code, General — local |
| `90A` | 13 | Bad Checks — real NIBRS Group B, absent from the Dallas crosswalk |
| `EDU` | 1 | Education Code Violation — local |

These are supplemented in `LOCAL_OFFENSE_CODES` in `scripts/etl-incidents.ts` rather than
by editing the shared crosswalk, which is Dallas's client-supplied file.

**Two structural gaps to know when reading the Tarrant offense pages:**

- **No clearance or disposition field.** Dallas's `ucr_disp` is what produces the
  "Cleared (Arrestee Age 17 or Under)" and "Cleared (Arrestee 18 or Older)" case statuses.
  Fort Worth publishes no equivalent, so every Tarrant record lands in case status
  "Unknown" and **the two youth-clearance KPIs on the Tarrant home banner read zero**.
  This is the single largest analytic loss, because arrestee-age-at-clearance is the one
  field in the offense data that is actually youth-specific.
- **No ZIP field.** `BLOCK_ADDRESS` carries no postal code. District comes from
  `CouncilDistrict` instead; the ZIP filter is empty for Tarrant.

`Beat` and `Division` are populated on only a subset of recent records
(91,402 with `Division` vs 143,919 with `CouncilDistrict` since 2024), which is why
`CouncilDistrict` was chosen as the district dimension.

**The NIBRS filter trees are not structurally identical across jurisdictions.** Dallas's
Socrata field yields four top-level values — Person, Property, Society, All Other Offenses.
Tarrant resolves through the crosswalk and additionally produces:

- **Group B Offenses** (14 of Fort Worth's codes). Kept rather than folded into "All Other
  Offenses" because it contains Runaway (`90I`, 906 records) and Curfew/Loitering, which
  are among the few genuinely youth-specific categories in the offense data.
- **Not a Crime** (21 records, all `09C` justifiable homicide).

Do not compare the two trees node-for-node; compare at the offense-group level instead.

### 2. School discipline — TEA CAMPUS

No new source needed. The `CAMPUS_summary_*.csv` files already in the pipeline are
**statewide** — all 20 ESC regions, 344,169 rows in the 2023-24 file alone, with Region 11
(Fort Worth/Tarrant) at 38,697. `Directory2024.csv` is likewise statewide and lists **543
Tarrant County schools**.

The county filter was the only hardcoded piece; `runCampusETL` now takes the county from
the jurisdiction config. Tarrant yields **59,854 discipline records across 508 schools**.

School coordinates for the dot map were generated by running the Census batch geocoder for
Tarrant: **475 of 543 matched (87.5%)**.

### 3. Youth court referrals — partial

TJJD publishes **County Level Referral Data, FY 2013-2021** on the Texas Open Data Portal
(`data.texas.gov/resource/54dk-5ghb`, Socrata). Tarrant has 9 rows:

| Year | Juvenile pop. | Referrals | Youth referred | Rate /1,000 |
|---|---|---|---|---|
| 2013 | 201,932 | 3,978 | 2,633 | 19.7 |
| 2014 | 205,284 | 3,483 | 2,494 | 17.0 |
| 2015 | 208,232 | 3,251 | 2,425 | 16.0 |
| 2016 | 210,822 | 3,297 | 2,399 | 15.6 |
| 2017 | 212,544 | 3,478 | 2,468 | 16.4 |
| 2018 | 213,764 | 3,514 | 2,531 | 16.0 |
| 2019 | 214,134 | 3,682 | 2,616 | 17.0 |
| 2020 | 214,080 | 2,376 | 1,774 | 11.0 |
| 2021 | 212,882 | 2,542 | 2,003 | 11.9 |

Offense-type splits are provided (violent felony, other felony, misdemeanor, violation of
probation, status, other CINS). **Compared to Dallas's 58.009 extract this is much
thinner:**

| | Dallas (58.009) | Tarrant (TJJD county file) |
|---|---|---|
| Granularity | Monthly | Annual |
| Category cuts | Age, Disposition, Gender, Offense Category, Offense Type, Race/Ethnicity | Offense Type only |
| Geography | ZIP-level (choropleth) | County total only |
| Currency | Through 2023 | **Ends 2021** |

The page degrades rather than faking parity: tabs are driven by the payload's categories,
the ZIP choropleth is hidden when no ZIP records exist, and the time axis is labelled by
year. The dataset is also **stale by five years** — TJJD's statewide file has not been
extended past FY2021.

**To reach Dallas parity:** a Family Code 58.009 data request to Tarrant County Juvenile
Services, which is how the Dallas extract was obtained. Tarrant County Juvenile Services
also publishes annual reports as PDFs
(`tarrantcountytx.gov/en/juvenile-services/reports`), which could seed a manual series but
are not machine-readable.

---

## Not available

### Arrests — no dataset

Fort Worth publishes no arrest data. The full open-data catalogue is 25 datasets (verified
by paging the Hub search API); none is arrest-level. The Arrest Demographics page is
therefore hidden from Tarrant's nav and 404s on direct navigation, since every chart on it
is arrest-based.

### Calls for service — no dataset

No CFS dataset exists. There is an internal-facing "FWPD Incident Response Dashboard" web
app on the portal, but no underlying tabular layer is published. Dallas's CFS came from a
public-records request; Tarrant would need the same.

### 311 / MyFW service requests — no dataset

Fort Worth runs 311 through the MyFW app and City Call Center for animal control, code
enforcement, parking, waste, streets and traffic — but **publishes none of it as open
data**.

The nearest substitute is **CFW Code Violations** (79,536 records, 2007-02-26 through
2026-09-04), which is code-compliance case data, not service requests. Its 12 complaint
types are: Animal, Health Hazard, High Grass/Weeds, Homeless Camp Abatement, Multi-Family,
Property Maintenance, Recurring Mow Ticket, Solid Waste Violation, Substandard Building,
Vehicle, Zoning-Commercial, Zoning-Residential.

Two reasons this was not wired in as the 311 domain:

1. It is not comparable to Dallas 311. Dallas's dataset is resident-initiated service
   requests across all departments; this is enforcement cases from one department, and
   explicitly excludes complaints ("Data is inclusive of actual cases and does not include
   complaints").
2. **It carries employee PII** — `Code_Officer` (full name) and `Code_Officer_PhoneNo` on
   every row. Any use of this dataset must drop both fields before publication, per
   `ahd-standards/data-security.md`.

The CFS and 311 pages are scaffolded and routed, rendering a notice that states why they
are empty.

---

## Coverage caveat worth raising with LSJA

**The offense data is Fort Worth city, not Tarrant County.** Fort Worth is the county's
largest city but well short of a majority of its population, and no other Tarrant
jurisdiction publishes crime incidents:

- **Arlington** (second-largest city in the county) — its open data portal was enumerated
  in full: 97 items, including Police Districts, Police Stations, Code Complaints, Health
  Requests for Service, and Outstanding Arrest Warrants, but **no crime incident dataset**.
- **Tarrant County Open Data Portal** (`data-tarrantcounty.opendata.arcgis.com`) — the
  search API returns 2 datasets: Sub Courthouses and School Districts. No public safety
  tabular data.
- **Tarrant County Crime Map** (`gisit.tarrantcounty.com/CMPortal`) — a public-facing
  ArcGIS JS 4.4 viewer with Offenses, Service Calls and Sex Offender layers. It is built
  for 7/14/30-day lookback windows and exposes no documented bulk endpoint; its service
  URLs are not in the page source. Not a viable bulk source without asking the county for
  the underlying service.

By contrast, school discipline and youth-court referrals **are** genuinely countywide.
So the Tarrant jurisdiction mixes a city-scoped offense domain with two county-scoped
domains. Either the label needs qualifying on the offense pages, or Fort Worth should be
its own jurisdiction and Tarrant reserved for the countywide domains.

---

## Endpoint reference

| What | Endpoint |
|---|---|
| FW crime (table) | `https://services5.arcgis.com/3ddLCBXe1bRt7mzj/arcgis/rest/services/CFW_Open_Data_Police_Crime_Data_Table_view/FeatureServer/0` |
| FW crime (points) | `https://mapit.fortworthtexas.gov/ags/rest/services/CIVIC/Crime_Data/MapServer/0` |
| FW code violations | `https://services5.arcgis.com/3ddLCBXe1bRt7mzj/arcgis/rest/services/CFW_Open_Data_Code_Violations_Table_view/FeatureServer/0` |
| FW hub catalogue | `https://data.fortworthtexas.gov/api/search/v1/collections/all/items?limit=100` |
| TJJD county referrals | `https://data.texas.gov/resource/54dk-5ghb.json?county=TARRANT` |
| Arlington hub catalogue | `https://opendata.arlingtontx.gov/api/search/v1/collections/all/items?limit=100` |

## Recommended next steps

1. Decide the scope question above — Fort Worth as its own jurisdiction, or a qualifier on
   Tarrant's offense pages.
2. Family Code 58.009 request to Tarrant County Juvenile Services, for youth-court parity
   and to replace the TJJD file that ends in 2021.
3. Public-records request to Fort Worth PD for calls for service, and for a clearance or
   disposition field on the crime extract — the latter is what restores the youth
   clearance KPIs.
4. Ask Fort Worth Customer Care whether MyFW/311 service requests can be published or
   provided; the city clearly holds the data.
