"use client";

import { useMemo } from "react";
import { useFilteredCampus } from "@/hooks/use-campus";
import { useCampusStore } from "@/stores/campus-store";
import { groupByKey, crossTab } from "@/lib/measures";
import { DonutChart } from "@/components/charts/donut-chart";
import { StackedBarChart } from "@/components/charts/stacked-bar-chart";
import { MultiSelect } from "@/components/filters/multi-select";
import { DataTable } from "@/components/ui/data-table";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { formatNumber } from "@/lib/utils";

export default function SchoolOutcomesPage() {
  const { filteredData, metadata, isLoading } = useFilteredCampus();
  const store = useCampusStore();

  const byAction = useMemo(() => groupByKey(filteredData, (r) => r.ac), [filteredData]);

  // Stacked: action type by school year
  const stackedData = useMemo(() => {
    const byYear = new Map<string, Map<string, number>>();
    const actionSet = new Set<string>();

    for (const r of filteredData) {
      if (!byYear.has(r.sy)) byYear.set(r.sy, new Map());
      const inner = byYear.get(r.sy)!;
      inner.set(r.ac, (inner.get(r.ac) ?? 0) + r.c);
      actionSet.add(r.ac);
    }

    const actions = Array.from(actionSet).sort();
    const data = Array.from(byYear.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, inner]) => {
        const row: Record<string, unknown> = { year };
        for (const action of actions) {
          row[action] = inner.get(action) ?? 0;
        }
        return row;
      });

    return { data, categories: actions };
  }, [filteredData]);

  // Disparity: outcomes by race
  const disparityData = useMemo(() => {
    const ct = crossTab(filteredData, (r) => r.ra, (r) => r.ac);
    return ct.map((row) => ({
      race: row.key,
      ...row.breakdown,
      total: row.total,
    }));
  }, [filteredData]);

  // Campus-level outcome table
  const campusOutcomes = useMemo(() => {
    const ct = crossTab(filteredData, (r) => r.cn, (r) => r.ac);
    return ct.slice(0, 20).map((row) => ({
      campus: row.key,
      ...row.breakdown,
      total: row.total,
    }));
  }, [filteredData]);

  const actionTypes = useMemo(() => byAction.map((a) => a.key), [byAction]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="font-serif text-lg md:text-xl font-bold">Disciplinary Outcomes</h1>

      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border sticky top-0 z-50">
        {metadata?.schoolYears && (
          <select
            value={store.schoolYear ?? ""}
            onChange={(e) => store.setSchoolYear(e.target.value || null)}
            className="border border-border rounded px-2 py-1 text-sm bg-white"
          >
            <option value="">All School Years</option>
            {metadata.schoolYears.map((sy) => (
              <option key={sy} value={sy}>{sy}</option>
            ))}
          </select>
        )}
        <MultiSelect
          label="Campus"
          options={metadata?.campuses ?? []}
          selected={store.campuses}
          onChange={store.setCampuses}
        />
        <MultiSelect
          label="Action"
          options={metadata?.actions ?? []}
          selected={store.actions}
          onChange={store.setActions}
        />
        <MultiSelect
          label="Race"
          options={metadata?.races ?? []}
          selected={store.races}
          onChange={store.setRaces}
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
            <StackedBarChart
              data={stackedData.data}
              categories={stackedData.categories}
              xKey="year"
              title="Outcomes by School Year"
            />
            <DonutChart data={byAction} title="Overall Action Distribution" />
          </>
        )}
      </div>

      {!isLoading && campusOutcomes.length > 0 && (
        <DataTable
          title="Campus-Level Outcome Rates"
          columns={[
            { key: "campus", header: "Campus" },
            ...actionTypes.map((a) => ({
              key: a,
              header: a,
              align: "right" as const,
              numeric: true,
            })),
            { key: "total", header: "Total", align: "right" as const, numeric: true },
          ]}
          data={campusOutcomes}
          maxRows={20}
        />
      )}

      {!isLoading && disparityData.length > 0 && (
        <DataTable
          title="Outcome Disparity by Race/Ethnicity"
          columns={[
            { key: "race", header: "Race" },
            ...actionTypes.map((a) => ({
              key: a,
              header: a,
              align: "right" as const,
              numeric: true,
            })),
            { key: "total", header: "Total", align: "right" as const, numeric: true },
          ]}
          data={disparityData}
        />
      )}
    </div>
  );
}
