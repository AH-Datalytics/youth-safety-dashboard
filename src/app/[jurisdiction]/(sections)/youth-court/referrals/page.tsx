"use client";

import { useEffect, useMemo } from "react";
import { useTJJD, useFilteredTJJD } from "@/hooks/use-tjjd";
import { useTJJDStore } from "@/stores/tjjd-store";
import { DownloadButton } from "@/components/ui/download-button";
import { DOWNLOAD_DOMAINS } from "@/config/download-columns";
import { BarChartHorizontal } from "@/components/charts/bar-chart-horizontal";
import { BrushBarChart } from "@/components/charts/brush-bar-chart";
import { ChoroplethMap } from "@/components/charts/choropleth-map";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { cn } from "@/lib/utils";
import { useJurisdiction } from "@/lib/jurisdiction-context";

/**
 * Preferred tab order for the Dallas 58.009 shape. Categories present in the
 * payload but absent here are appended, so a source with a different set of
 * cuts (e.g. TJJD's county file) still gets tabs.
 */
const CATEGORY_ORDER = [
  "Age",
  "Disposition",
  "Gender",
  "Offense Category",
  "Offense Type",
  "Race/Ethnicity",
];

const tjjdCols = DOWNLOAD_DOMAINS.find((d) => d.domainId === "tjjd")!.columns;

export default function YouthCourtReferralsPage() {
  const { data: rawPayload } = useTJJD();
  const { filteredData, rangeTotal, zipRecords, monthlyTimeSeries, metadata, isLoading } =
    useFilteredTJJD();
  const store = useTJJDStore();
  const config = useJurisdiction();

  const granularity = metadata?.granularity ?? "monthly";

  // Tabs come from the payload, so a jurisdiction only sees the cuts its
  // source actually provides. The total category is excluded — it's the
  // headline number, not a breakdown.
  const categories = useMemo(() => {
    const available = (metadata?.categories ?? []).filter(
      (c) => c !== metadata?.totalCategory,
    );
    const known = CATEGORY_ORDER.filter((c) => available.includes(c));
    const extra = available.filter((c) => !CATEGORY_ORDER.includes(c)).sort();
    return [...known, ...extra];
  }, [metadata?.categories, metadata?.totalCategory]);

  // Detail breakdown for selected category
  const detailData = useMemo(() => {
    if (!store.category) return [];
    const categoryData = filteredData.filter((r) => r.cat === store.category);
    const map = new Map<string, number>();
    for (const r of categoryData) {
      map.set(r.desc, (map.get(r.desc) ?? 0) + r.v);
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([key, count]) => ({ key, count }));
  }, [filteredData, store.category]);

  // The store's default category comes from the Dallas 58.009 shape ("Age").
  // A jurisdiction whose source has different cuts would otherwise render an
  // empty breakdown titled with a category it doesn't publish, and no tab
  // would appear active.
  useEffect(() => {
    if (categories.length === 0) return;
    if (!store.category || !categories.includes(store.category)) {
      store.setCategory(categories[0]);
    }
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Title + total */}
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="font-serif text-lg md:text-xl font-bold">
            Youth Court Referrals
          </h1>
          {metadata?.sourceLabel && (
            <p className="text-xs text-[#666] mt-0.5">
              {granularity === "annual" ? "Annual" : "Monthly"} ·{" "}
              {metadata.sourceLabel}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && (
            <span className="font-mono text-lg font-bold text-primary">
              {rangeTotal.toLocaleString()} referrals
            </span>
          )}
          <DownloadButton
            domain="tjjd"
            columns={tjjdCols}
            filteredData={filteredData}
            fullData={rawPayload?.records ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Monthly bar chart with brush */}
      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <BrushBarChart
          data={monthlyTimeSeries}
          startIndex={store.startIndex}
          endIndex={store.endIndex}
          onRangeChange={(start, end) => store.setRange(start, end)}
          granularity={granularity}
        />
      )}

      {/* Category tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() =>
              store.setCategory(store.category === cat ? null : cat)
            }
            className={cn(
              "px-3 py-1.5 text-sm rounded-full border transition-colors",
              store.category === cat
                ? "bg-primary text-white border-primary"
                : "bg-white text-foreground border-border hover:bg-muted",
            )}
          >
            {cat}
          </button>
        ))}
        {store.category && (
          <button
            onClick={() => store.setCategory(null)}
            className="text-xs text-accent hover:underline ml-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Detail horizontal bar chart */}
      {store.category && (
        <>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <BarChartHorizontal
              data={detailData}
              title={`Referrals by ${store.category}`}
              maxBars={20}
            />
          )}
        </>
      )}

      {/* ZIP choropleth map — only sources with ZIP detail can render it */}
      {!isLoading && zipRecords.length > 0 && config.geo?.zcta && (
        <ChoroplethMap
          zipRecords={zipRecords}
          geojsonUrl={config.geo.zcta}
          center={config.geo.center}
          title="Court Referrals by ZIP Code"
        />
      )}
    </div>
  );
}
