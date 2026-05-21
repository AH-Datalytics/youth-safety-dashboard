"use client";

import { useMemo, useEffect } from "react";
import { useIncidents, useFilteredIncidents } from "@/hooks/use-incidents";
import { useOffenseStore } from "@/stores/offense-store";
import { DownloadButton } from "@/components/ui/download-button";
import { DOWNLOAD_DOMAINS } from "@/config/download-columns";
import { computeYTDByType } from "@/lib/measures";
import { YtdChangeTable } from "@/components/charts/ytd-change-table";
import { DateRangeSlicer } from "@/components/filters/date-range-slicer";
import { TreeFilter, type TreeNode } from "@/components/filters/tree-filter";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
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

export default function OffenseYTDPage() {
  const { data: rawPayload } = useIncidents();
  const { filteredData, nibrsTree, metadata, isLoading } = useFilteredIncidents();
  const store = useOffenseStore();
  const config = useJurisdiction();
  const sectionPages = getSections(config).find((s) => s.id === "offense-arrest")?.pages ?? [];

  // Prepopulate date range
  useEffect(() => {
    if (metadata && !store.dateFrom && !store.dateTo) {
      store.setDateFrom(defaultDateFrom());
      if (metadata.dataThrough) store.setDateTo(metadata.dataThrough);
    }
  }, [metadata, store.dateFrom, store.dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build tree nodes from nibrsTree
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

  // CompStat table — YTD by offense group, grouped by crimeAgainst hierarchy
  const ytdByType = useMemo(
    () => computeYTDByType(tabFiltered, (r) => r.ca, undefined, (r) => r.cag),
    [tabFiltered],
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <h1 className="font-serif text-lg md:text-xl font-bold">Year-to-Date Offenses</h1>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-lg md:text-xl font-bold">Year-to-Date Offenses</h1>
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

          {/* CompStat table */}
          <YtdChangeTable data={ytdByType} title="Year-to-Date Change by Offense Group" />
        </div>
      </div>
    </div>
  );
}
