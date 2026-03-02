/** LSJA brand colors */
export const COLORS = {
  primary: "#2C1A6B",
  primaryDark: "#1A0F40",
  accent: "#7C3AED",
  background: "#faf9f6",
  surface: "#ffffff",
  text: "#1a1a1a",
  textSecondary: "#6b7280",
  border: "#e8e8e8",
  borderStrong: "#d4d4d4",
  increase: "#dc2626",
  decrease: "#2563eb",
} as const;

/** Chart color palette */
export const CHART_COLORS = [
  "#2C1A6B", // deep purple (primary)
  "#7C3AED", // lighter purple
  "#2B5CE6", // royal blue
  "#D4A900", // amber gold
  "#dc2626", // red
  "#65bc7b", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
] as const;

/** Offense map dot colors (per spec) */
export const MAP_DOT_COLORS = {
  "Group B": "#2B5CE6",
  Person: "#7C3AED",
  Property: "#2C1A6B",
  Society: "#0d9488",
} as const;

/** Socrata API endpoints */
export const SOCRATA = {
  baseUrl: "https://www.dallasopendata.com/resource",
  incidents: "qv6i-rri7",
  arrests: "sdr7-6v3j",
  requests311: "gc4d-8a49",
} as const;

/** Dashboard sections for navigation */
export const SECTIONS = [
  {
    id: "offense-arrest",
    label: "Offense & Arrest",
    href: "/offense-arrest/overview",
    pages: [
      { id: "overview", label: "Overview", href: "/offense-arrest/overview" },
      { id: "arrests", label: "Demographics", href: "/offense-arrest/arrests" },
    ],
  },
  {
    id: "cfs-311",
    label: "CFS",
    href: "/cfs-311/overview",
    pages: [
      { id: "overview", label: "Overview", href: "/cfs-311/overview" },
    ],
  },
  {
    id: "311",
    label: "311",
    href: "/cfs-311/requests",
    pages: [
      { id: "requests", label: "Requests", href: "/cfs-311/requests" },
    ],
  },
  {
    id: "map",
    label: "Map",
    href: "/map",
    pages: [
      { id: "map", label: "Map", href: "/map" },
    ],
  },
  {
    id: "youth-court",
    label: "Youth Court",
    href: "/youth-court/referrals",
    pages: [
      { id: "referrals", label: "Referrals", href: "/youth-court/referrals" },
    ],
  },
  {
    id: "school-discipline",
    label: "School Discipline",
    href: "/school-discipline/incidents",
    pages: [
      { id: "incidents", label: "Overview", href: "/school-discipline/incidents" },
    ],
  },
] as const;

/** Data floor — earliest date in Socrata datasets */
export const DATA_FLOOR = "2017-01-01";

/** SWR configuration defaults */
export const SWR_CONFIG = {
  revalidateOnFocus: false,
  refreshInterval: 900_000, // 15 min
  dedupingInterval: 60_000, // 1 min
} as const;
