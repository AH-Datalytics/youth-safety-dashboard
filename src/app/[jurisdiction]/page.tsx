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
}

interface OverviewData {
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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-primary">
          {config.shortName} Youth Safety Dashboard
        </h1>
        <p className="text-sm text-[#666] mt-1">
          Built for {config.org} by AH Datalytics
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
            valueLabel="Latest School Year"
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
            <h3 className="font-semibold mb-1">Open Data (Socrata API)</h3>
            <ul className="text-[#666] space-y-1">
              <li>{config.shortName} Police Incidents (2017–present)</li>
              <li>{config.shortName} Arrests</li>
              <li>311 Service Requests</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Partner Data</h3>
            <ul className="text-[#666] space-y-1">
              <li>{config.shortName} Police Calls for Service</li>
              <li>TJJD Youth Court Referrals</li>
              <li>TEA CAMPUS Disciplinary Data</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
