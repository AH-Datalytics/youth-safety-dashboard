"use client";

import { useMemo } from "react";
import { useFilteredTJJD } from "@/hooks/use-tjjd";
import { useTJJDStore } from "@/stores/tjjd-store";
import { groupByKey, topN } from "@/lib/measures";
import { KPICard } from "@/components/ui/kpi-card";
import { BarChartHorizontal } from "@/components/charts/bar-chart-horizontal";
import { DonutChart } from "@/components/charts/donut-chart";
import { MultiSelect } from "@/components/filters/multi-select";
import { KPIBannerSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";
import { DataTable } from "@/components/ui/data-table";

export default function YouthCourtReferralsPage() {
  const { filteredData, metadata, isLoading } = useFilteredTJJD();
  const store = useTJJDStore();

  const total = useMemo(() => filteredData.reduce((s, r) => s + r.c, 0), [filteredData]);
  const byOffense = useMemo(() => topN(filteredData, (r) => r.of, 15), [filteredData]);
  const byRace = useMemo(() => groupByKey(filteredData, (r) => r.ra), [filteredData]);
  const bySex = useMemo(() => groupByKey(filteredData, (r) => r.sx), [filteredData]);
  const byAge = useMemo(() => groupByKey(filteredData, (r) => r.ag), [filteredData]);
  const byCounty = useMemo(
    () =>
      groupByKey(filteredData, (r) => r.co).map((c) => ({
        county: c.key,
        count: c.count,
      })),
    [filteredData],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="font-serif text-lg md:text-xl font-bold">Youth Court Referrals</h1>

      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border sticky top-0 z-50">
        {metadata?.schoolYears && (
          <select
            value={store.schoolYear ?? ""}
            onChange={(e) => store.setSchoolYear(e.target.value || null)}
            className="border border-border rounded px-2 py-1 text-sm bg-white"
          >
            <option value="">All School Years</option>
            {metadata.schoolYears.map((sy) => (
              <option key={sy} value={sy}>{sy}</option>
            ))}
          </select>
        )}
        <MultiSelect
          label="Offense"
          options={metadata?.offenses ?? []}
          selected={store.offenses}
          onChange={store.setOffenses}
        />
        <MultiSelect
          label="Race"
          options={metadata?.races ?? []}
          selected={store.races}
          onChange={store.setRaces}
        />
        <MultiSelect
          label="Sex"
          options={metadata?.sexes ?? []}
          selected={store.sexes}
          onChange={store.setSexes}
        />
      </div>

      {isLoading ? (
        <KPIBannerSkeleton />
      ) : (
        <div className="bg-primary rounded-lg grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          <KPICard label="Total Referrals" value={total} />
          <KPICard label="Offense Types" value={metadata?.offenses?.length ?? 0} />
          <KPICard label="Counties" value={metadata?.counties?.length ?? 0} />
          <KPICard label="School Years" value={metadata?.schoolYears?.length ?? 0} />
        </div>
      )}

      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <BarChartHorizontal data={byOffense} title="Referrals by Offense Type" />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <DonutChart data={byRace} title="Race Distribution" />
            <DonutChart data={bySex} title="Sex Distribution" />
            <DonutChart data={byAge} title="Age Group Distribution" />
          </>
        )}
      </div>

      {!isLoading && (
        <DataTable
          title="County Breakdown"
          columns={[
            { key: "county", header: "County" },
            { key: "count", header: "Referrals", align: "right", numeric: true },
          ]}
          data={byCounty}
        />
      )}
    </div>
  );
}
