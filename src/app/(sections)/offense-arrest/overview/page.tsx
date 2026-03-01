"use client";

import { useMemo } from "react";
import { useFilteredIncidents } from "@/hooks/use-incidents";
import { useOffenseStore } from "@/stores/offense-store";
import { computeYTD, computeMonthly, groupByKey, topN } from "@/lib/measures";
import { KPICard } from "@/components/ui/kpi-card";
import { TrendChart } from "@/components/charts/trend-chart";
import { BarChartHorizontal } from "@/components/charts/bar-chart-horizontal";
import { DateRangeSlicer } from "@/components/filters/date-range-slicer";
import { MultiSelect } from "@/components/filters/multi-select";
import { KPIBannerSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";

export default function OffenseOverviewPage() {
  const { filteredData, metadata, isLoading } = useFilteredIncidents();
  const store = useOffenseStore();

  const ytd = useMemo(() => computeYTD(filteredData), [filteredData]);
  const monthly = useMemo(() => computeMonthly(filteredData), [filteredData]);
  const byCategory = useMemo(() => groupByKey(filteredData, (r) => r.ca), [filteredData]);
  const byType = useMemo(() => topN(filteredData, (r) => r.ot, 15), [filteredData]);

  const total = useMemo(() => filteredData.reduce((s, r) => s + r.c, 0), [filteredData]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="font-serif text-lg md:text-xl font-bold">Offense Overview</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border sticky top-0 z-50">
        <DateRangeSlicer
          dateFrom={store.dateFrom}
          dateTo={store.dateTo}
          onDateFromChange={store.setDateFrom}
          onDateToChange={store.setDateTo}
        />
        <MultiSelect
          label="Category"
          options={metadata?.categories ?? []}
          selected={store.offenseCategories}
          onChange={store.setOffenseCategories}
        />
        <MultiSelect
          label="District"
          options={metadata?.districts ?? []}
          selected={store.districts}
          onChange={store.setDistricts}
        />
        <MultiSelect
          label="Zip Code"
          options={metadata?.zipCodes ?? []}
          selected={store.zipCodes}
          onChange={store.setZipCodes}
        />
        {(store.dateFrom || store.dateTo || store.offenseCategories.length > 0 || store.districts.length > 0 || store.zipCodes.length > 0) && (
          <button onClick={store.resetFilters} className="text-xs text-accent hover:underline">
            Clear all
          </button>
        )}
      </div>

      {/* KPI Banner */}
      {isLoading ? (
        <KPIBannerSkeleton />
      ) : (
        <div className="bg-primary rounded-lg grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          <KPICard label="Total Offenses" value={total} />
          <KPICard
            label="YTD Current"
            value={ytd.currentYTD}
            priorValue={ytd.priorYTD}
            pctChange={ytd.pctChange}
          />
          <KPICard label="Person" value={byCategory.find((c) => c.key === "Person")?.count ?? 0} />
          <KPICard label="Property" value={byCategory.find((c) => c.key === "Property")?.count ?? 0} />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <TrendChart data={monthly} title="Monthly Offense Trend" />
            <BarChartHorizontal data={byCategory} title="Offenses by NIBRS Category" />
          </>
        )}
      </div>

      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <BarChartHorizontal data={byType} title="Top Offense Types" />
      )}
    </div>
  );
}
