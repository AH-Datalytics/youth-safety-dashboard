# Dallas Youth Safety Dashboard — Complete Data Model Documentation

> **Extracted**: 2026-02-28 from Power BI Desktop instance
> **Model**: Import mode, Compatibility Level 1600, Culture en-US
> **Purpose**: Document all ETL, tables, relationships, measures, and data sources for migration to GitHub Actions + Next.js/Vercel

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Sources](#2-data-sources)
3. [Incremental Refresh Parameters](#3-incremental-refresh-parameters)
4. [Fact Tables (7)](#4-fact-tables)
5. [Dimension Tables (4)](#5-dimension-tables)
6. [Crosswalk Tables (5)](#6-crosswalk-tables)
7. [Sort Tables (6)](#7-sort-tables)
8. [Utility Tables (2)](#8-utility-tables)
9. [DAX Measures (5)](#9-dax-measures)
10. [Relationships (53)](#10-relationships)
11. [Named Expressions / Power Query (30)](#11-named-expressions)
12. [Row Counts & Date Coverage](#12-row-counts--date-coverage)
13. [Migration Notes](#13-migration-notes)

---

## 1. Architecture Overview

### Model Statistics
| Metric | Count |
|--------|-------|
| Real tables | 24 |
| Auto-generated LocalDateTables | 34 |
| Relationships | 53 |
| DAX Measures | 5 |
| Named Expressions (Power Query) | 30 |
| Total Columns | 464 |
| Query Groups | 3 ("Disciplinary Data", "OData", "Calls - Original Data") |

### Star Schema Design
```
                    ┌─────────────┐
                    │    DATE     │ ← CALENDAR(MIN(Incidents[Date Only]), MAX(...))
                    │  (3,294)    │
                    └──────┬──────┘
                           │ Many:One
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   Incidents          Arrests          Requests 311
   (1,176,347)         (241*)           (121*)
        │                                     │
        │              ┌─────────────┐        │
        │              │   DATE2     │        │
        │              │  (5,845)    │        │
        │              └──────┬──────┘        │
        │                     │               │
        │             Calls for Service       │
        │              (4,807,665)            │
        │                     │               │
   XWalk-NIBRS    XWALK-Disposition    SORT-311 Priority
   XWalk-Case     XWALK-Problem        SORT-Weekday
   Status         XWALK-CallPriority   SORT-Month
                                       SORT-Age

   Campus Discipline Data    TJJD Data       TJJD Zip Code
      (154,587)              (3,400)            (738)
           │
     XWalk-Discipline
     Campus Enrollment
```
*Arrests and 311 counts are low because Desktop preview only loaded the incremental window (Jan 2026). Full Service dataset would be much larger.

---

## 2. Data Sources

### 2.1 Dallas Open Data (Socrata API)
| Dataset | Resource ID | Endpoint | Incremental Field |
|---------|------------|----------|-------------------|
| Police Incidents | `qv6i-rri7` | `dallasopendata.com/resource/qv6i-rri7.json` | `edate` (offense entered date) |
| Arrests | `sdr7-6v3j` | `dallasopendata.com/resource/sdr7-6v3j.json` | `ararrestdate` |
| 311 Service Requests | `gc4d-8a49` | `dallasopendata.com/resource/gc4d-8a49.json` | `created_date` |

**OData endpoints** (legacy, used in header-switch queries):
- `https://www.dallasopendata.com/OData.svc/qv6i-rri7`
- `https://www.dallasopendata.com/OData.svc/sdr7-6v3j`
- `https://www.dallasopendata.com/OData.svc/gc4d-8a49`

### 2.2 SharePoint (AH Datalytics OneDrive)
Base URL: `https://ahdatalytics-my.sharepoint.com/personal/bhorwitz_ahdatalytics_com/Documents/Clients/NLC/Dallas/PowerBI/`

| File | Used By | Format |
|------|---------|--------|
| `Police_Incidents_2017_2025.parquet` | Incidents 2017-2025 pre-load | Parquet |
| `Calls for Service.xlsx` | Call 2017–2025 (9 sheets) | Excel |
| `Redacted Youth Justice Data.xlsx` | TJJD Data + TJJD Zip Code | Excel |
| `XWalk - NIBRS.xlsx` | XWalk - NIBRS | Excel |
| `XWalk - Discipline.xlsx` | XWalk - Discipline | Excel |
| `XWALK - Call Type.xlsx` | XWALK - Disposition + XWALK - Reported Problem | Excel |
| `Directory2024.csv` | Directory (TEA school lookup) | CSV |
| `CAMPUS_summary_18.csv` through `CAMPUS_summary_24.csv` | Campus Discipline Data + Campus Enrollment | CSV |

### 2.3 Embedded Data (Base64 in Power Query)
The following tables store data directly in the M expression as compressed Base64:
- SORT - Weekday, SORT - Age Groupings, SORT - Case Status, Sort - Young Adult
- SORT - 311 Priority, SORT - Month, XWALK - Call Priority

### 2.4 DAX Calculated Tables
- **DATE**: `CALENDAR(MIN(Incidents[Date Only]), MAX(Incidents[Date Only]))`
- **DATE2**: `CALENDAR(MIN('Calls for Service'[Date of Call]), MAX('Calls for Service'[Date of Call]))`
- **AAAMeasures**: `Row("Column", BLANK())` — measures-only container
- **Parameter**: Field parameter for dynamic axis switching

---

## 3. Incremental Refresh Parameters

```
RangeStart = #datetime(2026, 1, 1, 0, 0, 0)  [IsParameterQuery, DateTime, Required]
RangeEnd   = #datetime(2026, 1, 9, 0, 0, 0)  [IsParameterQuery, DateTime, Required]
```

### Incremental Refresh Configuration
| Table | Rolling Window | Incremental Window | Hard Floor | Date Field |
|-------|---------------|-------------------|------------|------------|
| Incidents - Socrata - Live | 5 years | 30 days | 2026-01-01 | edate |
| Arrests | 15 years | 30 days | 2017-01-01 | ararrestdate |
| Requests 311 | 5 years | 30 days | 2017-01-01 | created_date |

### Pagination Pattern (Socrata JSON)
All three live tables use `List.Generate` with `$offset`/`$limit` for pagination:
- Incidents: page size 5,000
- Arrests: page size 10,000
- 311 Requests: page size 5,000

---

## 4. Fact Tables

### 4.1 Incidents (1,176,347 rows)
**Date range**: 2017-01-01 to 2026-01-07

**Source**: `Table.Combine({#"Incidents 2017-2025 pre-load", #"Incidents - Socrata - Live"})`

Two-part loading:
1. **Historical** (`Incidents 2017-2025 pre-load`): Parquet file from SharePoint — `Police_Incidents_2017_2025.parquet`
2. **Live** (`Incidents - Socrata - Live`): Socrata JSON API with incremental refresh

**Columns (18 used after Measure Killer cleanup):**
| Column | Type | Source | Notes |
|--------|------|--------|-------|
| Incident Number | text | sourceColumn | Primary identifier (renamed from "Incident Number w/year") |
| Date1 of Occurrence | date | sourceColumn | First occurrence date |
| Date2 of Occurrence | datetime | sourceColumn | Second occurrence date |
| Date of Report | datetime | sourceColumn | |
| Date incident created | datetime | sourceColumn | |
| Call Received Date Time | datetime | sourceColumn | |
| Call Date Time | datetime | sourceColumn | |
| Call Cleared Date Time | datetime | sourceColumn | |
| Call Dispatch Date Time | datetime | sourceColumn | |
| UCR Disposition | text | sourceColumn | Maps to Case Status |
| Gang Related Offense | text | sourceColumn | |
| Drug Related Istevencident | text | sourceColumn | Note: typo "Istevencident" in source |
| NIBRS Code | text | sourceColumn | Links to XWalk - NIBRS |
| NIBRS Type | text | sourceColumn | |
| Hour | time | sourceColumn | Start-of-hour from Time1 of Occurrence |
| Date Only | date | sourceColumn | Copy of Date1 — links to DATE dimension |
| Latitude | number | calculated | Parsed from geocoded_column |
| Longitude | number | calculated | Parsed from geocoded_column |

**Calculated Column — Case Status:**
```dax
SWITCH(
    Incidents[UCR Disposition],
    "CBA", "Cleared by Arrest",
    "CBE", "Cleared by Exceptional Means",
    "C",   "Cleared",
    "O",   "Open",
    "CLR", "Cleared",
    "SUS", "Suspended",
    "P",   "Pending",
    "UNF", "Unfounded",
    "N",   "Open",
    "D",   "Declined",
    "I",   "Inactive",
    "Unknown"
)
```

---

### 4.2 Incidents - Socrata - Live (1,653 rows)
**Date range**: 2025-01-01 to 2026-01-07

**Source**: Socrata JSON API — `https://www.dallasopendata.com/resource/qv6i-rri7.json`

**M Code Pattern** (paginated JSON fetcher):
```
BaseUrl  = "https://www.dallasopendata.com/resource/qv6i-rri7.json"
PageSize = 5000
Floor    = #datetime(2026, 1, 1, 0, 0, 0)  -- hard floor

SelectList = "callreceived,date2_of_occurrence_2,callorgdate,date1,time1,
              incidentnum,ucr_disp,nibrs_code,callcleared,gang,drug,
              edate,reporteddate,calldispatched,nibrs_type,geocoded_column"

$where = "edate >= '{FloorDT}' AND edate >= '{RangeStart}' AND edate < '{RangeEnd}'"
$order = "edate"
```

**Geo parsing handles 4 formats:**
1. Record with `coordinates` list `[lon, lat]`
2. Record with `latitude`/`longitude` fields
3. Text `"(lat, long)"`
4. Text `"POINT(lon lat)"`

**Schema stabilization**: Adds missing columns as nulls when API response changes.

---

### 4.3 Arrests (241 rows — Desktop preview only)
**Date range**: 2026-01-01 to 2026-01-08

**Source**: `OData - Arrest - New` named expression → Socrata JSON API `sdr7-6v3j.json`

**Selected fields**: incidentnum, arrestnumber, ararrestdate, age, ageatarresttime, race, sex

**Transformations:**
- Race: H→"Hispanic or Latino", NH→"Native Hawaiian/Pacific Islander", ""→"Unknown", null→"Unknown"
- Sex: ""→"Unknown", null→"Unknown"

**Calculated Columns:**
```dax
-- Age No Blank
IF(Arrests[AgeAtArrestTime] = BLANK(), Arrests[Age], Arrests[AgeAtArrestTime])

-- Age Group (Young Adult focus)
SWITCH(TRUE(),
    Arrests[Age No Blank] >= 18 && Arrests[Age No Blank] <= 24, "Young Adult (18-24)",
    Arrests[Age No Blank] >= 25, "Adult (25+)",
    BLANK()
)

-- Age Group Broad
SWITCH(TRUE(),
    Arrests[Age No Blank] >= 18 && Arrests[Age No Blank] <= 24, "18-24",
    Arrests[Age No Blank] >= 25 && Arrests[Age No Blank] <= 40, "25-40",
    Arrests[Age No Blank] >= 41 && Arrests[Age No Blank] <= 55, "41-55",
    Arrests[Age No Blank] >= 56 && Arrests[Age No Blank] <= 70, "56-70",
    Arrests[Age No Blank] > 70, "Over 70",
    BLANK()
)
```

---

### 4.4 Requests 311 (121 rows — Desktop preview only)
**Date range**: 2026-01-01 to 2026-01-08

**Source**: `OData - 311 - Live - TEST` named expression → Socrata JSON API `gc4d-8a49.json`

**Selected fields**: unique_key, overall_service_request_due_date, service_request_type, created_date, department, update_date, closed_date, lat_location, priority

**Transformations:**
- Service Request Type split into Type + Code (split on " - ")
- Department fix: "Environmental Quality" → "Environmental Quality & Sustainability"
- Lat/Long parsing from Socrata geo format (same robust parser as Incidents)
- Created Date Only extracted from Created Date

**Calculated Column — Priority Groups:**
```dax
SWITCH(
    'Requests 311'[Priority],
    "MCC", "Other",
    "CMO", "Other",
    BLANK(), "Other",
    'Requests 311'[Priority]
)
```

---

### 4.5 Calls for Service (4,807,665 rows)
**Date range**: 2009-08-31 to 2025-08-31
**`excludeFromModelRefresh`**: false (but data is manually updated)

**Source**: `Table.Combine({Call 2022, Call 2017, Call 2024, Call 2023, Call 2018, Call 2019, Call 2020, Call 2021, Call 2025})`
- All from sheets in `Calls for Service.xlsx` on SharePoint
- Filtered: `Time_PhonePickUp < 2025-09-01`

**Columns (21):**
| Column | Type | Notes |
|--------|------|-------|
| Master_Incident_Number | text | Primary key for DISTINCTCOUNT |
| Problem | text | Links to XWALK - Reported Problem |
| Priority_Number | int64 | Links to XWALK - Call Priority |
| Response_Date | datetime | |
| Time_PhonePickUp | datetime | |
| Time_First_Unit_Assigned | datetime | |
| Time_First_Unit_Arrived | datetime | |
| Time_CallClosed | datetime | |
| Call_Disposition | text | Links to XWALK - Disposition |
| Address | text | |
| MDivision | text | |
| MSector | int64 | |
| MBeat | int64 | |
| MRA | int64 | |
| City | text | |
| Postal_Code | int64 | |
| Date of Call | date | Calculated: `DateTime.Date(Time_PhonePickUp)` — links to DATE2 |

**Calculated Columns:**
```dax
-- Response Time (minutes)
DATEDIFF('Calls for Service'[Time_First_Unit_Assigned],
         'Calls for Service'[Time_First_Unit_Arrived], MINUTE)

-- Time Spent (minutes)
DATEDIFF('Calls for Service'[Time_First_Unit_Assigned],
         'Calls for Service'[Time_CallClosed], MINUTE)

-- Call Prioroty (sic — typo in original)
SWITCH(
    'Calls for Service'[Priority_Number],
    1, "Emergency",
    2, "Urgent",
    3, "General Service",
    4, "Non-Critical",
    BLANK()
)
```

---

### 4.6 Campus Discipline Data (154,587 rows)
**School years**: 2017-2018 to 2023-2024
**`excludeFromModelRefresh`**: true (static TEA data)

**Source**: `Table.Combine({CAMPUS_summary_18..CAMPUS_summary_24})` joined with `Directory`

**ETL Steps:**
1. Combine 7 yearly CAMPUS summary CSVs from SharePoint
2. Each CSV: skip 6 header rows, promote headers, rename columns, split "CAMPUS NAME AND NUMBER" by position (first 10 chars = name, rest = number)
3. Replace -999 sentinel with null in VALUE
4. Left join to Directory on CAMPUS/School Number
5. Filter to County Name = "DALLAS COUNTY"
6. Exclude non-Dallas cities

**Columns (22):**
School Year, CAMPUS, HEADING NAME, VALUE, School Name, Instruction Type, Magnet Status, Grade Range, Address, Charter Status, AGG_LEVEL, REGION, District, CAMPUS NAME, CAMPUS NUMBER, SECTION, HEADING, County Name, Charter Type, School Status, Enrollment, YEAR

---

### 4.7 TJJD Data (3,400 rows)
**Years**: 2020-2025
**`excludeFromModelRefresh`**: true (static)

**Source**: SharePoint Excel — `Redacted Youth Justice Data.xlsx`

**ETL**: Wide-to-long unpivot of monthly columns (January-2020 through December-2023)

**Columns (7):**
| Column | Type |
|--------|------|
| Category | text |
| Description | text |
| Month-Year | text |
| Total | int64 |
| Year | text |
| Month # | int64 |
| Month | text |

---

## 5. Dimension Tables

### 5.1 DATE (3,294 rows) — Calculated Table
```dax
CALENDAR(MIN(Incidents[Date Only]), MAX(Incidents[Date Only]))
```

| Column | Expression | Sort By |
|--------|-----------|---------|
| Date | sourceColumn | — |
| WD_Num | `WEEKDAY('Date'[Date])` | — |
| Weekday | `SWITCH('Date'[WD_Num], 1,"SUN", 2,"MON", ...)` | SORT - Weekday |
| Mon_Num | `MONTH('Date'[Date])` | — |
| Month Abb | `SWITCH('DATE'[Mon_Num], 1,"JAN", ...)` | Mon_Num |
| IsOnOrBeforeToday | `IF('DATE'[Date] <= TODAY(), 1, 0)` | — |

### 5.2 DATE2 (5,845 rows) — Calculated Table
```dax
CALENDAR(MIN('Calls for Service'[Date of Call]), MAX('Calls for Service'[Date of Call]))
```
Same pattern as DATE but derived from Calls for Service date range.

| Column | Expression |
|--------|-----------|
| Date | sourceColumn |
| Mon_Num | `MONTH(DATE2[Date])` |
| Month Abb | `SWITCH(...)` |
| WD_Num | `WEEKDAY('Date2'[Date])` |
| Weekday | `SWITCH(...)` |

### 5.3 Campus Enrollment (10,915 rows)
**`excludeFromModelRefresh`**: true

**Source**: Same 7 CAMPUS summaries combined + Directory join, but keeps only CAMPUS, CAMPUS NAME, and School Enrollment — then deduplicates.

| Column | Type |
|--------|------|
| CAMPUS | int64 |
| CAMPUS NAME | text |
| School Enrollment as of Oct 2024 | int64 |

### 5.4 TJJD Zip Code (738 rows)
**`excludeFromModelRefresh`**: true

**Source**: `Redacted Youth Justice Data.xlsx`, sheet "Zip Code"

**ETL**: Unpivot year columns (2020-2023), filter to Dallas-area zips (75000-75300), exclude 5 specific zips (75005, 75022, 75129, 75200, 75280), remove zero-value rows.

| Column | Type | Notes |
|--------|------|-------|
| ZIP Code | int64 | dataCategory: PostalCode |
| Year | text | |
| Value | int64 | summarizeBy: sum |

---

## 6. Crosswalk Tables

### 6.1 XWalk - NIBRS (84 rows)
**Source**: SharePoint Excel — `XWalk - NIBRS.xlsx`

| Column | Type |
|--------|------|
| Crime Against | text |
| Offense | text |
| Offense Description | text |
| NIBRS Code | text |
| NIBRS Code & Offense Description | text |

### 6.2 XWalk - Discipline (107 rows)
**Source**: SharePoint Excel — `XWalk - Discipline.xlsx`

| Column | Type |
|--------|------|
| HEADING NAME | text |
| Type | text |
| Description | text |
| Type_1 | text |

### 6.3 XWALK - Disposition (71 rows)
**Source**: SharePoint Excel — `XWALK - Call Type.xlsx`, sheet "Disposition"

| Column | Type |
|--------|------|
| Disposition | text |
| Dipsosition Groups | text | ← typo in source |

### 6.4 XWALK - Reported Problem (105 rows)
**Source**: SharePoint Excel — `XWALK - Call Type.xlsx`, sheet "Problem"

| Column | Type |
|--------|------|
| Problem | text |
| Description - No Code | text |
| Category | text |
| Sub-Category | text |

### 6.5 XWALK - Call Priority (4 rows)
**Source**: Embedded Base64 data

| Proirity Number | Call Priority |
|-----------------|--------------|
| 1 | Emergency |
| 2 | Urgent |
| 3 | General Service |
| 4 | Non-Critical |

Note: "Proirity" typo in source column name.

---

## 7. Sort Tables

All sort tables are `excludeFromModelRefresh: true` and use embedded Base64 data.

### 7.1 SORT - Weekday (7 rows)
| Weekday | SORT |
|---------|------|
| SUN | 1 |
| MON | 2 |
| ... | ... |
| SAT | 7 |

### 7.2 SORT - Age Groupings (6 rows)
Values: 18-24, 25-40, 41-55, 56-70, Over 70 + BLANK

### 7.3 SORT - Case Status (6 rows)
Values: Cleared by Arrest, Cleared by Exceptional Means, Cleared, Open, Suspended, Unknown

### 7.4 Sort - Young Adult (3 rows)
Values: Young Adult (18-24), Adult (25+), BLANK

### 7.5 SORT - 311 Priority (6 rows)
Values: Emergency, Urgent, General Service, Non-Critical, Other, BLANK

### 7.6 SORT - Month (12 rows)
| Month | SORT | Month_Abb | SORT - Abb |
|-------|------|-----------|------------|
| January | 1 | JAN | ... |
| February | 2 | FEB | ... |
| ... | ... | ... | ... |

---

## 8. Utility Tables

### 8.1 AAAMeasures (1 row) — Calculated Table
```dax
Row("Column", BLANK())
```
Container table for 3 measures (# of Offenses, # of Arrests, # of 311 Requests).

### 8.2 Parameter (4 rows) — Field Parameter
```dax
{
    ("Young Adult/Adult", NAMEOF('Sort - Young Adult'[Youth?]), 0),
    ("Age Groupings", NAMEOF('SORT - Age Groupings'[Age Group Broad]), 1),
    ("Sex", NAMEOF('Arrests'[Sex]), 2),
    ("Race", NAMEOF('Arrests'[Race]), 3)
}
```
Enables dynamic axis switching in visuals — users can toggle between demographic dimensions via a slicer.

---

## 9. DAX Measures

| Measure | Table | Expression | Format |
|---------|-------|-----------|--------|
| # of Offenses | AAAMeasures | `COUNT(Incidents[Incident Number])` | #,0 |
| # of Arrests | AAAMeasures | `COUNT(Arrests[ArrestNumber])` | #,0 |
| # of 311 Requests | AAAMeasures | `DISTINCTCOUNTNOBLANK('Requests 311'[Unique Key])` | #,0 |
| # of Calls for Service | Calls for Service | `DISTINCTCOUNTNOBLANK('Calls for Service'[Master_Incident_Number])` | #,0 |
| total tjjd referrals | TJJD Zip Code | `SUM('TJJD Zip Code'[Value])` | 0 |

---

## 10. Relationships (53 total)

### Key Business Relationships (non-LocalDateTable)

| From Table | From Column | To Table | To Column | Cardinality | Cross-Filter |
|-----------|------------|---------|----------|-------------|-------------|
| Incidents | Date Only | DATE | Date | Many:One | Single |
| Incidents | NIBRS Code | XWalk - NIBRS | NIBRS Code | Many:One | Single |
| Incidents | Case Status | SORT - Case Status | Case Status | Many:One | Single |
| Arrests | Arrest Date Only | DATE | Date | Many:One | Single |
| Arrests | Age Group Broad | SORT - Age Groupings | Age Group Broad | Many:One | Single |
| Arrests | Age Group | Sort - Young Adult | Youth? | Many:One | Single |
| Requests 311 | Created Date Only | DATE | Date | Many:One | Single |
| Requests 311 | Priority Groups | SORT - 311 Priority | Priority | Many:One | Single |
| Calls for Service | Date of Call | DATE2 | Date | Many:One | Single |
| Calls for Service | Problem | XWALK - Reported Problem | Problem | **Many:Many** | **BothDirections** |
| Calls for Service | Priority_Number | XWALK - Call Priority | Proirity Number | Many:One | **BothDirections** |
| Calls for Service | Call_Disposition | XWALK - Disposition | Disposition | Many:One | **BothDirections** |
| Campus Discipline Data | HEADING NAME | XWalk - Discipline | HEADING NAME | Many:One | Single |
| Campus Enrollment | CAMPUS | Campus Discipline Data | CAMPUS | **Many:Many** | **BothDirections** |
| TJJD Zip Code | Year | TJJD Data | Year | **Many:Many** | **BothDirections** |
| TJJD Data | Month | SORT - Month | Month | Many:One | Single |
| DATE | Weekday | SORT - Weekday | Weekday | Many:One | Single |
| DATE | Mon_Num | SORT - Month | SORT | Many:One | Single |
| DATE2 | Weekday | SORT - Weekday | Weekday | Many:One | Single |
| DATE2 | Month Abb | SORT - Month | Month_Abb | Many:One | Single |
| Parameter | Parameter Fields | Sort - Young Adult | Youth? | Many:One | Single |
| Parameter | Parameter Fields | SORT - Age Groupings | Age Group Broad | Many:One | Single |
| Parameter | Parameter Fields | Arrests | Sex | Many:One | Single |
| Parameter | Parameter Fields | Arrests | Race | Many:One | Single |

*Plus ~29 auto-generated LocalDateTable relationships for datetime columns.*

### Important: Many:Many + BothDirections Relationships
These are used for Calls for Service crosswalks (Problem, Priority, Disposition) and the Campus Enrollment ↔ Discipline Data + TJJD Zip ↔ TJJD Data connections. In the web migration, these will need to be handled with careful join logic.

---

## 11. Named Expressions (Power Query)

### 11.1 Incremental Refresh Parameters
```m
RangeStart = #datetime(2026, 1, 1, 0, 0, 0) meta [IsParameterQuery=true, Type="DateTime", IsParameterQueryRequired=true]
RangeEnd   = #datetime(2026, 1, 9, 0, 0, 0) meta [IsParameterQuery=true, Type="DateTime", IsParameterQueryRequired=true]
```

### 11.2 Query Group: OData (9 expressions)

#### OData - Incident
Simple OData.Feed connector — used in `Original Incident query` header-switch pattern.
```m
OData.Feed("https://www.dallasopendata.com/OData.svc/qv6i-rri7", null, [Implementation="2.0"])
```

#### OData - Incident Header Switch
Embedded Base64 table of 86 column headers. Combined with `OData - Incident` and promoted to headers. This is a workaround for Socrata's OData column naming.

#### OData - Arrests / OData - 311
Similar simple OData.Feed connectors for arrests and 311 datasets.

#### OData - Arrest Headers / OData - 311 Headers
Embedded header tables for Arrests (65 columns) and 311 (17 columns).

#### OData - Arrest - New (Live Arrests fetcher)
Paginated Socrata JSON fetcher with incremental refresh:
- BaseUrl: `https://www.dallasopendata.com/resource/sdr7-6v3j.json`
- PageSize: 10,000
- Hard floor: 2017-01-01
- Selects: incidentnum, arrestnumber, ararrestdate, age, ageatarresttime, race, sex
- Race/Sex cleanup: H→Hispanic, NH→Native Hawaiian, ""→Unknown, null→Unknown

#### OData - 311 - Live - TEST (Live 311 fetcher)
Paginated Socrata JSON fetcher with incremental refresh:
- BaseUrl: `https://www.dallasopendata.com/resource/gc4d-8a49.json`
- PageSize: 5,000
- Hard floor: 2017-01-01
- Selects: unique_key, overall_service_request_due_date, service_request_type, created_date, department, update_date, closed_date, lat_location, priority
- Splits Service Request Type into Type + Code
- Robust lat/lon parser (handles record, list, text formats)
- Department fix: "Environmental Quality" → "Environmental Quality & Sustainability"

#### Incidents 2017-2025 pre-load
Reads Parquet file from SharePoint for fast historical incident loading:
```m
Site = "https://ahdatalytics-my.sharepoint.com/personal/bhorwitz_ahdatalytics_com"
FileName = "Police_Incidents_2017_2025.parquet"
-- SharePoint.Files → filter → Binary.Buffer → Parquet.Document
```

#### Original Incident query
Full legacy incident processing pipeline:
1. Combine OData Header Switch + OData Incident feed
2. Promote headers, remove extra columns (87-93)
3. Type all 86 columns
4. Extract dates, remove officer/admin columns
5. Parse lat/lon from "Full Location" field: `Text.BetweenDelimiters("(", ")")` → split by space
6. Add "Date Only" and "Hour" columns
7. Filter: Date Only >= 2017-01-01
8. Final column selection (Measure Killer): 18 columns kept

#### Original 311 query
Full legacy 311 processing pipeline:
1. Combine OData 311 Headers + OData 311 feed
2. Split Service Request Type by " - " → Type + Code
3. Parse lat/lon from text: remove parens, split by comma
4. Add "Created Date Only"
5. Department fix
6. Final column selection: 11 columns kept

### 11.3 Query Group: Calls - Original Data (9 expressions)

All Call 2017–2025 expressions follow the same pattern:
```m
let
    Source = Excel.Workbook(Web.Contents(
        "https://ahdatalytics-my.sharepoint.com/.../Calls%20for%20Service.xlsx"), null, true),
    Sheet = Source{[Item="Call YYYY", Kind="Sheet"]}[Data],
    Headers = Table.PromoteHeaders(Sheet, [PromoteAllScalars=true])
in
    Headers
```
- Single Excel workbook with 9 yearly sheets
- Call 2022 additionally applies type transforms (Master_Incident_Number as text, etc.)

### 11.4 Query Group: Disciplinary Data (8 expressions)

#### Directory
TEA school directory from CSV:
```m
Source = Csv.Document(Web.Contents(".../Directory2024.csv"), [Delimiter=",", Columns=41, Encoding=1252])
-- 41 columns: County, District, School info, enrollment
-- Removes single-quote from numeric ID columns
-- School Number converted to Int64
```

#### CAMPUS_summary_18 through CAMPUS_summary_24 (7 expressions)
TEA campus discipline summary CSVs, each following this pattern:
1. Load CSV from SharePoint (Columns=10 or 11, Encoding=1252)
2. Skip 6 header rows
3. Promote headers
4. Rename value column to "VALUE" (from YR18, YR19, etc.)
5. Split "CAMPUS NAME AND NUMBER" by position (first 10 chars = name)
6. Trim and clean campus name
7. Some add YEAR column manually (e.g., CAMPUS_summary_21 adds "2020-2021", CAMPUS_summary_24 adds "2023-2024")

---

## 12. Row Counts & Date Coverage

### Row Counts
| Table | Rows | Notes |
|-------|------|-------|
| Calls for Service | 4,807,665 | Largest table |
| Incidents | 1,176,347 | Combined pre-load + live |
| Campus Discipline Data | 154,587 | 7 school years |
| Campus Enrollment | 10,915 | Deduplicated campus list |
| DATE2 | 5,845 | CFS date range |
| TJJD Data | 3,400 | 4 years monthly |
| DATE | 3,294 | Incidents date range |
| Incidents - Socrata - Live | 1,653 | Incremental window only |
| TJJD Zip Code | 738 | Dallas-area zips |
| Arrests | 241 | Incremental window only |
| Requests 311 | 121 | Incremental window only |
| XWalk - Discipline | 107 |
| XWALK - Reported Problem | 105 |
| XWalk - NIBRS | 84 |
| XWALK - Disposition | 71 |
| SORT - Month | 12 |
| SORT - Weekday | 7 |
| SORT - Age Groupings | 6 |
| SORT - Case Status | 6 |
| SORT - 311 Priority | 6 |
| XWALK - Call Priority | 4 |
| Parameter | 4 |
| Sort - Young Adult | 3 |
| AAAMeasures | 1 |

### Date Coverage
| Table | Min Date | Max Date |
|-------|----------|----------|
| Calls for Service | 2009-08-31 | 2025-08-31 |
| Incidents | 2017-01-01 | 2026-01-07 |
| Campus Discipline Data | 2017-2018 SY | 2023-2024 SY |
| TJJD Data | Jan 2020 | Dec 2023 |
| TJJD Zip Code | 2020 | 2023 |
| Arrests | 2026-01-01 | 2026-01-08 (incremental only) |
| Requests 311 | 2026-01-01 | 2026-01-08 (incremental only) |

---

## 13. Migration Notes

### 13.1 Data Fetching for GitHub Actions

**Socrata API (3 tables — Incidents, Arrests, 311)**
- Use Socrata's SODA2 JSON API directly (same endpoints as PBI)
- Paginate with `$offset`/`$limit` (same pattern as M code)
- Filter by date range with `$where`
- No authentication required — public datasets
- Consider: fetch full historical data once, then daily incremental updates

**Calls for Service**
- Currently loaded from SharePoint Excel (9 sheets)
- Migration option: Convert to CSV/Parquet, store in repo or S3
- Or: If city provides API access, switch to API fetching
- ~4.8M rows — need efficient storage (Parquet recommended)

**Campus Discipline + TJJD**
- Static data (TEA publishes annually, TJJD data is historical)
- Download once, store as CSV/Parquet in repo
- Update annually when new TEA data releases

**Crosswalk/Sort tables**
- Small, static — store as JSON or CSV in repo
- Decode Base64 embedded data once and save

### 13.2 ETL Pipeline Design

```
GitHub Actions (scheduled daily)
├── fetch_socrata.py
│   ├── Incidents (qv6i-rri7) — incremental by edate
│   ├── Arrests (sdr7-6v3j) — incremental by ararrestdate
│   └── 311 Requests (gc4d-8a49) — incremental by created_date
├── process_incidents.py
│   ├── Combine historical parquet + new API data
│   ├── Parse geo columns
│   ├── Derive: Case Status, Hour, Date Only
│   └── Output: incidents.json (or compact format)
├── process_arrests.py
│   ├── Race/Sex cleanup
│   ├── Derive: Age No Blank, Age Group, Age Group Broad, Arrest Date Only
│   └── Output: arrests.json
├── process_311.py
│   ├── Split Service Request Type → Type + Code
│   ├── Parse lat/lon
│   ├── Department name fix
│   ├── Derive: Priority Groups, Created Date Only
│   └── Output: requests_311.json
├── process_calls.py
│   ├── Combine yearly sheets
│   ├── Derive: Response Time, Time Spent, Call Priority label, Date of Call
│   └── Output: calls.json (or pre-aggregated summaries)
├── static_data/ (checked into repo)
│   ├── campus_discipline.csv
│   ├── tjjd_data.csv
│   ├── tjjd_zip_code.csv
│   ├── crosswalks/ (nibrs, discipline, disposition, problem, priority)
│   └── sort_tables/ (weekday, month, age, case_status, priority, young_adult)
└── output/ → deploy to Vercel (or upload to CDN)
```

### 13.3 Multi-Jurisdiction Expansion

**Current scope**: City of Dallas + Dallas County

**Expansion pattern**:
- Socrata API endpoints vary by city — parameterize base URLs and resource IDs
- TEA CAMPUS data: filter by County Name (currently "DALLAS COUNTY") — trivially expandable
- TJJD data: filter by zip code range — need zip-to-county mapping
- Calls for Service: city-specific format — need adapter per jurisdiction
- Consider a `jurisdictions.json` config:
  ```json
  {
    "dallas": {
      "incidents_resource": "qv6i-rri7",
      "arrests_resource": "sdr7-6v3j",
      "311_resource": "gc4d-8a49",
      "county_name": "DALLAS COUNTY",
      "zip_range": [75000, 75300]
    }
  }
  ```

### 13.4 Key Gotchas for Migration

1. **Geo parsing complexity**: The M code handles 4 different Socrata geo formats — ensure Python parser covers all cases
2. **Header switch pattern**: OData returns different column names than JSON API — the "header switch" tables provide the mapping
3. **Drug Related "Istevencident"**: Typo in source column name — preserve for backward compatibility or fix in migration
4. **"Proirity" / "Dipsosition"**: Typos in crosswalk table column names
5. **Many:Many relationships**: CFS crosswalks and Campus/TJJD need careful handling in SQL/frontend joins
6. **Measure Killer**: PBI removed unused columns — only 18 of 86 incident columns and 11 of 17 311 columns are actually used
7. **Parameter table**: Field parameter for dynamic axis — implement as dropdown/toggle in web UI
8. **DATE vs DATE2**: Two separate date dimensions — consider unifying or maintaining parallel for CFS separation
9. **Historical data volume**: Calls for Service at 4.8M rows needs aggregation strategy for web — pre-compute daily/weekly/monthly rollups
10. **Incremental refresh floor dates**: Hard floor of 2017 for arrests/311, 2026-01-01 for incidents — may need to be adjusted for full historical load
