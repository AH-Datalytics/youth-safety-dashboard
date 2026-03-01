"use client";

import { useMemo } from "react";
import { useFilteredCFS } from "@/hooks/use-cfs";
import { useCFSStore } from "@/stores/cfs-store";
import { groupByKey } from "@/lib/measures";
import { DateRangeSlicer } from "@/components/filters/date-range-slicer";
import { MultiSelect } from "@/components/filters/multi-select";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { formatNumber } from "@/lib/utils";

export default function CFSMapPage() {
  const { filteredData, metadata, isLoading } = useFilteredCFS();
  const store = useCFSStore();

  const byDistrict = useMemo(() => groupByKey(filteredData, (r) => r.di), [filteredData]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="font-serif text-lg md:text-xl font-bold">CFS Map</h1>

      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border sticky top-0 z-50">
        <DateRangeSlicer
          dateFrom={store.dateFrom}
          dateTo={store.dateTo}
          onDateFromChange={store.setDateFrom}
          onDateToChange={store.setDateTo}
        />
        <MultiSelect
          label="Call Type"
          options={metadata?.callTypes ?? []}
          selected={store.callTypes}
          onChange={store.setCallTypes}
        />
      </div>

      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-border rounded-lg bg-white p-4 min-h-[400px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="font-serif font-bold text-sm mb-2">CFS Choropleth Map</p>
              <p className="text-xs">Map will render when GeoJSON boundaries are added</p>
            </div>
          </div>

          <div className="border border-border rounded-lg bg-white overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-border">
              <h3 className="font-serif font-bold text-sm">CFS by District</h3>
            </div>
            <div className="overflow-y-auto max-h-96">
              {byDistrict
                .filter((d) => d.key)
                .map((d) => (
                  <div key={d.key} className="flex justify-between px-4 py-1.5 border-b border-border last:border-0 text-sm">
                    <span>District {d.key}</span>
                    <span className="font-mono tabular-nums">{formatNumber(d.count)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
