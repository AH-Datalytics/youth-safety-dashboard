"use client";

import useSWR from "swr";
import { useJurisdiction } from "@/lib/jurisdiction-context";
import { useApiUrl } from "@/hooks/use-api-url";
import { KPIBanner } from "@/components/overview/kpi-banner";
import { DomainCard } from "@/components/overview/domain-card";

// ---- Types ----

interface BannerKPI {
  count: number;
  pctChange: number | null;
}

interface CardSummary {
  ytdCount: number;
  ytdPctChange: number | null;
  monthlyData: Array<{ month: string; count: number }>;
  /** Period the headline count covers, e.g. "Jan–Aug 2026". */
  label?: string;
}

interface OverviewData {
  lastUpdated?: string;
  banner: {
    offenses: BannerKPI;
    arrests: BannerKPI;
    clearedUnder17: BannerKPI;
    clearedOver18: BannerKPI;
    requests311: BannerKPI;
  };
  offenseArrest: CardSummary | null;
  requests311: CardSummary | null;
  youthCourt: CardSummary | null;
  schoolDiscipline: CardSummary | null;
}

// ---- Data fetcher ----

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
};

// ---- Component ----

export default function JurisdictionHomePage() {
  const config = useJurisdiction();
  const overviewUrl = useApiUrl("overview-summary");

  const { data, isLoading } = useSWR<OverviewData>(
    overviewUrl,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const prefix = `/${config.id}`;
  // Dallas publishes as the county; Fort Worth's ArcGIS layer is city-scoped.
  const openDataLabel = config.arcgis ? "Fort Worth" : config.shortName;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-primary">
          {config.shortName} Youth Safety Dashboard
        </h1>
        <p className="text-sm text-[#666] mt-1">
          Built for {config.org} by AH Datalytics
          {data?.lastUpdated && (
            <span className="ml-3 text-xs text-[#999]">
              Data updated {new Date(data.lastUpdated).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
          )}
        </p>
      </div>

      {/* KPI Banner */}
      <KPIBanner
        offenses={data?.banner?.offenses ?? null}
        arrests={data?.banner?.arrests ?? null}
        clearedUnder17={data?.banner?.clearedUnder17 ?? null}
        clearedOver18={data?.banner?.clearedOver18 ?? null}
        requests311={data?.banner?.requests311 ?? null}
        isLoading={isLoading}
        unavailableMeasures={config.unavailableMeasures ?? []}
      />

      {/* Section cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config.domains.includes("offense-arrest") && (
          <DomainCard
            title="Offense & Arrest"
            href={`${prefix}/offense-arrest/overview`}
            ytdCount={data?.offenseArrest?.ytdCount ?? null}
            ytdPctChange={data?.offenseArrest?.ytdPctChange ?? null}
            monthlyData={data?.offenseArrest?.monthlyData ?? []}
            isLoading={isLoading}
          />
        )}
        {config.domains.includes("311") && (
          <DomainCard
            title="311 Requests"
            href={`${prefix}/cfs-311/requests`}
            ytdCount={data?.requests311?.ytdCount ?? null}
            ytdPctChange={data?.requests311?.ytdPctChange ?? null}
            monthlyData={data?.requests311?.monthlyData ?? []}
            isLoading={isLoading}
            invertColor={true}
            unavailable={(config.unavailableMeasures ?? []).includes("311")}
          />
        )}
        {config.domains.includes("youth-court") && (
          <DomainCard
            title="Youth Court"
            href={`${prefix}/youth-court/referrals`}
            ytdCount={data?.youthCourt?.ytdCount ?? null}
            ytdPctChange={data?.youthCourt?.ytdPctChange ?? null}
            monthlyData={data?.youthCourt?.monthlyData ?? []}
            isLoading={isLoading}
            valueLabel={data?.youthCourt?.label ?? "Latest Year"}
          />
        )}
        {config.domains.includes("school-discipline") && (
          <DomainCard
            title="School Discipline"
            href={`${prefix}/school-discipline/incidents`}
            ytdCount={data?.schoolDiscipline?.ytdCount ?? null}
            ytdPctChange={data?.schoolDiscipline?.ytdPctChange ?? null}
            monthlyData={data?.schoolDiscipline?.monthlyData ?? []}
            isLoading={isLoading}
            valueLabel="Latest School Year"
          />
        )}
      </div>

      {/* Data Sources */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wider mb-4 border-t border-primary pt-4">
          Data Sources
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold mb-1">
              {config.socrata ? "Open Data (Socrata API)" : "Open Data (ArcGIS)"}
            </h3>
            <ul className="text-[#666] space-y-1">
              <li>{openDataLabel} Police Incidents (2017–present)</li>
              {config.socrata && <li>{config.shortName} Arrests</li>}
              {config.socrata && <li>311 Service Requests</li>}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Partner &amp; State Data</h3>
            <ul className="text-[#666] space-y-1">
              {config.cfsSource && <li>{config.shortName} Police Calls for Service</li>}
              <li>TJJD Youth Court Referrals</li>
              <li>TEA CAMPUS Disciplinary Data</li>
            </ul>
          </div>
        </div>
        {config.arcgis && (
          <p className="text-xs text-[#999] mt-3">
            Offense data covers the City of Fort Worth. No other jurisdiction in{" "}
            {config.name} publishes incident-level crime data.
          </p>
        )}
      </section>
    </div>
  );
}
