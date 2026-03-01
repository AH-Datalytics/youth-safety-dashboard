"use client";

import { useMemo } from "react";
import { useFilteredIncidents } from "@/hooks/use-incidents";
import { useOffenseStore } from "@/stores/offense-store";
import { TimeMatrix } from "@/components/charts/time-matrix";
import { DateRangeSlicer } from "@/components/filters/date-range-slicer";
import { MultiSelect } from "@/components/filters/multi-select";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { parseDate } from "@/lib/utils";

export default function OffenseTimeOfDayPage() {
  const { filteredData, metadata, isLoading } = useFilteredIncidents();
  const store = useOffenseStore();

  // Build hour×DOW matrix from records
  const heatmapData = useMemo(() => {
    // Since incident records are daily aggregations without hour,
    // we need hourly data from a separate source or approximate.
    // For now, return empty — will be populated when ETL includes hourly breakdown.
    // TODO: Add hourly field to incident records in ETL
    return [] as { h: number; dw: number; c: number }[];
  }, [filteredData]);

  // Hourly distribution (day of week from date)
  const dowData = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of filteredData) {
      const date = parseDate(r.d);
      const dw = date.getDay();
      map.set(dw, (map.get(dw) ?? 0) + r.c);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([dw, c]) => ({
        day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dw],
        count: c,
      }));
  }, [filteredData]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="font-serif text-lg md:text-xl font-bold">Offense Time of Day</h1>

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
      </div>

      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <>
          <TimeMatrix data={heatmapData} title="Hour × Day of Week Heat Map" />
          <div className="border border-border rounded-lg p-4 bg-white">
            <h3 className="font-serif font-bold text-sm mb-3">Offenses by Day of Week</h3>
            <div className="grid grid-cols-7 gap-2">
              {dowData.map((d) => (
                <div key={d.day} className="text-center">
                  <p className="text-xs text-muted-foreground font-mono">{d.day}</p>
                  <p className="text-lg font-bold font-serif tabular-nums">{d.count.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
