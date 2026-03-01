"use client";

import { useMemo } from "react";
import { useFilteredArrests } from "@/hooks/use-arrests";
import { useArrestStore } from "@/stores/arrest-store";
import { computeYTD, groupByKey, topN } from "@/lib/measures";
import { KPICard } from "@/components/ui/kpi-card";
import { BarChartHorizontal } from "@/components/charts/bar-chart-horizontal";
import { DonutChart } from "@/components/charts/donut-chart";
import { DateRangeSlicer } from "@/components/filters/date-range-slicer";
import { MultiSelect } from "@/components/filters/multi-select";
import { KPIBannerSkeleton, ChartSkeleton } from "@/components/ui/loading-skeleton";
import { DataTable } from "@/components/ui/data-table";
import { formatNumber } from "@/lib/utils";

export default function ArrestsPage() {
  const { filteredData, metadata, isLoading } = useFilteredArrests();
  const store = useArrestStore();

  const ytd = useMemo(() => computeYTD(filteredData), [filteredData]);
  const total = useMemo(() => filteredData.reduce((s, r) => s + r.c, 0), [filteredData]);
  const byCharge = useMemo(() => topN(filteredData, (r) => r.ch, 15), [filteredData]);
  const byRace = useMemo(() => groupByKey(filteredData, (r) => r.ra), [filteredData]);
  const bySex = useMemo(() => groupByKey(filteredData, (r) => r.sx), [filteredData]);
  const byAge = useMemo(() => groupByKey(filteredData, (r) => r.ag), [filteredData]);

  const chargeTable = useMemo(
    () =>
      byCharge.map((c) => ({
        charge: c.key,
        count: c.count,
        pct: total > 0 ? `${((c.count / total) * 100).toFixed(1)}%` : "0%",
      })),
    [byCharge, total],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="font-serif text-lg md:text-xl font-bold">Arrest Demographics</h1>

      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border sticky top-0 z-50">
        <DateRangeSlicer
          dateFrom={store.dateFrom}
          dateTo={store.dateTo}
          onDateFromChange={store.setDateFrom}
          onDateToChange={store.setDateTo}
        />
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
          label="Age Group"
          options={metadata?.ageGroups ?? []}
          selected={store.ageGroups}
          onChange={store.setAgeGroups}
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
          <KPICard label="Total Arrests" value={total} />
          <KPICard
            label="YTD Current"
            value={ytd.currentYTD}
            priorValue={ytd.priorYTD}
            pctChange={ytd.pctChange}
          />
          <KPICard label="Male" value={bySex.find((s) => s.key === "Male")?.count ?? 0} />
          <KPICard label="Female" value={bySex.find((s) => s.key === "Female")?.count ?? 0} />
        </div>
      )}

      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <BarChartHorizontal data={byCharge} title="Arrests by Charge Category" />
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
            <DonutChart data={byAge} title="Age Group Distribution" />
          </>
        )}
      </div>

      {!isLoading && (
        <DataTable
          title="Top Charges"
          columns={[
            { key: "charge", header: "Charge" },
            { key: "count", header: "Count", align: "right", numeric: true },
            { key: "pct", header: "% of Total", align: "right" },
          ]}
          data={chargeTable}
          maxRows={20}
        />
      )}
    </div>
  );
}
