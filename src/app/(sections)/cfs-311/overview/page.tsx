"use client";

import { useMemo } from "react";
import { useFilteredCFS } from "@/hooks/use-cfs";
import { useCFSStore } from "@/stores/cfs-store";
import { computeYTD, computeMonthly, groupByKey, topN } from "@/lib/measures";
import { KPICard } from "@/components/ui/kpi-card";
import { TrendChart } from "@/components/charts/trend-chart";
import { BarChartHorizontal } from "@/components/charts/bar-chart-horizontal";
import { DonutChart } from "@/components/charts/donut-chart";
import { DateRangeSlicer } from "@/components/filters/date-range-slicer";
import { MultiSelect } from "@/components/filters/multi-select";
import { KPIBannerSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";

export default function CFSOverviewPage() {
  const { filteredData, metadata, isLoading } = useFilteredCFS();
  const store = useCFSStore();

  const ytd = useMemo(() => computeYTD(filteredData), [filteredData]);
  const monthly = useMemo(() => computeMonthly(filteredData), [filteredData]);
  const byType = useMemo(() => topN(filteredData, (r) => r.ct, 15), [filteredData]);
  const byPriority = useMemo(() => groupByKey(filteredData, (r) => r.pr), [filteredData]);
  const total = useMemo(() => filteredData.reduce((s, r) => s + r.c, 0), [filteredData]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="font-serif text-lg md:text-xl font-bold">Calls for Service Overview</h1>

      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border sticky top-0 z-50">
        <DateRangeSlicer
          dateFrom={store.dateFrom}
          dateTo={store.dateTo}
          onDateFromChange={store.setDateFrom}
          onDateToChange={store.setDateTo}
        />
        <MultiSelect
          label="Call Type"
          options={metadata?.callTypes ?? []}
          selected={store.callTypes}
          onChange={store.setCallTypes}
        />
        <MultiSelect
          label="Priority"
          options={metadata?.priorities ?? []}
          selected={store.priorities}
          onChange={store.setPriorities}
        />
        <MultiSelect
          label="District"
          options={metadata?.districts ?? []}
          selected={store.districts}
          onChange={store.setDistricts}
        />
      </div>

      {isLoading ? (
        <KPIBannerSkeleton />
      ) : (
        <div className="bg-primary rounded-lg grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          <KPICard label="Total Calls" value={total} />
          <KPICard label="Avg Daily" value={metadata?.summary?.avgDaily ?? 0} />
          <KPICard
            label="YTD Current"
            value={ytd.currentYTD}
            priorValue={ytd.priorYTD}
            pctChange={ytd.pctChange}
          />
          <KPICard label="Unique Types" value={metadata?.callTypes?.length ?? 0} />
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
            <TrendChart data={monthly} title="Monthly CFS Trend" />
            <DonutChart data={byPriority} title="Priority Distribution" />
          </>
        )}
      </div>

      {isLoading ? <ChartSkeleton /> : <BarChartHorizontal data={byType} title="CFS by Call Type" />}
    </div>
  );
}
