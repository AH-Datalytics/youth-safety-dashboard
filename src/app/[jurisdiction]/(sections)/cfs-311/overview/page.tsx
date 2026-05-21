"use client";

import { useMemo, useEffect } from "react";
import { useCFS, useFilteredCFS } from "@/hooks/use-cfs";
import { useCFSStore } from "@/stores/cfs-store";
import { DownloadButton } from "@/components/ui/download-button";
import { DOWNLOAD_DOMAINS } from "@/config/download-columns";
import { computeMonthly, groupByKey } from "@/lib/measures";
import { MonthlyBarChart } from "@/components/charts/monthly-bar-chart";
import { BarChartHorizontal } from "@/components/charts/bar-chart-horizontal";
import { TimeMatrix } from "@/components/charts/time-matrix";
import { DateRangeSlicer } from "@/components/filters/date-range-slicer";
import { MultiSelect } from "@/components/filters/multi-select";
import { TreeFilter, type TreeNode } from "@/components/filters/tree-filter";
import { KPICard } from "@/components/ui/kpi-card";
import { KPIBannerSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";
import { PageToggle } from "@/components/ui/page-toggle";
import { useJurisdiction } from "@/lib/jurisdiction-context";
import { getSections } from "@/lib/jurisdictions";

/** Default date: Jan 1 of 2 years ago */
function defaultDateFrom(): string {
  const year = new Date().getFullYear() - 2;
  return `${year}-01-01`;
}

const cfsCols = DOWNLOAD_DOMAINS.find((d) => d.domainId === "cfs")!.columns;

export default function CFSOverviewPage() {
  const { data: rawPayload } = useCFS();
  const { filteredData, hourly, categoryTree, metadata, isLoading } = useFilteredCFS();
  const store = useCFSStore();
  const config = useJurisdiction();
  const sectionPages = getSections(config).find((s) => s.id === "cfs-311")?.pages ?? [];

  // Prepopulate date range
  useEffect(() => {
    if (metadata && !store.dateFrom && !store.dateTo) {
      store.setDateFrom(defaultDateFrom());
      if (metadata.dataThrough) store.setDateTo(metadata.dataThrough);
    }
  }, [metadata, store.dateFrom, store.dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthly = useMemo(() => computeMonthly(filteredData), [filteredData]);
  const byCategory = useMemo(() => groupByKey(filteredData, (r) => r.cat || r.ct), [filteredData]);
  const total = useMemo(() => filteredData.reduce((s, r) => s + r.c, 0), [filteredData]);

  // Build call type tree from categoryTree
  const treeNodes: TreeNode[] = useMemo(() => {
    if (!categoryTree || categoryTree.length === 0) return [];
    return categoryTree.map((node) => ({
      label: node.category,
      children: node.subCategories.map((sc) => ({ label: sc })),
    }));
  }, [categoryTree]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <h1 className="font-serif text-lg md:text-xl font-bold">Calls for Service Overview</h1>
        <KPIBannerSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-lg md:text-xl font-bold">Calls for Service Overview</h1>
        <PageToggle pages={sectionPages} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border">
        <DateRangeSlicer
          dateFrom={store.dateFrom}
          dateTo={store.dateTo}
          onDateFromChange={store.setDateFrom}
          onDateToChange={store.setDateTo}
          min={metadata?.dataThrough ? "2020-01-01" : undefined}
          max={metadata?.dataThrough}
        />
        {treeNodes.length > 0 && (
          <TreeFilter
            label="Call Type"
            nodes={treeNodes}
            selected={store.categories}
            onChange={store.setCategories}
          />
        )}
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
        <MultiSelect
          label="Disposition"
          options={metadata?.dispositionGroups ?? []}
          selected={store.dispositionGroups}
          onChange={store.setDispositionGroups}
        />
        <div className="ml-auto">
          <DownloadButton
            domain="cfs"
            columns={cfsCols}
            filteredData={filteredData}
            fullData={rawPayload?.records ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* KPI Banner */}
      <div className="bg-primary rounded-lg grid grid-cols-2 md:grid-cols-3 divide-x divide-white/10">
        <KPICard label="Total Calls" value={total} />
        <KPICard
          label="Avg Response Time (Min)"
          value={metadata?.summary?.avgResponseTime ?? 0}
          decimals={1}
        />
        <KPICard
          label="Avg Time Spent (Min)"
          value={metadata?.summary?.avgTimeSpent ?? 0}
          decimals={1}
        />
      </div>
      {metadata?.dataThrough && (
        <p className="text-xs text-muted-foreground -mt-2">
          Data through {metadata.dataThrough}
        </p>
      )}

      {/* Monthly bar chart */}
      <MonthlyBarChart data={monthly} title="# of CFS by Year and Month" />

      {/* Call type breakdown */}
      <BarChartHorizontal data={byCategory} title="# of CFS by Call Type" />

      {/* Heat map */}
      <TimeMatrix data={hourly} title="Hour x Day of Week Heat Map" />
    </div>
  );
}
