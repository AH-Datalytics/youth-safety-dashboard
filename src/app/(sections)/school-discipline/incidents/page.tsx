"use client";

import { useMemo } from "react";
import { useFilteredCampus } from "@/hooks/use-campus";
import { useCampusStore } from "@/stores/campus-store";
import { groupByKey, topN } from "@/lib/measures";
import { KPICard } from "@/components/ui/kpi-card";
import { TrendChart } from "@/components/charts/trend-chart";
import { BarChartHorizontal } from "@/components/charts/bar-chart-horizontal";
import { DonutChart } from "@/components/charts/donut-chart";
import { MultiSelect } from "@/components/filters/multi-select";
import { KPIBannerSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";

export default function SchoolIncidentsPage() {
  const { filteredData, metadata, isLoading } = useFilteredCampus();
  const store = useCampusStore();

  const total = useMemo(() => filteredData.reduce((s, r) => s + r.c, 0), [filteredData]);

  const bySY = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredData) {
      map.set(r.sy, (map.get(r.sy) ?? 0) + r.c);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  }, [filteredData]);

  const byCategory = useMemo(() => groupByKey(filteredData, (r) => r.ca), [filteredData]);
  const byCampus = useMemo(() => topN(filteredData, (r) => r.cn, 15), [filteredData]);
  const byRace = useMemo(() => groupByKey(filteredData, (r) => r.ra), [filteredData]);
  const bySex = useMemo(() => groupByKey(filteredData, (r) => r.sx), [filteredData]);
  const byGrade = useMemo(() => groupByKey(filteredData, (r) => r.gr), [filteredData]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="font-serif text-lg md:text-xl font-bold">Disciplinary Incidents</h1>

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
          label="Campus"
          options={metadata?.campuses ?? []}
          selected={store.campuses}
          onChange={store.setCampuses}
        />
        <MultiSelect
          label="Category"
          options={metadata?.categories ?? []}
          selected={store.categories}
          onChange={store.setCategories}
        />
        <MultiSelect
          label="Race"
          options={metadata?.races ?? []}
          selected={store.races}
          onChange={store.setRaces}
        />
      </div>

      {isLoading ? (
        <KPIBannerSkeleton />
      ) : (
        <div className="bg-primary rounded-lg grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          <KPICard label="Total Incidents" value={total} />
          <KPICard label="Campuses" value={metadata?.campuses?.length ?? 0} />
          <KPICard label="Categories" value={metadata?.categories?.length ?? 0} />
          <KPICard label="School Years" value={metadata?.schoolYears?.length ?? 0} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <TrendChart data={bySY} title="Incidents by School Year" />
            <BarChartHorizontal data={byCategory} title="Incidents by Category" />
          </>
        )}
      </div>

      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <BarChartHorizontal data={byCampus} title="Top Campuses by Incident Count" />
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
            <DonutChart data={byGrade} title="Grade Distribution" />
          </>
        )}
      </div>
    </div>
  );
}
