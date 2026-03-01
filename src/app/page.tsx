"use client";

import useSWR from "swr";
import { AppShell } from "@/components/layout";
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
    cfs: BannerKPI;
    requests311: BannerKPI;
  };
  offenseArrest: CardSummary | null;
  cfs311: CardSummary | null;
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

export default function HomePage() {
  const { data, isLoading } = useSWR<OverviewData>(
    "/api/overview-summary",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Hero */}
        <div className="mb-6">
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-primary">
            Dallas Youth Safety Dashboard
          </h1>
          <p className="text-sm text-[#666] mt-1">
            Built for the Lone Star Justice Alliance by AH Datalytics
          </p>
        </div>

        {/* KPI Banner */}
        <KPIBanner
          offenses={data?.banner?.offenses ?? null}
          arrests={data?.banner?.arrests ?? null}
          cfs={data?.banner?.cfs ?? null}
          requests311={data?.banner?.requests311 ?? null}
          isLoading={isLoading}
        />

        {/* Section cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DomainCard
            title="Offense & Arrest"
            href="/offense-arrest/overview"
            ytdCount={data?.offenseArrest?.ytdCount ?? null}
            ytdPctChange={data?.offenseArrest?.ytdPctChange ?? null}
            monthlyData={data?.offenseArrest?.monthlyData ?? []}
            isLoading={isLoading}
          />
          <DomainCard
            title="CFS & 311"
            href="/cfs-311/overview"
            ytdCount={data?.cfs311?.ytdCount ?? null}
            ytdPctChange={data?.cfs311?.ytdPctChange ?? null}
            monthlyData={data?.cfs311?.monthlyData ?? []}
            isLoading={isLoading}
          />
          <DomainCard
            title="Youth Court"
            href="/youth-court/referrals"
            ytdCount={data?.youthCourt?.ytdCount ?? null}
            ytdPctChange={data?.youthCourt?.ytdPctChange ?? null}
            monthlyData={data?.youthCourt?.monthlyData ?? []}
            isLoading={isLoading}
            valueLabel="Latest School Year"
          />
          <DomainCard
            title="School Discipline"
            href="/school-discipline/incidents"
            ytdCount={data?.schoolDiscipline?.ytdCount ?? null}
            ytdPctChange={data?.schoolDiscipline?.ytdPctChange ?? null}
            monthlyData={data?.schoolDiscipline?.monthlyData ?? []}
            isLoading={isLoading}
            valueLabel="Latest School Year"
          />
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
                <li>Dallas Police Incidents (2017–present)</li>
                <li>Dallas Arrests</li>
                <li>311 Service Requests</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Partner Data</h3>
              <ul className="text-[#666] space-y-1">
                <li>Dallas Police Calls for Service</li>
                <li>TJJD Youth Court Referrals</li>
                <li>TEA CAMPUS Disciplinary Data</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
