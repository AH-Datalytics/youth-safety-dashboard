# Dallas Youth Safety Dashboard - Recreate Specification

## Overview
This document describes the Dallas Youth Safety Dashboard, a web application created in collaboration with the National League of Cities to showcase available data about Dallas youth. The dashboard is built in Microsoft Power BI and embedded as a public report.

---

## Branding & Design System

### Logo
- **Organization**: Lone Star Justice Alliance
- **Logo Style**: Circular badge/seal design — black circle with white tree illustration (a tree with visible roots above a water reflection line), text "LONE STAR" in bold sans-serif above "JUSTICE ALLIANCE" in smaller text to the right of the circle
- **Logo placement**: Top-left corner of every page, inside a white/light background header band

### Color Palette
| Element | Color |
|---|---|
| Primary Navigation Background | #2C1A6B (deep dark purple/indigo) |
| Active/Current Page Tab | #1A0F40 (darker purple-black, bold white text) |
| Inactive Nav Tabs | #3D2A85 (medium purple, white text) |
| Header Background | White / light off-white (#FAFAFA) |
| Thin Divider Line | Light gray (#CCCCCC) |
| Chart Bars (primary) | #2B5CE6 (royal blue) |
| Chart Lines (311/CFS) | #D4A900 (golden yellow/amber) |
| Map Dots - Group B Offenses | Blue |
| Map Dots - Person | Purple |
| Map Dots - Property | Dark Purple |
| Map Dots - Society | Teal/cyan |
| KPI Card Background | #2C1A6B (dark purple) |
| KPI Card Text | White |
| Table Header Row | #1A0F40 dark, white text |
| Data Filter Panel Background | White |
| Filter Panel Header | Dark navy/near-black with white text |
| Footer/Bottom Bar | Very light gray |
| Body Background | White |

### Typography
- **Dashboard Title**: Large, bold, uppercase sans-serif (approx 28–32px)
- **Section Subtitle**: Medium bold sans-serif (~20px, "Offense & Arrest Data" style)
- **Navigation Tabs**: Uppercase or title-case bold sans-serif (~13px)
- **Chart Titles**: Bold, white text on dark purple/navy bar header background
- **Filter Labels**: Bold, dark, small (~12px)
- **Data Labels**: Small sans-serif numbers on chart bars
- **Footer Note**: Italic small gray text "Data updated everyday at 7:00AM EST."

### Layout
- **Report Canvas**: Fixed-width Power BI style canvas, approximately 1400 × 850 px (rendered at 89% zoom in browser)
- **Header Band**: Spans full width, contains logo (left) and title (center-right on dark gray rectangle)
- **Thin Horizontal Rule**: Below header, light gray
- **Left Sidebar / Filter Panel**: ~20% width, contains Date slicer and categorical filters
- **Main Content Area**: ~80% width, contains charts and visualizations
- **Bottom Bar**: Fixed at bottom with Power BI logo, page navigation (Previous / Page X of 13 / Next), Share and Fullscreen buttons

---

## Global Header (All Pages Except Home)
Every data page shares this header structure:
- **Row 1**: Lone Star Justice Alliance logo (left) + Title: "DALLAS YOUTH SAFETY DASHBOARD" (bold, large) + Section subtitle (e.g., "Offense & Arrest Data") — centered/right on white background
- **Row 2 (Nav Bar)**: Dark purple/navy horizontal nav bar with 4–5 tab buttons:
  - The current page tab displays **bold white text** and has a slightly lighter purple background with a white left-border indicator
  - Other tabs display standard white text on dark purple
  - Tab layout example (Offense section): [Home] [Offense Time of Day] **[Offense Overview]** [Offense Map] [Arrest Demographics]

---

## Page 1: Home

### URL/Navigation
- Entry point, accessible via "Home" nav button from all other pages
- Shows "1 of 13" in page navigation

### Layout
- **Left Half**: Introductory text block (no sidebar filters)
- **Right Half**: Four large navigation buttons stacked vertically

### Left Column Content
Descriptive paragraph:
> "This Dallas Youth Safety Dashboard was created in collaboration with National League of Cities as a way to showcase available data and information about Dallas Youth."

Data sources listed with hyperlinks:
- **Offense Data:** City of Dallas Open Data (link)
- **Arrest Data:** City of Dallas Open Data (link)
- **311 Request Data:** City of Dallas Open Data (link)
- **Calls for Service Data:** Dallas Public Records Request (link)
- **Youth Court Referrals:** Texas Juvenile Justice Department Request (link)
- **School Disciplinary Data:** Texas Education Agency Discipline Data (link)

### Right Column — Navigation Buttons (4 large buttons, stacked)
Each button: full-width rectangular, dark purple (#2C1A6B), white uppercase bold text, ~60px tall

1. **OFFENSE & ARREST DATA** → navigates to Offense Overview page
2. **CALLS FOR SERVICE & 311 DATA** → navigates to 311 Requests page
3. **YOUTH COURT REFERRAL DATA** → navigates to Youth Court Referrals page
4. **SCHOOL DISCIPLINARY DATA** → navigates to Disciplinary Incidents page

### Header
- Lone Star Justice Alliance logo (black circular seal with tree) on white background
- Dark charcoal/near-black rectangle spans 2/3 of header with: "DALLAS YOUTH SAFETY DASHBOARD" in large white uppercase bold text

---

## Section 1: Offense & Arrest Data (Pages 2–5)

### Section Navigation Tabs (shared across pages 2–5)
Dark purple nav bar with these tabs:
[Home] | [Offense Overview] | [Offense Time of Day] | [Offense Map] | [Arrest Demographics]

---

## Page 2: Offense Overview

### Page Info
- Section: Offense & Arrest Data
- Page label: "2 of 13"
- Subtitle: "Offense & Arrest Data"
- Current tab: **Offense Overview** (bold)

### Left Sidebar — Filters
1. **Date Filter** (date range slicer)
   - Label: "Date" (white text on dark navy bar)
   - Two date inputs: "Start date" and "End date" with calendar icons
   - Range slider with two handles
   - Default range: 1/1/2024 to 1/9/2026 (current)
   - Available range: 1/1/2017 to 1/9/2026

2. **Offense Type** (hierarchical tree slicer)
   - Label: "Offense Type" (white text on dark navy bar)
   - Checkboxes with expand arrows (►) for categories:
     - Group B Offenses
     - Not a Crime
     - Person
     - Property
     - Society

### Right Main Area — Charts

#### Top Filter Bar
**Case Status & Age of Arrestee** (horizontal button selector across full width)
- "Cleared (Arrestee Age 17 or Under)"
- "Cleared (Arrestee 18 or Older)"
- "Open"
- "Closed"
- "Suspended"
- "Unknown"
(these act as toggle/filter buttons on the charts below)

#### Chart 1: "# of Offenses by Year and Month" (Bar Chart)
- **Dark purple header bar** with white title text
- **Type**: Vertical bar chart (column chart)
- **X-axis**: Month labels (JAN, FEB, MAR... DEC) grouped by year (2024, 2025, Jan 2026)
- **Y-axis**: Count (0 to 10K shown)
- **Bar color**: Royal blue (#2B5CE6)
- **Data labels**: Numbers displayed on top of each bar
- **Sample data points**: ~7,600–9,061 offenses per month in 2024; ~7,229–8,294 in 2025; 1,873 in Jan 2026
- Has drill-up, drill-down, and focus mode controls

#### Chart 2: "# of Offenses – NIBRS Group A" (Bar Chart)
- **Dark purple header bar** with white title text
- **Type**: Horizontal or vertical bar chart
- **X-axis**: Crime category names (Animal Cruelty, Arson, Assault Offenses, Bribery, Burglary/Breaking &..., Counterfeiting/Forge..., Destruction/Damage..., Drug/Narcotic Offen..., Embezzlement, Extortion/Blackmail, Fraud Offenses, Gambling Offenses, Homicide Offenses, Human Trafficking, Kidnapping/Abduction, Larceny/Theft Offens..., Motor Vehicle Theft, Pornography/Obsce..., Robbery, Stolen Property Offe..., Weapon Law Violatio...)
- **Y-axis**: Count (0 to 50K)
- **Sample data**: Motor Vehicle Theft: 49,857; Larceny/Theft: 50,764; Assault Offenses: 14,523; Drug/Narcotic: 15,722 & 16,416
- **Bar color**: Royal blue (#2B5CE6)

### Footer
Small italic text: "Data updated everyday at 7:00AM EST."

---

## Page 3: Offense Time of Day

### Page Info
- Section: Offense & Arrest Data
- Page label: "3 of 13"
- Current tab: **Offense Time of Day** (bold)

### Left Sidebar — Filters (same as Page 2)
- Date slicer (1/1/2024 to 1/9/2026)
- Offense Type hierarchical tree slicer (same categories)

### Right Main Area — Charts

#### Top Filter Bar
Same "Case Status & Age of Arrestee" toggle buttons as Page 2

#### Chart 1: "# of Offenses by Time of Day & Day of the Week" (Matrix/Table)
- **Type**: Data matrix/heatmap table
- **Rows**: Days of week (MON, TUE, WED, THU, FRI, SAT, SUN, Total)
- **Columns**: Hours of day in 1-hour increments (00:00:00 through 15:00:00 shown, scrollable to 23:00:00)
- **Values**: Number of offenses per cell
- **Scrollable** in both horizontal and vertical directions
- Sample totals row: 12,400 | 7,766 | 6,871 | 5,093 | 3,998 | 3,249 | 3,559 | 4,101 | 6,139 | 5,904 | 6,441 | 6,961 | 9,640 | 7,802 | 9,099 | 9,813 | 10,005...
- Highest offense day appears to be Sunday (SUN) in certain hours

#### Chart 2: "# of Offenses by Day of Week" (Bar Chart) — Bottom Left
- **Type**: Vertical bar chart
- **X-axis**: MON, TUE, WED, THU, FRI, SAT, SUN
- **Y-axis**: Count (0 to 30K)
- **Bar color**: Royal blue
- **Sample data**: MON: 26,337 | TUE: 26,348 | WED: 27,106 | THU: 27,420 | FRI: 31,203 | SAT: 31,267 | SUN: 28,087

#### Chart 3: "# of Offenses by Time of Day" (Bar Chart) — Bottom Right
- **Type**: Vertical bar chart
- **X-axis**: Hours (0:00 through 23:00)
- **Y-axis**: Count (0 to about 12K)
- **Bar color**: Royal blue
- **Lowest**: 4:00 AM–5:00 AM (~3,249–3,559)
- **Highest**: 12:00 noon (~9,640–10,005 range)

### Footer
"Data updated everyday at 7:00AM EST."

---

## Page 4: Offense Map

### Page Info
- Section: Offense & Arrest Data
- Page label: "4 of 13"
- Current tab: **Offense Map** (bold)

### Left Sidebar — Filters (same as Pages 2–3)
- Date slicer
- Offense Type tree slicer

### Right Main Area — Map

#### Top Filter Bar
Same "Case Status & Age of Arrestee" toggle buttons

#### Map Visual: "Offense Map"
- **Type**: Azure Maps (Microsoft Azure) interactive geographic map
- **Default zoom**: Centered on Dallas/DFW metroplex area
- **Map style**: Light/standard road map (TomTom, ©2026 TomTom, Microsoft Azure logo)
- **Data**: Scatter/bubble dots representing individual offenses or clusters
- **Legend**: Four dot colors:
  - Blue dot: Group B Offenses
  - Yellow/Gold dot: Person
  - Dark Purple dot: Property
  - Teal/Cyan dot: Society
- **Controls** (right side): Zoom In (+), Zoom Out (-), Pitch Down, Pitch Up, Reset Pitch, Rotate Right, Rotate Left, Reset Rotation
- **Dense clusters**: Around central Dallas, southern Dallas, Irving, Grand Prairie areas
- **Sparse points**: Scattered throughout DFW suburbs

### Footer
"Data updated everyday at 7:00AM EST."

---

## Page 5: Arrest Demographics

### Page Info
- Section: Offense & Arrest Data
- Page label: "5 of 13"
- Current tab: **Arrest Demographics** (bold)

### Left Sidebar — Filters
- Date slicer (same as previous pages)
- Offense Type tree slicer (same)

### Right Main Area — Charts

#### Demographics Tab Selector (top of content area)
Label: "Demographics" (header on dark navy/purple bar)
Horizontal tab buttons:
- **Young Adult/Adult** (currently selected, dark/active state)
- Age Groupings
- Sex
- Race

#### Chart: "# of Arrests" (Line Chart) — Default view: Young Adult/Adult
- **Type**: Multi-line time series chart
- **X-axis**: Months from Jan 2024 to Jan 2026 (labeled: Jan 2024, Apr 2024, Jul 2024, Oct 2024, Jan 2025, Apr 2025, Jul 2025, Oct 2025, Jan 2026)
- **Y-axis**: Number of Arrests (0 to ~900)
- **Lines**:
  - Yellow/Gold dot: "Young Adult 18 to 24" — ranges approximately 125–275 per month
  - Blue dot: "Adult 25+" — ranges approximately 450–850 per month
- Both lines show a sharp drop at Jan 2026 (incomplete data)

#### Other demographic tabs (same chart type, different segmentation):
- **Age Groupings**: Breaks arrests into age groups (e.g., Under 18, 18-24, 25+)
- **Sex**: Male/Female breakdown lines
- **Race**: Race/ethnicity breakdown lines

### Footer
"Data updated everyday at 7:00AM EST."

---

## Section 2: Calls for Service & 311 Request Data (Pages 6–9)

### Section Navigation Tabs (shared across pages 6–9)
[Home] | [311 Requests] | [CFS Overview] | [CFS Time of Day] | [CFS Map]

---

## Page 6: 311 Requests

### Page Info
- Section: Calls for Service & 311 Request Data
- Page label: "6 of 13"
- Section subtitle: "Calls for Service & 311 Request Data"
- Current tab: **311 Requests** (bold)

### Left Sidebar — Filters
1. **Date Filter** (date range slicer)
   - Default range: 1/1/2024 to 1/9/2026

2. **311 Request Type** (hierarchical tree slicer)
   - Label: "311 Request Type" on dark bar
   - Search box inside the filter
   - Categories include: Code Compliance (at minimum; list is searchable)

3. **Request Priority** (button grid selector)
   - Label: "Request Priority" on dark bar
   - Six buttons in 2×3 grid:
     - Emergency | Priority | Standard
     - High | Dispatch | Other

### Right Main Area — Charts

#### Chart 1: "311 Requests" (Line Chart)
- **Type**: Single line chart over time
- **X-axis**: Months (Jan 2024 through Jan 2026)
- **Y-axis**: Count (0 to 1,000)
- **Line color**: Gold/amber/yellow
- **Data points**: 
  - Jan 2024: 582 → Feb 2024: 417 → Mar 2024: (rising) → Jun 2024: 732 → Jul 2024: 666 → Aug 2024: 669 → Sep 2024: 492 → Oct 2024: 535 → Nov 2024: 298 → Jan 2025: 363 → Feb 2025: 347 → Jul 2025: 830 → Sep 2025: 673 → Oct 2025: 619 → Jan 2026: 144

#### Chart 2: "311 Requests by Priority" (Map)
- **Type**: Azure Maps geographic map
- **Legend** (dot colors):
  - Purple: Standard
  - Orange: Emergency
  - Blue/dark: Priority
  - Light gray: Other
  - Gold: High
- **Zoom area**: Central/East Dallas neighborhood area
- Dense clusters of colored dots over Dallas urban area

---

## Page 7: CFS Overview

### Page Info
- Section: Calls for Service & 311 Request Data
- Page label: "7 of 13"
- Current tab: **CFS Overview** (bold)

### Left Sidebar — Filters
1. **Date Filter**
   - Default: 1/1/2017 to 8/31/2025 (wider range than offense data)
   - Slider spans entire history

2. **Call Type** (hierarchical tree slicer)
   - Label: "Call Type"
   - Categories:
     - Medical
     - Miscellaneous Policing
     - NIBRS Person
     - NIBRS Property
     - NIBRS Society
     - Non-NIBRS Offense
     - Service
     - Traffic

3. **Call Priority** (checkbox list)
   - Label: "Call Priority"
   - Options: Emergency, Urgent, General Service, Non-Critical

### Right Main Area — Charts

#### KPI Cards (top row)
Two large dark purple metric cards:
- **Left card**: "13.5 / Average Response Time (Minutes)" — large bold number, white on dark purple background
- **Right card**: "77.0 / Average Time Spent (Minutes)" — large bold number, white on dark purple background

#### Chart 1: "# of Calls for Service by Year and Month" (Bar Chart)
- **Type**: Vertical bar chart
- **X-axis**: Month/year labels (JAN–DEC for each year from 2017 through 2020 shown, scrollable)
- **Y-axis**: Count (0 to 50K)
- **Bar color**: Royal blue
- **Sample data (2017)**: Jan: 46,330 | Feb: 42,424 | Mar: 47,095 | Apr: 30,020 | May: 52,227 | Jun: 50,561 | Jul: 50,916 | Aug: 49,260 | Sep: 47,441 | Oct: 48,196 | Nov: 48,135 | Dec: 48,031
- Horizontal scrollbar beneath chart to see all years

#### Chart 2: "# of Calls for Service by Call Type" (Bar Chart)
- **Type**: Vertical bar chart
- **X-axis**: Call types
- **Y-axis**: Count (0 to 1.0M)
- **Bar color**: Royal blue
- **Data**:
  - Medical: 32,536
  - Miscellaneous Policing: 1,137,938
  - NIBRS Person: 149,323
  - NIBRS Property: 468,856
  - NIBRS Society: 42,743
  - Non-NIBRS Offense: 1,345,342
  - Service: 810,064
  - Traffic: 646,944

---

## Page 8: CFS Time of Day

### Page Info
- Section: Calls for Service & 311 Request Data
- Page label: "8 of 13"
- Current tab: **CFS Time of Day** (bold)

### Left Sidebar — Filters (same as Page 7)
- Date slicer (1/1/2017 to 8/31/2025)
- Call Type hierarchical tree slicer
- Call Priority checkbox list

### Right Main Area — Charts

#### Chart 1: "# of Calls for Service by Time of Day & Day of the Week" (Matrix)
- **Type**: Data matrix table (same structure as Offense Time of Day matrix)
- **Rows**: Weekday (MON, TUE, WED, THU, FRI, SAT, SUN, Total)
- **Columns**: Hour of day (0:00 through 23:00, scrollable)
- **Sample Total row**: 198,257 | 165,812 | 148,720 | 117,714 | 95,230 | 91,709 | 100,628 | 134,524 | 168,571 | 186,488 | 196,612 | 205,122 | 211,967 | 215,397 | 216,608 | 231,235...
- Scrollable horizontally and vertically

#### Chart 2: "# of Calls for Service by Day of Week" (Bar Chart) — Bottom Left
- **Type**: Vertical bar chart
- **X-axis**: MON, TUE, WED, THU, FRI, SAT, SUN
- **Y-axis**: 0 to ~0.7M
- **Data**: MON: 650,722 | TUE: 627,966 | WED: 626,046 | THU: 633,042 | FRI: 676,401 | SAT: 716,655 | SUN: 703,078

#### Chart 3: "# of Calls for Service by Time of Day" (Bar Chart) — Bottom Right
- **Type**: Vertical bar chart
- **X-axis**: Hours 0:00 through 23:00
- **Y-axis**: 0 to ~0.25M
- **Pattern**: Lowest around 4:00–5:00 AM (~91,709–100,628), rises through day, peaks around 15:00–21:00 (~243,814–256,653)

---

## Page 9: CFS Map

### Page Info
- Section: Calls for Service & 311 Request Data
- Page label: "9 of 13"
- Current tab: **CFS Map** (bold)

### Left Sidebar — Filters (same as Pages 7–8)
- Date slicer (1/1/2017 to 8/31/2025)
- Call Type hierarchical tree slicer
- Call Priority checkbox list

### Right Main Area — Map
- **Visual title**: "# of Calls for Service by Time of Day & Day of the Week" (header bar)
- **Type**: Azure Maps interactive geographic map
- **Default display**: When no specific filters active, may show world view; with Dallas data filtered, centers on Dallas metropolitan area
- **Map style**: Standard road map (TomTom, Microsoft Azure)
- **Controls**: Same zoom/rotation controls as Offense Map
- **Note**: Similar structure to Offense Map but plots calls for service incidents

---

## Section 3: Youth Court Referral Data (Pages 10–11)

### Section Navigation Tabs (shared across pages 10–11)
[Home] | **[Youth Court Referrals]** | [Referrals Over Time]

---

## Page 10: Youth Court Referrals

### Page Info
- Section: Youth Court Referral Data
- Page label: "10 of 13"
- Section subtitle: "Youth Court Referral Data"
- Current tab: **Youth Court Referrals** (bold)

### Left Sidebar — No Traditional Date Slicer (different filter structure)
No date slicer shown; data reflects period January 2020 – August 2025, updated annually.

### Top Filter Area — Year Selector (horizontal buttons)
Label: "Year" (on dark navy bar)
Buttons in 2-row grid (3 per row):
- Row 1: 2020 | 2021 | 2022
- Row 2: 2023 | 2024 | 2025
(Acts as year filter for all charts on this page)

### Month Selector (horizontal buttons)
Label: "Month" (on dark navy bar)
12 month buttons: January | February | March | April | May | June | July | August | September | October | November | December (+ scroll right button "►")

### Category Selector (left panel, button grid)
Label: "Category" (on dark bar, white text)
Two-column button grid:
- Age | Offense Category
- Disposition | **Offense Type** (selected — darker background)
- Gender | Race/Ethnicity

### Right Main Area — Charts

#### Table: "Referral Details" (Left side of right panel)
- **Type**: Simple data table
- **Columns**: "Description" and "Total"
- **When Offense Type selected**:
  - Conduct in Need of Supervision: 2,139
  - Felony: 4,742
  - Misdemeanor A & B: 7,046
  - Violation of Probation: 1,617
  - **Total: 15,544**

#### Map: "Number of Court Referrals by ZIP Code" (Right side)
- **Type**: Azure Maps geographic map
- **Default**: Shows world map when no specific location filter applied
- **When data populated**: Shows Dallas ZIP code areas with dot/bubble markers
- **Map controls**: Zoom in/out, pitch, rotation buttons on right side

### Footer
"Data reflects the period January 2020 – August 2025. Updates occur annually."

---

## Page 11: Youth Court Referrals Over Time

### Page Info
- Section: Youth Court Referral Data
- Page label: "11 of 13"
- Current tab: **Youth Court Referrals Over Time** (bold)

### Top Filter — Category Selector (horizontal tab buttons)
Label: "Category" (dark header)
Tabs:
- **Age** (currently selected, dark background)
- Disposition
- Gender
- Offense Type
- Race/Ethnicity

### Right Main Area — Chart

#### Chart: "Referrals Over Time" (Multi-Line Chart)
- **Type**: Multi-series line chart
- **X-axis**: Months from January 2020 through approximately early 2025 (labeled by year: 2020, 2021, 2022, 2023, 2024, 2025)
- **X-axis labels**: Every month listed (January, February, March... through December, scrollable)
- **Y-axis**: Count (0 to ~100)
- **Lines (by age group, 7 series)**:
  - Light blue: Age 10 & 11
  - Dark navy: Age 12
  - Orange: Age 13
  - Pink/magenta: Age 14
  - Dark purple (near-black): Age 15
  - Medium purple: Age 16
  - Gold/yellow: Age 17+
- **Pattern**: Upward trend from 2020 to 2024; Age 15 and Age 16 tend to have highest counts
- The chart has a horizontal scrollbar to see all months

### Footer
"Data reflects the period January 2020 – August 2025. Updates occur annually."

---

## Section 4: School Disciplinary Data (Pages 12–13)

### Section Navigation Tabs (shared across pages 12–13)
[Home] | **[Disciplinary Incidents]** | [Disciplinary Outcomes]

---

## Page 12: Disciplinary Incidents

### Page Info
- Section: School Disciplinary Data
- Page label: "12 of 13"
- Section subtitle: "School Disciplinary Data"
- Current tab: **Disciplinary Incidents** (bold)

### Left Sidebar — Filters

#### School Year Selector (button grid)
Label: "School Year" (dark bar, white text)
6-button grid (2 rows × 3 columns) + "►" scroll:
- Row 1: **2023-2024** | 2021-2022 | 2019-2020
- Row 2: 2022-2023 | 2020-2021 | 2018-2019
(Selected year has darker background)

#### School Type Selector (button pair)
Label: "School Type" (dark bar)
Two buttons side by side:
- Open Enrollment Charter
- Traditional ISD/CSD

#### School Name (multi-select list with search)
Label: "School Name" (dark bar)
- Search text box
- Long scrollable list of school names (checkboxes):
  - A+ ACADEMY EL
  - A+ SECONDARY SCHOOL
  - ABBETT EL
  - ACADEMY OF DALLAS
  - ACHZIGER EL
  - ADELFA BOTELLO CALLEJO EL
  - ADELLE TURNER EL
  - ADVANTAGE ACADEMY
  - AGNEW MIDDLE
  - AIKIN EL
  - ALEX SANGER PREPARATORY SCHOOL
  - (many more schools...)

### Right Main Area — Charts

#### Table: "Incident & Outcome Totals" (Left portion)
- **Type**: Data table
- **Columns**: "Incident Description or Outcome" and "Total"
- **Data**:
  - Alcohol Violation: 10
  - Assault - Non-District Employee: 601
  - Bullying: 20
  - Expulsion w/o Placement in Another Educational Setting: 122
  - Felony Controlled Substance Violation: 63
  - Fighting/Mutual Combat: 5,262
  - In-School Suspension: 51,657
  - Out-Of-School Suspension: 24,912
  - Part Day In-School Suspension: 4,249
  - Part Day Out-Of-School Suspension: 774
  - Permanent Removal by Teacher: 101
  - Placement in On/Off Camp DAEP: 8,864
  - Violated Local Code Of Conduct: 57,605
  - **Total: 154,240**

#### Map: "School Location & Instruction Type" (Right portion)
- **Type**: Azure Maps geographic map centered on Dallas area
- **Legend**:
  - Purple dot: Alternative
  - Dark blue/navy dot: DAEP
  - Orange dot: JJAEP
  - Light blue dot: Regular
- Shows school locations as colored dots across Dallas metropolitan area
- Dense cluster of blue (Regular) dots throughout Dallas ISD area

---

## Page 13: Disciplinary Outcomes

### Page Info
- Section: School Disciplinary Data
- Page label: "13 of 13"
- Current tab: **Disciplinary Outcomes** (bold)

### Left Sidebar — Filters (same as Page 12)
- School Year button grid (2023-2024 through 2018-2019)
- School Type buttons
- School Name searchable list (same list of schools)

### Right Main Area — Charts

#### Top Sub-Filter — Demographics Category (horizontal tab buttons)
Label: "Incident Outcome by Student Demographics" (header)
Tabs:
- **At Risk Status** (currently selected/active, dark background)
- Economically Disadvantaged Status
- Race/Ethnicity
- Removal Type
- Special Education Status

#### Table: "Incident Outcome by Student Demographics" (Left portion)
- **Type**: Three-column data table
- **Columns**: "Student Details" | "Incident Outcome" | "Total"
- **At Risk Status view data**:
  - At Risk | Expelled: 181
  - At Risk | Expelled to JJAEP: 118
  - At Risk | In School Suspension: 66,204
  - At Risk | Out Of School Suspension: 30,961
  - At Risk | Placed in DAEP: 15,117
  - Non-At Risk | In School Suspension: 10,786
  - Non-At Risk | Out Of School Suspension: 5,931
  - Non-At Risk | Placed in DAEP: 755
  - Unknown At Risk | In School Suspension: 762
  - Unknown At Risk | Out Of School Suspension: 410
  - Unknown At Risk | Placed in DAEP: 173
  - **Total: 131,398**

#### Map: "School Location & Instruction Type" (Right portion)
- **Type**: Azure Maps geographic map (same as page 12)
- **Legend**: Same four categories (Alternative, DAEP, JJAEP, Regular)
- **Shows**: Dallas school locations colored by institution type
- Dense cluster of light blue (Regular) school dots throughout Dallas, scattered purple/orange for alternative/DAEP/JJAEP schools

---

## Bottom Navigation Bar (Global — All Pages)
Persistent across all pages:
- **Left**: "Microsoft Power BI" link (blue, opens in new tab)
- **Center**: Previous Page (◄) | Page Number Link (X of 13, clickable dropdown) | Next Page (►)
- **Right**: Share button (box with arrow icon) | Open in Full-Screen Mode button (expand icon)
- **Page Dropdown**: Clicking the "X of 13" shows full page list:
  Home → Offense Overview → Offense Time of Day → Offense Map → Arrest Demographics → 311 Requests → CFS Overview → CFS Time of Day → CFS Map → Youth Court Referrals → Youth Referrals Over Time → Disciplinary Incidents → Disciplinary Outcomes
- **Zoom Controls** (separate from nav, middle-right area):
  - "-" Zoom Out button
  - Slider control
  - "+" Zoom In button
  - Default: 89% zoom level
  - Fit to Page button

---

## Interactive Behaviors

### Filter Interactions
- All filters on a page cross-filter the visualizations on that page
- Date slicers update all charts to reflect selected time range
- Categorical slicers (Offense Type, Call Type, School Name, etc.) filter all charts on page
- Filter changes do NOT persist across page navigation (each page has its own state)

### Chart Interactions
- **Hover**: Tooltips appear showing exact values
- **Click on bar/point**: Cross-highlights or cross-filters related visuals on the same page
- **Drill Down**: Bar charts with drill-up/drill-down controls (visible as icons in top-right of chart title)
- **Focus Mode**: Charts can be expanded to full focus mode
- **Filters on Visual**: Each chart may have a "Filters on Visual" button to see/modify chart-specific filters

### Map Interactions
- **Zoom**: +/- buttons and scroll wheel
- **Pan**: Click and drag
- **Hover dots**: Shows tooltip with location details
- **Pitch/Rotate**: Available via control buttons

### Page Navigation
- Section home buttons return to main dashboard home (page 1)
- Within-section tabs navigate between sub-pages of that section
- Bottom bar "Previous Page" / "Next Page" navigate sequentially through all 13 pages
- Page number link opens dropdown for direct page access

---

## Data Notes
- **Offense Data**: Updated every day at 7:00AM EST
- **Arrest Data**: Updated every day at 7:00AM EST
- **311 Request Data**: Updated every day at 7:00AM EST
- **Calls for Service Data**: Available 1/1/2017–8/31/2025
- **Youth Court Referral Data**: January 2020–August 2025, updated annually
- **School Disciplinary Data**: Available for school years 2018-2019 through 2023-2024

---

## Implementation Notes for Claude Code

### Technology Recommendations
- **Framework**: React with TypeScript
- **Charting Library**: Recharts or Chart.js (for bar charts, line charts, matrix)
- **Maps**: Mapbox GL JS or Leaflet.js (as Azure Maps alternative)
- **Styling**: Tailwind CSS or CSS-in-JS (styled-components)
- **State Management**: React Context or Zustand for cross-filter state

### Key Components to Build
1. `GlobalHeader` — logo + title + section subtitle
2. `SectionNavBar` — dark purple horizontal tab bar
3. `DateRangeSlicer` — dual date inputs + range slider
4. `HierarchicalTreeSlicer` — expandable checkbox tree
5. `ButtonGridSlicer` — grid of toggle buttons (year, month, school year, etc.)
6. `SearchableListSlicer` — scrollable searchable checkbox list (school names)
7. `BarChart` — vertical bar chart with dark purple title bar + data labels
8. `LineChart` — single or multi-series line chart
9. `MatrixTable` — scrollable heatmap-style data matrix
10. `KPICard` — dark purple card with large bold number + label
11. `GeographicMap` — interactive map with colored dot markers
12. `HomepageNavigationButton` — large dark purple navigation button
13. `PageNavBar` — bottom persistent navigation bar
14. `FilterToggleButtons` — horizontal row of case status / demographic toggles

### Color Constants
```css
--color-primary: #2C1A6B;
--color-primary-dark: #1A0F40;
--color-primary-medium: #3D2A85;
--color-chart-blue: #2B5CE6;
--color-chart-gold: #D4A900;
--color-chart-purple: #6B21A8;
--color-chart-orange: #EA580C;
--color-chart-teal: #0891B2;
--color-map-regular: #60A5FA;
--color-map-alternative: #7C3AED;
--color-map-daep: #1E3A5F;
--color-map-jjaep: #EA580C;
--color-background: #FFFFFF;
--color-text: #1A1A1A;
--color-border: #E5E7EB;
```

### Data Schema (Sample)
Each data section would need its own dataset. For a working prototype, use the sample values provided in this document as mock data.
