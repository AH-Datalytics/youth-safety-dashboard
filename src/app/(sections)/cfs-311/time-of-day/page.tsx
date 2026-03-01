"use client";

import { useFilteredCFS } from "@/hooks/use-cfs";
import { useCFSStore } from "@/stores/cfs-store";
import { TimeMatrix } from "@/components/charts/time-matrix";
import { DateRangeSlicer } from "@/components/filters/date-range-slicer";
import { MultiSelect } from "@/components/filters/multi-select";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";

export default function CFSTimeOfDayPage() {
  const { hourly, metadata, isLoading } = useFilteredCFS();
  const store = useCFSStore();

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <h1 className="font-serif text-lg md:text-xl font-bold">CFS Time of Day</h1>

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
        <MultiSelect
          label="Priority"
          options={metadata?.priorities ?? []}
          selected={store.priorities}
          onChange={store.setPriorities}
        />
      </div>

      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <TimeMatrix data={hourly} title="CFS — Hour × Day of Week" />
      )}
    </div>
  );
}
