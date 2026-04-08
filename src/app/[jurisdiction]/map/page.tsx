"use client";

import { useMemo, useState } from "react";
import { useFilteredIncidents } from "@/hooks/use-incidents";
import { useFiltered311 } from "@/hooks/use-311";
import { useOffenseStore } from "@/stores/offense-store";
import { DotMap, type DotMapPoint } from "@/components/charts/dot-map";
import { DateRangeSlicer } from "@/components/filters/date-range-slicer";
import { TreeFilter, type TreeNode } from "@/components/filters/tree-filter";
import { ChartSkeleton } from "@/components/ui/loading-skeleton";
import { cn } from "@/lib/utils";

/** Color map for all layers */
const COLOR_MAP: Record<string, string> = {
  // Offense case statuses
  "Cleared (Arrestee Age 17 or Under)": "#06b6d4",
  "Cleared (Arrestee 18 or Older)": "#2563eb",
  Open: "#f59e0b",
  Closed: "#65bc7b",
  Suspended: "#8b5cf6",
  Unknown: "#9ca3af",
  // 311
  "311 Request": "#dc2626",
};

const CASE_STATUS_TABS = [
  "All",
  "Cleared (Arrestee Age 17 or Under)",
  "Cleared (Arrestee 18 or Older)",
  "Open",
  "Closed",
  "Suspended",
  "Unknown",
] as const;

/** Default: last 30 days */
function defaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().substring(0, 10);
}

function defaultDateTo(): string {
  return new Date().toISOString().substring(0, 10);
}

export default function UnifiedMapPage() {
  const { points: incidentPoints, nibrsTree, metadata: incMeta, isLoading: incLoading } = useFilteredIncidents();
  const { points: r311Points, isLoading: r311Loading } = useFiltered311();
  const offenseStore = useOffenseStore();

  // Layer toggles
  const [showOffenses, setShowOffenses] = useState(true);
  const [show311, setShow311] = useState(false);
  const [caseStatusFilter, setCaseStatusFilter] = useState<string>("All");

  // Local date state for map (separate from offense store to avoid interference)
  const [dateFrom, setDateFrom] = useState<string | null>(defaultDateFrom);
  const [dateTo, setDateTo] = useState<string | null>(defaultDateTo);

  // Build NIBRS tree nodes
  const treeNodes: TreeNode[] = useMemo(() => {
    if (!nibrsTree || nibrsTree.length === 0) return [];
    const grouped = new Map<string, { group: string; codes: { code: string; description: string }[] }[]>();
    for (const node of nibrsTree) {
      if (!grouped.has(node.crimeAgainst)) grouped.set(node.crimeAgainst, []);
      grouped.get(node.crimeAgainst)!.push({ group: node.offenseGroup, codes: node.nibrsCodes });
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ca, groups]) => ({
        label: ca,
        children: groups
          .sort((a, b) => a.group.localeCompare(b.group))
          .map((og) => ({
            label: og.group,
            children: og.codes.map((code) => ({
              label: code.description,
            })),
          })),
      }));
  }, [nibrsTree]);

  // Build combined map points
  const mapPoints: DotMapPoint[] = useMemo(() => {
    const pts: DotMapPoint[] = [];

    // Offense points (filtered by date range + case status)
    if (showOffenses && incidentPoints) {
      for (const p of incidentPoints) {
        if (dateFrom && p.d < dateFrom) continue;
        if (dateTo && p.d > dateTo) continue;
        if (caseStatusFilter !== "All" && p.cs !== caseStatusFilter) continue;
        pts.push({
          lat: p.lat,
          lon: p.lon,
          category: p.cs,
          count: p.c,
          label: p.ca,
        });
      }
    }

    // 311 points (filtered by date range)
    if (show311 && r311Points) {
      for (const p of r311Points) {
        if (dateFrom && p.d < dateFrom) continue;
        if (dateTo && p.d > dateTo) continue;
        pts.push({
          lat: p.lat,
          lon: p.lon,
          category: "311 Request",
          count: p.c,
          label: p.rt,
        });
      }
    }

    return pts;
  }, [showOffenses, show311, incidentPoints, r311Points, caseStatusFilter, dateFrom, dateTo]);

  const isLoading = incLoading || r311Loading;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
      <h1 className="font-serif text-lg md:text-xl font-bold">Map</h1>

      {/* Layer toggles */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Layers</span>
        <button
          onClick={() => setShowOffenses((v) => !v)}
          className={cn(
            "px-3 py-1.5 text-xs rounded border transition-colors",
            showOffenses
              ? "bg-primary text-white border-primary"
              : "bg-white text-foreground border-border hover:bg-muted",
          )}
        >
          Offenses
        </button>
        <button
          onClick={() => setShow311((v) => !v)}
          className={cn(
            "px-3 py-1.5 text-xs rounded border transition-colors",
            show311
              ? "bg-primary text-white border-primary"
              : "bg-white text-foreground border-border hover:bg-muted",
          )}
        >
          311 Requests
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-border">
        <DateRangeSlicer
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          min={incMeta?.dataFrom}
          max={incMeta?.dataThrough}
        />
        {showOffenses && treeNodes.length > 0 && (
          <TreeFilter
            label="Offense Type"
            nodes={treeNodes}
            selected={offenseStore.nibrsCodes}
            onChange={offenseStore.setNibrsCodes}
          />
        )}
      </div>

      {/* Case Status Tabs (only when offenses visible) */}
      {showOffenses && (
        <div className="flex flex-wrap gap-1">
          {CASE_STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setCaseStatusFilter(tab)}
              className={cn(
                "px-3 py-1.5 text-xs rounded border transition-colors",
                caseStatusFilter === tab
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-foreground border-border hover:bg-muted",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Map */}
      {isLoading ? (
        <ChartSkeleton />
      ) : (
        <DotMap
          points={mapPoints}
          colorMap={COLOR_MAP}
          title={`${mapPoints.reduce((s, p) => s + p.count, 0).toLocaleString()} incidents`}
          height={600}
        />
      )}
    </div>
  );
}
