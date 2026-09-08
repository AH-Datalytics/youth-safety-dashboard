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

  /**
   * ArcGIS Feature Service layers, for portals that aren't Socrata.
   * Fort Worth retired its Socrata portal in favour of an ArcGIS Hub site.
   */
  arcgis?: {
    /** Layer URL for crime/incident records (no trailing /query). */
    incidents: string;
    /** Field mapping from the layer's schema onto the incident payload. */
    incidentFields: {
      /** Reported datetime — ISO string or epoch ms. */
      date: string;
      /** NIBRS (or local) offense code. */
      offenseCode: string;
      /** Human-readable offense description. */
      offenseDesc: string;
      /** District/area field used for the district filter. */
      district: string;
      /** "(lat, lon)" string field used for map points. */
      location: string;
    };
  };

  /** TEA county name used to filter the statewide CAMPUS discipline extract. */
  teaCounty?: string;

  /**
   * Set when a calls-for-service source file exists for this jurisdiction.
   * The CFS source file is shared across the repo, so presence on disk can't
   * distinguish jurisdictions — this flag has to be explicit.
   */
  cfsSource?: "local-file";

  /** Where youth-court referral counts come from. */
  youthCourt?:
    | {
        /** Client-supplied Family Code 58.009 extract in data/source/. */
        kind: "local-excel";
      }
    | {
        /** TJJD statewide county-level referral data on data.texas.gov. */
        kind: "tjjd-county";
        /** County name as spelled in the TJJD dataset, e.g. "TARRANT". */
        county: string;
      };

  /**
   * Page ids hidden for this jurisdiction — used where a domain is mostly
   * available but one page's source dataset does not exist locally.
   */
  hiddenPages?: string[];

  /**
   * Measures this jurisdiction's sources cannot produce. Listed measures render
   * as "not published" instead of zero, so a missing field is never mistaken
   * for a real count of zero.
   *
   * - `youth-clearance`: the arrestee-age clearance breakdown, which requires a
   *   clearance/disposition field on the offense records.
   */
  unavailableMeasures?: Array<"youth-clearance">;

  /**
   * Per-domain notice rendered above a page whose source data isn't available
   * for this jurisdiction yet. Keeps a scaffolded page honest rather than
   * looking broken.
   */
  dataNotices?: Partial<Record<DomainId, string>>;

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
    geo: {
      center: [32.7767, -96.797],
      zoom: 11,
      bounds: [
        [32.55, -97.05],
        [33.05, -96.45],
      ],
    },
    dataFloor: "2017-01-01",
    teaCounty: "DALLAS COUNTY",
    cfsSource: "local-file",
    youthCourt: { kind: "local-excel" },
  },
  {
    id: "tarrant",
    name: "Tarrant County",
    shortName: "Tarrant",
    org: "Lone Star Justice Alliance",
    orgShort: "LSJA",
    logo: "/logos/lsja-logo.png",
    description: "Youth public safety data for Tarrant County",
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
    // Fort Worth publishes no arrest dataset, so the Demographics page (which
    // is entirely arrest-based) has nothing to render.
    hiddenPages: ["arrests"],
    // Fort Worth's crime layer has no clearance/disposition field.
    unavailableMeasures: ["youth-clearance"],
    dataNotices: {
      cfs:
        "Fort Worth does not publish a calls-for-service dataset. This page is " +
        "scaffolded and will populate once a public-records request to Fort Worth " +
        "PD is fulfilled.",
      "311":
        "Fort Worth does not publish MyFW/311 service requests as open data. " +
        "This page is scaffolded; the closest available substitute is the city's " +
        "Code Violations table.",
    },
    arcgis: {
      incidents:
        "https://services5.arcgis.com/3ddLCBXe1bRt7mzj/arcgis/rest/services/" +
        "CFW_Open_Data_Police_Crime_Data_Table_view/FeatureServer/0",
      incidentFields: {
        date: "Reported_Date",
        offenseCode: "Offense",
        offenseDesc: "Offense_Desc",
        district: "CouncilDistrict",
        location: "Location_1",
      },
    },
    geo: {
      center: [32.7555, -97.3308],
      zoom: 11,
      bounds: [
        [32.55, -97.6],
        [33.0, -97.0],
      ],
    },
    dataFloor: "2017-01-01",
    teaCounty: "TARRANT COUNTY",
    youthCourt: { kind: "tjjd-county", county: "TARRANT" },
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
 * Build navigation sections for a jurisdiction, filtering to enabled domains
 * and dropping any page listed in `hiddenPages`. A section whose every page is
 * hidden is dropped entirely; a section that keeps some pages points at the
 * first surviving one.
 *
 * All hrefs are prefixed with /{jurisdictionId}.
 */
export function getSections(config: JurisdictionConfig): Section[] {
  const hidden = new Set(config.hiddenPages ?? []);
  const sections: Section[] = [];

  for (const domain of config.domains) {
    const defs = DOMAIN_SECTIONS[domain];
    if (!defs) continue;
    for (const def of defs) {
      const pages = def.pages.filter((p) => !hidden.has(p.id));
      if (pages.length === 0) continue;
      // If the section's landing page was hidden, fall back to the first
      // page that survived the filter.
      const landing = def.pages.some((p) => p.href === def.href && !hidden.has(p.id))
        ? def.href
        : pages[0].href;
      sections.push({
        ...def,
        href: `/${config.id}${landing}`,
        pages: pages.map((p) => ({
          ...p,
          href: `/${config.id}${p.href}`,
        })),
      });
    }
  }
  return sections;
}

/** True when a page id is hidden for this jurisdiction. */
export function isPageHidden(config: JurisdictionConfig, pageId: string): boolean {
  return (config.hiddenPages ?? []).includes(pageId);
}
