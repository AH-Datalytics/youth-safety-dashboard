"use client";

import { useMemo } from "react";
import { useFiltered311 } from "@/hooks/use-311";
import { useRequests311Store } from "@/stores/requests311-store";
import { computeYTD, computeMonthly, groupByKey, topN } from "@/lib/measures";
import { KPICard } from "@/components/ui/kpi-card";
import { TrendChart } from "@/components/charts/trend-chart";
import { BarChartHorizontal } from "@/components/charts/bar-chart-horizontal";
import { DonutChart } from "@/components/charts/donut-chart";
import { DateRangeSlicer } from "@/components/filters/date-range-slicer";
import { MultiSelect } from "@/components/filters/multi-select";
import { DataTable } from "@/components/ui/data-table";
import { KPIBannerSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";
import { formatNumber } from "@/lib/utils";

export default function Requests311Page() {
  const { filteredData, metadata, isLoading } = useFiltered311();
  const store = useRequests311Store();

  const ytd = useMemo(() => computeYTD(filteredData), [filteredData]);
  const monthly = useMemo(() => computeMonthly(filteredData), [filteredData]);
  const byType = useMemo(() => topN(filteredData, (r) => r.rt, 15), [filteredData]);
  const byStatus = useMemo(() => groupByKey(filteredData, (r) => r.st), [filteredData]);
  const byDept = useMemo(() => groupByKey(filteredData, (r) => r.dp), [filteredData]);
  const total = useMemo(() => filteredData.reduce((s, r) => s + r.c, 0), [filteredData]);

  const deptTable = useMemo(
    () =>
      byDept.map((d) => ({
        department: d.key,
        count: d.count,
        pct: total > 0 ? `${((d.count / total) * 100).toFixed(1)}%` : "0%",
      })),
    [byDept, total],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="font-serif text-lg md:text-xl font-bold">311 Service Requests</h1>

      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border sticky top-0 z-50">
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
          label="Department"
          options={metadata?.departments ?? []}
          selected={store.departments}
          onChange={store.setDepartments}
        />
        <MultiSelect
          label="Status"
          options={metadata?.statuses ?? []}
          selected={store.statuses}
          onChange={store.setStatuses}
        />
      </div>

      {isLoading ? (
        <KPIBannerSkeleton />
      ) : (
        <div className="bg-primary rounded-lg grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          <KPICard label="Total Requests" value={total} />
          <KPICard
            label="YTD Current"
            value={ytd.currentYTD}
            priorValue={ytd.priorYTD}
            pctChange={ytd.pctChange}
          />
          <KPICard label="Open" value={byStatus.find((s) => s.key === "Open")?.count ?? 0} />
          <KPICard label="Closed" value={byStatus.find((s) => s.key === "Closed")?.count ?? 0} />
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
            <TrendChart data={monthly} title="Monthly 311 Request Trend" />
            <DonutChart data={byStatus} title="Status Distribution" />
          </>
        )}
      </div>

      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <BarChartHorizontal data={byType} title="Requests by Type (Top 15)" />
      )}

      {!isLoading && (
        <DataTable
          title="Department Breakdown"
          columns={[
            { key: "department", header: "Department" },
            { key: "count", header: "Count", align: "right", numeric: true },
            { key: "pct", header: "% of Total", align: "right" },
          ]}
          data={deptTable}
        />
      )}
    </div>
  );
}
