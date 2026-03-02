/** Default brand colors (used as fallback / landing page) */
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

/** Data floor — earliest date in Socrata datasets */
export const DATA_FLOOR = "2017-01-01";

/** SWR configuration defaults */
export const SWR_CONFIG = {
  revalidateOnFocus: false,
  refreshInterval: 900_000, // 15 min
  dedupingInterval: 60_000, // 1 min
} as const;
