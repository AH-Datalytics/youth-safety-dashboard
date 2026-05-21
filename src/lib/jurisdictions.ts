// ---------------------------------------------------------------------------
// Jurisdiction registry — add new jurisdictions here
// ---------------------------------------------------------------------------

export type DomainId =
  | "offense-arrest"
  | "cfs"
  | "311"
  | "map"
  | "youth-court"
  | "school-discipline";

export interface JurisdictionConfig {
  /** URL slug — used in routes: /dallas/offense-arrest/overview */
  id: string;
  /** Full display name */
  name: string;
  /** Short name for titles */
  shortName: string;
  /** Partner organization */
  org: string;
  /** Abbreviated org name */
  orgShort: string;
  /** Path to logo in /public */
  logo: string;
  /** Card description for landing page */
  description: string;

  /** Branding — overrides CSS variables */
  colors: {
    primary: string;
    primaryDark: string;
    accent: string;
    background: string;
  };

  /** Enabled domains — only these appear in nav */
  domains: DomainId[];

  /** Socrata open-data endpoints (optional — not all jurisdictions use Socrata) */
  socrata?: {
    baseUrl: string;
    incidents: string;
    arrests: string;
    requests311: string;
  };

  /** OneDrive paths for partner data */
  onedrive?: {
    basePath: string;
    cfsFile?: string;
    campusFiles?: string[];
    tjjdFile?: string;
    crosswalks?: string[];
  };

  /** Map defaults */
  geo?: {
    center: [number, number];
    zoom: number;
    bounds: [[number, number], [number, number]];
  };

  /** Earliest date in data */
  dataFloor?: string;
}

// ---------------------------------------------------------------------------
// Section / page shape (used by header nav)
// ---------------------------------------------------------------------------

export interface SectionPage {
  id: string;
  label: string;
  href: string;
}

export interface Section {
  id: string;
  label: string;
  href: string;
  pages: SectionPage[];
}

/** Master section definitions keyed by domain */
const DOMAIN_SECTIONS: Record<DomainId, Section[]> = {
  "offense-arrest": [
    {
      id: "offense-arrest",
      label: "Offense & Arrest",
      href: "/offense-arrest/overview",
      pages: [
        { id: "overview", label: "Overview", href: "/offense-arrest/overview" },
        { id: "ytd", label: "Year-to-Date", href: "/offense-arrest/ytd" },
        { id: "arrests", label: "Demographics", href: "/offense-arrest/arrests" },
      ],
    },
  ],
  cfs: [
    {
      id: "cfs-311",
      label: "CFS",
      href: "/cfs-311/overview",
      pages: [
        { id: "overview", label: "Overview", href: "/cfs-311/overview" },
        { id: "time-of-day", label: "Time of Day", href: "/cfs-311/time-of-day" },
      ],
    },
  ],
  "311": [
    {
      id: "311",
      label: "311",
      href: "/cfs-311/requests",
      pages: [
        { id: "requests", label: "Requests", href: "/cfs-311/requests" },
      ],
    },
  ],
  map: [
    {
      id: "map",
      label: "Map",
      href: "/map",
      pages: [{ id: "map", label: "Map", href: "/map" }],
    },
  ],
  "youth-court": [
    {
      id: "youth-court",
      label: "Youth Court",
      href: "/youth-court/referrals",
      pages: [
        { id: "referrals", label: "Referrals", href: "/youth-court/referrals" },
      ],
    },
  ],
  "school-discipline": [
    {
      id: "school-discipline",
      label: "School Discipline",
      href: "/school-discipline/incidents",
      pages: [
        { id: "incidents", label: "Summary", href: "/school-discipline/incidents" },
        { id: "charts", label: "Incidents & Discipline", href: "/school-discipline/charts" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Registered jurisdictions
// ---------------------------------------------------------------------------

export const JURISDICTIONS: JurisdictionConfig[] = [
  {
    id: "dallas",
    name: "Dallas County",
    shortName: "Dallas",
    org: "Lone Star Justice Alliance",
    orgShort: "LSJA",
    logo: "/logos/lsja-logo.png",
    description: "Youth public safety data for Dallas County",
    colors: {
      primary: "#2C1A6B",
      primaryDark: "#1A0F40",
      accent: "#7C3AED",
      background: "#faf9f6",
    },
    domains: [
      "offense-arrest",
      "cfs",
      "311",
      "map",
      "youth-court",
      "school-discipline",
    ],
    socrata: {
      baseUrl: "https://www.dallasopendata.com/resource",
      incidents: "qv6i-rri7",
      arrests: "sdr7-6v3j",
      requests311: "d7e7-envw",
    },
    onedrive: {
      basePath: "/Clients/NLC/Dallas/PowerBI",
    },
    geo: {
      center: [32.7767, -96.797],
      zoom: 11,
      bounds: [
        [32.55, -97.05],
        [33.05, -96.45],
      ],
    },
    dataFloor: "2017-01-01",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getJurisdiction(slug: string): JurisdictionConfig | undefined {
  return JURISDICTIONS.find((j) => j.id === slug);
}

export function getJurisdictionOrThrow(slug: string): JurisdictionConfig {
  const j = getJurisdiction(slug);
  if (!j) throw new Error(`Unknown jurisdiction: ${slug}`);
  return j;
}

/**
 * Build navigation sections for a jurisdiction, filtering to enabled domains.
 * All hrefs are prefixed with /{jurisdictionId}.
 */
export function getSections(config: JurisdictionConfig): Section[] {
  const sections: Section[] = [];
  for (const domain of config.domains) {
    const defs = DOMAIN_SECTIONS[domain];
    if (!defs) continue;
    for (const def of defs) {
      sections.push({
        ...def,
        href: `/${config.id}${def.href}`,
        pages: def.pages.map((p) => ({
          ...p,
          href: `/${config.id}${p.href}`,
        })),
      });
    }
  }
  return sections;
}
