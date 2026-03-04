"use client";

import { useMemo, useEffect } from "react";
import { useFilteredCFS } from "@/hooks/use-cfs";
import { useCFSStore } from "@/stores/cfs-store";
import { TimeMatrix } from "@/components/charts/time-matrix";
import { DateRangeSlicer } from "@/components/filters/date-range-slicer";
import { MultiSelect } from "@/components/filters/multi-select";
import { TreeFilter, type TreeNode } from "@/components/filters/tree-filter";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { PageToggle } from "@/components/ui/page-toggle";
import { useJurisdiction } from "@/lib/jurisdiction-context";
import { getSections } from "@/lib/jurisdictions";

/** Default date: Jan 1 of 2 years ago */
function defaultDateFrom(): string {
  const year = new Date().getFullYear() - 2;
  return `${year}-01-01`;
}

export default function CFSTimeOfDayPage() {
  const { hourly, categoryTree, metadata, isLoading } = useFilteredCFS();
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

  const treeNodes: TreeNode[] = useMemo(() => {
    if (!categoryTree || categoryTree.length === 0) return [];
    return categoryTree.map((node) => ({
      label: node.category,
      children: node.subCategories.map((sc) => ({ label: sc })),
    }));
  }, [categoryTree]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-lg md:text-xl font-bold">CFS Time of Day</h1>
        <PageToggle pages={sectionPages} />
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border">
        <DateRangeSlicer
          dateFrom={store.dateFrom}
          dateTo={store.dateTo}
          onDateFromChange={store.setDateFrom}
          onDateToChange={store.setDateTo}
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
      </div>

      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <TimeMatrix data={hourly} title="CFS — Hour x Day of Week" />
      )}
    </div>
  );
}
