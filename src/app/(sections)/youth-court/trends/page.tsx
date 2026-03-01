"use client";

import { useMemo } from "react";
import { useFilteredTJJD } from "@/hooks/use-tjjd";
import { useTJJDStore } from "@/stores/tjjd-store";
import { groupByKey } from "@/lib/measures";
import { TrendChart } from "@/components/charts/trend-chart";
import { StackedBarChart } from "@/components/charts/stacked-bar-chart";
import { MultiSelect } from "@/components/filters/multi-select";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";

export default function YouthCourtTrendsPage() {
  const { filteredData, metadata, isLoading } = useFilteredTJJD();
  const store = useTJJDStore();

  // Annual trend
  const annualTrend = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredData) {
      map.set(r.sy, (map.get(r.sy) ?? 0) + r.c);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  }, [filteredData]);

  // Stacked by offense category per school year
  const stackedData = useMemo(() => {
    const byYear = new Map<string, Map<string, number>>();
    const offenseSet = new Set<string>();

    for (const r of filteredData) {
      if (!byYear.has(r.sy)) byYear.set(r.sy, new Map());
      const inner = byYear.get(r.sy)!;
      inner.set(r.of, (inner.get(r.of) ?? 0) + r.c);
      offenseSet.add(r.of);
    }

    // Get top 5 offenses by total
    const offenseTotals = groupByKey(filteredData, (r) => r.of);
    const topOffenses = offenseTotals.slice(0, 5).map((o) => o.key);

    const data = Array.from(byYear.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, inner]) => {
        const row: Record<string, unknown> = { year };
        for (const off of topOffenses) {
          row[off] = inner.get(off) ?? 0;
        }
        return row;
      });

    return { data, categories: topOffenses };
  }, [filteredData]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="font-serif text-lg md:text-xl font-bold">Referrals Over Time</h1>

      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border sticky top-0 z-50">
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
          label="Age Group"
          options={metadata?.ageGroups ?? []}
          selected={store.ageGroups}
          onChange={store.setAgeGroups}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <TrendChart data={annualTrend} title="Annual Referral Trend" />
            <StackedBarChart
              data={stackedData.data}
              categories={stackedData.categories}
              xKey="year"
              title="Referrals by Offense Category"
            />
          </>
        )}
      </div>
    </div>
  );
}
