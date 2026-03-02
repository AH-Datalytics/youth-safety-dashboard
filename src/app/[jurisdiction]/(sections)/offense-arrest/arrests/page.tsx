"use client";

import { useMemo, useEffect } from "react";
import { useArrests, useFilteredArrests } from "@/hooks/use-arrests";
import { useArrestStore, type DemographicTab } from "@/stores/arrest-store";
import { DownloadButton } from "@/components/ui/download-button";
import { DOWNLOAD_DOMAINS } from "@/config/download-columns";
import { computeYTD, topN } from "@/lib/measures";
import { KPICard } from "@/components/ui/kpi-card";
import { BarChartHorizontal } from "@/components/charts/bar-chart-horizontal";
import { MultiLineChart } from "@/components/charts/multi-line-chart";
import { DateRangeSlicer } from "@/components/filters/date-range-slicer";
import { MultiSelect } from "@/components/filters/multi-select";
import { KPIBannerSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";
import { cn } from "@/lib/utils";

const DEMOGRAPHIC_TABS: { key: DemographicTab; label: string }[] = [
  { key: "youngAdult", label: "Young Adult vs Adult" },
  { key: "ageGroupings", label: "Age Groupings" },
  { key: "sex", label: "Sex" },
  { key: "race", label: "Race" },
];

const arrestsCols = DOWNLOAD_DOMAINS.find((d) => d.domainId === "arrests")!.columns;

export default function ArrestsPage() {
  const { data: rawPayload } = useArrests();
  const { filteredData, metadata, isLoading } = useFilteredArrests();
  const store = useArrestStore();

  // Prepopulate date range
  useEffect(() => {
    if (metadata && !store.dateFrom && !store.dateTo) {
      const year = new Date().getFullYear() - 2;
      store.setDateFrom(`${year}-01-01`);
      if (metadata.dataThrough) store.setDateTo(metadata.dataThrough);
    }
  }, [metadata, store.dateFrom, store.dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Overall YTD
  const ytdAll = useMemo(() => computeYTD(filteredData), [filteredData]);
  const total = useMemo(() => filteredData.reduce((s, r) => s + r.c, 0), [filteredData]);

  // Youth (Young Adult 18-24) stats
  const youthData = useMemo(() => filteredData.filter((r) => r.ya === "Young Adult (18-24)"), [filteredData]);
  const youthTotal = useMemo(() => youthData.reduce((s, r) => s + r.c, 0), [youthData]);
  const ytdYouth = useMemo(() => computeYTD(youthData), [youthData]);

  const byCharge = useMemo(() => topN(filteredData, (r) => r.ch, 15), [filteredData]);

  // Build multi-line chart data
  const { lineData, seriesNames } = useMemo(() => {
    const keyFn = (r: typeof filteredData[number]): string => {
      switch (store.demographicTab) {
        case "youngAdult": return r.ya;
        case "ageGroupings": return r.ag;
        case "sex": return r.sx;
        case "race": return r.ra;
        default: return r.ya;
      }
    };

    const seriesSet = new Set<string>();
    const monthMap = new Map<string, Map<string, number>>();

    for (const r of filteredData) {
      const month = r.d.substring(0, 7);
      const key = keyFn(r);
      if (!key) continue;
      seriesSet.add(key);
      if (!monthMap.has(month)) monthMap.set(month, new Map());
      const inner = monthMap.get(month)!;
      inner.set(key, (inner.get(key) ?? 0) + r.c);
    }

    const names = Array.from(seriesSet).sort();
    const data = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, inner]) => {
        const row: Record<string, unknown> = { month };
        for (const name of names) {
          row[name] = inner.get(name) ?? 0;
        }
        return row;
      });

    return { lineData: data, seriesNames: names };
  }, [filteredData, store.demographicTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="font-serif text-lg md:text-xl font-bold">Arrest Demographics</h1>

      {/* Filter bar */}
      <div className="bg-white p-3 rounded-lg border border-border space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeSlicer
            dateFrom={store.dateFrom}
            dateTo={store.dateTo}
            onDateFromChange={store.setDateFrom}
            onDateToChange={store.setDateTo}
          />
          <MultiSelect
            label="Offense Arrest Status"
            options={metadata?.charges ?? []}
            selected={store.charges}
            onChange={store.setCharges}
          />
          {/* Demographic value filters — always visible, filter ALL page data */}
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
          <MultiSelect
            label="Age Groupings"
            options={metadata?.ageGroups ?? []}
            selected={store.ageGroups}
            onChange={store.setAgeGroups}
          />
          {(store.races.length > 0 || store.sexes.length > 0 || store.ageGroups.length > 0 || store.charges.length > 0) && (
            <button
              onClick={() => { store.setRaces([]); store.setSexes([]); store.setAgeGroups([]); store.setCharges([]); }}
              className="text-xs text-accent hover:underline"
            >
              Clear filters
            </button>
          )}
          <div className="ml-auto">
            <DownloadButton
              domain="arrests"
              columns={arrestsCols}
              filteredData={filteredData}
              fullData={rawPayload?.records ?? []}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Demographic breakdown selector — controls chart grouping */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Chart breakdown:</span>
          {DEMOGRAPHIC_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => store.setDemographicTab(tab.key)}
              className={cn(
                "px-3 py-1.5 text-xs rounded border transition-colors",
                store.demographicTab === tab.key
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-foreground border-border hover:bg-muted",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Banner */}
      {isLoading ? (
        <KPIBannerSkeleton />
      ) : (
        <div className="bg-primary rounded-lg grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          <KPICard label="Total Arrests" value={total} />
          <KPICard
            label="Youth Arrests (18-24)"
            value={youthTotal}
          />
          <KPICard
            label="Youth YTD"
            value={ytdYouth.currentYTD}
            priorValue={ytdYouth.priorYTD}
            pctChange={ytdYouth.pctChange}
          />
          <KPICard
            label="Overall YTD"
            value={ytdAll.currentYTD}
            priorValue={ytdAll.priorYTD}
            pctChange={ytdAll.pctChange}
          />
        </div>
      )}

      {/* Multi-line chart by demographic dimension */}
      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <MultiLineChart
          data={lineData}
          series={seriesNames}
          title={`Arrests by ${DEMOGRAPHIC_TABS.find((t) => t.key === store.demographicTab)?.label ?? "Demographic"}`}
          height={350}
        />
      )}

      {/* Charge breakdown */}
      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <BarChartHorizontal data={byCharge} title="Arrests by Offense Arrest Status" />
      )}
    </div>
  );
}
