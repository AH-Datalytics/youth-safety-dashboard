// ---------------------------------------------------------------------------
// Download column definitions — maps compact JSON keys to readable headers
// ---------------------------------------------------------------------------

export interface ColumnDef {
  /** Compact key in the JSON record (e.g. "d", "c", "ot") */
  key: string;
  /** Human-readable column header for export */
  header: string;
  /** Optional value formatter (e.g. number → formatted string) */
  format?: (value: unknown) => string;
}

export interface DomainDownloadInfo {
  /** Internal domain identifier matching the API endpoint */
  domainId: string;
  /** Display label */
  label: string;
  /** Short description for the Downloads page */
  description: string;
  /** Column definitions for export */
  columns: ColumnDef[];
  /** Link to the dashboard page for this domain */
  pageHref: string;
}

export const DOWNLOAD_DOMAINS: DomainDownloadInfo[] = [
  {
    domainId: "incidents",
    label: "Offenses",
    description: "Criminal offense incidents reported in Dallas County, including NIBRS codes, offense types, and case status.",
    columns: [
      { key: "d", header: "Date" },
      { key: "ot", header: "Offense Type" },
      { key: "cag", header: "Crime Against" },
      { key: "ca", header: "Offense Group" },
      { key: "di", header: "District" },
      { key: "zi", header: "ZIP" },
      { key: "n", header: "NIBRS Code" },
      { key: "cs", header: "Case Status" },
      { key: "c", header: "Count" },
    ],
    pageHref: "/offense-arrest/overview",
  },
  {
    domainId: "arrests",
    label: "Arrests",
    description: "Arrest records with demographic breakdowns by race, sex, and age group.",
    columns: [
      { key: "d", header: "Date" },
      { key: "ch", header: "Charge" },
      { key: "ra", header: "Race" },
      { key: "sx", header: "Sex" },
      { key: "ag", header: "Age Group" },
      { key: "ya", header: "Young Adult" },
      { key: "di", header: "District" },
      { key: "c", header: "Count" },
    ],
    pageHref: "/offense-arrest/arrests",
  },
  {
    domainId: "cfs",
    label: "Calls for Service",
    description: "Police calls for service with call types, priorities, response times, and dispositions.",
    columns: [
      { key: "d", header: "Date" },
      { key: "ct", header: "Call Type" },
      { key: "cat", header: "Category" },
      { key: "sc", header: "Sub-Category" },
      { key: "pr", header: "Priority" },
      { key: "di", header: "District" },
      { key: "dg", header: "Disposition" },
      { key: "c", header: "Count" },
      { key: "rt", header: "Avg Response Time" },
      { key: "ts", header: "Avg Time Spent" },
    ],
    pageHref: "/cfs-311/overview",
  },
  {
    domainId: "311",
    label: "311 Requests",
    description: "Code compliance 311 service requests with request types, departments, and status.",
    columns: [
      { key: "d", header: "Date" },
      { key: "rt", header: "Request Type" },
      { key: "dp", header: "Department" },
      { key: "st", header: "Status" },
      { key: "pg", header: "Priority Group" },
      { key: "di", header: "District" },
      { key: "zi", header: "ZIP" },
      { key: "c", header: "Count" },
    ],
    pageHref: "/cfs-311/requests",
  },
  {
    domainId: "tjjd",
    label: "Youth Court Referrals",
    description: "Texas Juvenile Justice Department referral data by offense type, demographics, and disposition.",
    columns: [
      { key: "cat", header: "Category" },
      { key: "desc", header: "Description" },
      { key: "yr", header: "Year" },
      { key: "mo", header: "Month #" },
      { key: "mn", header: "Month Name" },
      { key: "v", header: "Value" },
    ],
    pageHref: "/youth-court/referrals",
  },
  {
    domainId: "campus",
    label: "School Discipline",
    description: "Campus-level disciplinary incident data by school year, section, and type.",
    columns: [
      { key: "sy", header: "School Year" },
      { key: "cn", header: "Campus #" },
      { key: "nm", header: "Campus Name" },
      { key: "se", header: "Section" },
      { key: "hn", header: "Heading" },
      { key: "tp", header: "Type" },
      { key: "ds", header: "Description" },
      { key: "v", header: "Value" },
    ],
    pageHref: "/school-discipline/incidents",
  },
];
