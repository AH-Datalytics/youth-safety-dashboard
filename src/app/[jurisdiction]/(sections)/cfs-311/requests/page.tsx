"use client";

import { useMemo, useEffect, useCallback } from "react";
import { useFiltered311 } from "@/hooks/use-311";
import { useRequests311Store } from "@/stores/requests311-store";
import { computeMonthly, computeYTD, groupByKey } from "@/lib/measures";
import { MonthlyBarChart } from "@/components/charts/monthly-bar-chart";
import { BarChartHorizontal } from "@/components/charts/bar-chart-horizontal";
import { DateRangeSlicer } from "@/components/filters/date-range-slicer";
import { MultiSelect } from "@/components/filters/multi-select";
import { KPICard } from "@/components/ui/kpi-card";
import { KPIBannerSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";

/** Default date: Jan 1 of 2 years ago */
function defaultDateFrom(): string {
  const year = new Date().getFullYear() - 2;
  return `${year}-01-01`;
}

export default function Requests311Page() {
  const { filteredData, metadata, isLoading } = useFiltered311();
  const store = useRequests311Store();

  // Prepopulate date range
  useEffect(() => {
    if (metadata && !store.dateFrom && !store.dateTo) {
      store.setDateFrom(defaultDateFrom());
      if (metadata.dataThrough) store.setDateTo(metadata.dataThrough);
    }
  }, [metadata, store.dateFrom, store.dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthly = useMemo(() => computeMonthly(filteredData), [filteredData]);
  const byPriority = useMemo(() => groupByKey(filteredData, (r) => r.pg), [filteredData]);
  const byStatus = useMemo(() => groupByKey(filteredData, (r) => r.st), [filteredData]);
  const byType = useMemo(() => groupByKey(filteredData, (r) => r.rt), [filteredData]);
  const total = useMemo(() => filteredData.reduce((s, r) => s + r.c, 0), [filteredData]);
  const ytd = useMemo(() => computeYTD(filteredData), [filteredData]);

  // Toggle handlers for interactive chart filtering
  const togglePriority = useCallback((key: string) => {
    if (!key) { store.setPriorityGroups([]); return; }
    const current = store.priorityGroups;
    store.setPriorityGroups(
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  }, [store]);

  const toggleRequestType = useCallback((key: string) => {
    if (!key) { store.setRequestTypes([]); return; }
    const current = store.requestTypes;
    store.setRequestTypes(
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  }, [store]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        <h1 className="font-serif text-lg md:text-xl font-bold">311 Requests — Code Compliance</h1>
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
      <h1 className="font-serif text-lg md:text-xl font-bold">311 Requests — Code Compliance</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border">
        <DateRangeSlicer
          dateFrom={store.dateFrom}
          dateTo={store.dateTo}
          onDateFromChange={store.setDateFrom}
          onDateToChange={store.setDateTo}
        />
        <MultiSelect
          label="Request Type"
          options={metadata?.requestTypes ?? []}
          selected={store.requestTypes}
          onChange={store.setRequestTypes}
        />
        <MultiSelect
          label="Priority"
          options={metadata?.priorityGroups ?? []}
          selected={store.priorityGroups}
          onChange={store.setPriorityGroups}
        />
        <MultiSelect
          label="Status"
          options={metadata?.statuses ?? []}
          selected={store.statuses}
          onChange={store.setStatuses}
        />
        <MultiSelect
          label="District"
          options={metadata?.districts ?? []}
          selected={store.districts}
          onChange={store.setDistricts}
        />
      </div>

      {/* KPI Banner */}
      <div className="bg-primary rounded-lg grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
        <KPICard label="Total Requests" value={total} />
        <KPICard label="Open" value={byStatus.find((s) => s.key === "Open" || s.key === "New")?.count ?? 0} />
        <KPICard
          label="YTD Current"
          value={ytd.currentYTD}
          priorValue={ytd.priorYTD}
          pctChange={ytd.pctChange}
        />
        <KPICard label="Request Types" value={metadata?.requestTypes?.length ?? 0} />
      </div>
      {metadata?.dataThrough && (
        <p className="text-xs text-muted-foreground -mt-2">
          Data through {metadata.dataThrough}
        </p>
      )}

      {/* Monthly trend */}
      <MonthlyBarChart data={monthly} title="311 Requests Over Time" />

      {/* Breakdowns — clickable to filter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChartHorizontal
          data={byPriority}
          title="311 Requests by Priority"
          onBarClick={togglePriority}
          activeKeys={store.priorityGroups}
        />
        <BarChartHorizontal
          data={byType}
          title="311 Requests by Type"
          onBarClick={toggleRequestType}
          activeKeys={store.requestTypes}
        />
      </div>
    </div>
  );
}
