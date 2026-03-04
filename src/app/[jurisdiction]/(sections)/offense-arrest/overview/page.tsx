"use client";

import { useMemo, useEffect } from "react";
import { useIncidents, useFilteredIncidents } from "@/hooks/use-incidents";
import { useOffenseStore } from "@/stores/offense-store";
import { DownloadButton } from "@/components/ui/download-button";
import { DOWNLOAD_DOMAINS } from "@/config/download-columns";
import { computeMonthly, computeYTD, computeYTDByType } from "@/lib/measures";
import { MonthlyBarChart } from "@/components/charts/monthly-bar-chart";
import { YtdChangeTable } from "@/components/charts/ytd-change-table";
import { TimeMatrix } from "@/components/charts/time-matrix";
import { DateRangeSlicer } from "@/components/filters/date-range-slicer";
import { TreeFilter, type TreeNode } from "@/components/filters/tree-filter";
import { KPICard } from "@/components/ui/kpi-card";
import { KPIBannerSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";
import { cn } from "@/lib/utils";
import { PageToggle } from "@/components/ui/page-toggle";
import { useJurisdiction } from "@/lib/jurisdiction-context";
import { getSections } from "@/lib/jurisdictions";

const CASE_STATUS_TABS = [
  "All",
  "Cleared (Arrestee Age 17 or Under)",
  "Cleared (Arrestee 18 or Older)",
  "Open",
  "Closed",
  "Suspended",
  "Unknown",
] as const;

/** Compute default date range: Jan 1 of 2 years ago through data end */
function defaultDateFrom(): string {
  const year = new Date().getFullYear() - 2;
  return `${year}-01-01`;
}

const incidentsCols = DOWNLOAD_DOMAINS.find((d) => d.domainId === "incidents")!.columns;

export default function OffenseOverviewPage() {
  const { data: rawPayload } = useIncidents();
  const { filteredData, hourly, nibrsTree, metadata, isLoading } = useFilteredIncidents();
  const store = useOffenseStore();
  const config = useJurisdiction();
  const sectionPages = getSections(config).find((s) => s.id === "offense-arrest")?.pages ?? [];

  // Prepopulate date range: last 2 full years + YTD
  useEffect(() => {
    if (metadata && !store.dateFrom && !store.dateTo) {
      store.setDateFrom(defaultDateFrom());
      if (metadata.dataThrough) store.setDateTo(metadata.dataThrough);
    }
  }, [metadata, store.dateFrom, store.dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build tree nodes from nibrsTree (flat → nested by crimeAgainst)
  const treeNodes: TreeNode[] = useMemo(() => {
    if (!nibrsTree || nibrsTree.length === 0) return [];
    const grouped = new Map<string, { group: string; codes: { code: string; description: string }[] }[]>();
    for (const node of nibrsTree) {
      if (!grouped.has(node.crimeAgainst)) grouped.set(node.crimeAgainst, []);
      grouped.get(node.crimeAgainst)!.push({ group: node.offenseGroup, codes: node.nibrsCodes });
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ca, groups]) => ({
        label: ca,
        children: groups
          .sort((a, b) => a.group.localeCompare(b.group))
          .map((og) => ({
            label: og.group,
            children: og.codes.map((code) => ({
              label: code.description,
            })),
          })),
      }));
  }, [nibrsTree]);

  // Filter by case status tab
  const tabFiltered = useMemo(() => {
    if (store.activeCaseStatus === "All") return filteredData;
    return filteredData.filter((r) => r.cs === store.activeCaseStatus);
  }, [filteredData, store.activeCaseStatus]);

  // KPIs
  const ytd = useMemo(() => computeYTD(tabFiltered), [tabFiltered]);
  const total = useMemo(() => tabFiltered.reduce((s, r) => s + r.c, 0), [tabFiltered]);

  // Arrest-age KPIs (computed from all filteredData, not tab-filtered)
  const under17 = useMemo(() => {
    const subset = filteredData.filter((r) => r.cs === "Cleared (Arrestee Age 17 or Under)");
    return { total: subset.reduce((s, r) => s + r.c, 0), ytd: computeYTD(subset) };
  }, [filteredData]);
  const over18 = useMemo(() => {
    const subset = filteredData.filter((r) => r.cs === "Cleared (Arrestee 18 or Older)");
    return { total: subset.reduce((s, r) => s + r.c, 0), ytd: computeYTD(subset) };
  }, [filteredData]);

  // Monthly bar chart
  const monthly = useMemo(() => computeMonthly(tabFiltered), [tabFiltered]);

  // CompStat table — YTD by offense group, grouped by crimeAgainst hierarchy
  const ytdByType = useMemo(
    () => computeYTDByType(tabFiltered, (r) => r.ca, undefined, (r) => r.cag),
    [tabFiltered],
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <h1 className="font-serif text-lg md:text-xl font-bold">Offense Overview</h1>
        <KPIBannerSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-lg md:text-xl font-bold">Offense Overview</h1>
        <PageToggle pages={sectionPages} />
      </div>

      <div className="flex gap-6">
        {/* Left sidebar — NIBRS tree filter */}
        {treeNodes.length > 0 && (
          <div className="hidden lg:block w-64 shrink-0">
            <TreeFilter
              label="Offense Type"
              nodes={treeNodes}
              selected={store.nibrsCodes}
              onChange={store.setNibrsCodes}
              variant="panel"
            />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Filters bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border">
            <DateRangeSlicer
              dateFrom={store.dateFrom}
              dateTo={store.dateTo}
              onDateFromChange={store.setDateFrom}
              onDateToChange={store.setDateTo}
              min={metadata?.dataFrom}
              max={metadata?.dataThrough}
            />
            {/* Mobile-only NIBRS tree dropdown */}
            {treeNodes.length > 0 && (
              <div className="lg:hidden">
                <TreeFilter
                  label="Offense Type"
                  nodes={treeNodes}
                  selected={store.nibrsCodes}
                  onChange={store.setNibrsCodes}
                />
              </div>
            )}
            {store.nibrsCodes.length > 0 && (
              <button onClick={() => store.setNibrsCodes([])} className="text-xs text-accent hover:underline">
                Clear filters
              </button>
            )}
            <div className="ml-auto">
              <DownloadButton
                domain="incidents"
                columns={incidentsCols}
                filteredData={filteredData}
                fullData={rawPayload?.records ?? []}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Case Status Tabs */}
          <div className="flex flex-wrap gap-1">
            {CASE_STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => store.setActiveCaseStatus(tab)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded border transition-colors",
                  store.activeCaseStatus === tab
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-foreground border-border hover:bg-muted",
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* KPI Banner */}
          <div className="bg-primary rounded-lg grid grid-cols-2 md:grid-cols-5 divide-x divide-white/10">
            <KPICard label="Total Offenses" value={total} />
            <KPICard
              label="YTD Current"
              value={ytd.currentYTD}
              priorValue={ytd.priorYTD}
              pctChange={ytd.pctChange}
            />
            <KPICard label="YTD Prior Year" value={ytd.priorYTD} />
            <KPICard
              label="Arrests (17 & Under)"
              value={under17.ytd.currentYTD}
              priorValue={under17.ytd.priorYTD}
              pctChange={under17.ytd.pctChange}
            />
            <KPICard
              label="Arrests (18 & Older)"
              value={over18.ytd.currentYTD}
              priorValue={over18.ytd.priorYTD}
              pctChange={over18.ytd.pctChange}
            />
          </div>
          {metadata?.dataThrough && (
            <p className="text-xs text-muted-foreground -mt-2">
              Data through {metadata.dataThrough}
            </p>
          )}

          {/* Monthly bar chart */}
          <MonthlyBarChart data={monthly} title="# of Offenses by Year and Month" />

          {/* CompStat table */}
          <YtdChangeTable data={ytdByType} title="Year-to-Date Change by Offense Group" />

          {/* Heat map */}
          <TimeMatrix data={hourly} title="Hour x Day of Week Heat Map" />
        </div>
      </div>
    </div>
  );
}
