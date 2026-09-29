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
import { useJurisdiction } from "@/lib/jurisdiction-context";
import { MAP_DOT_COLORS } from "@/lib/constants";

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

/**
 * Colors for sources with no case status (Fort Worth publishes no clearance or
 * disposition field, so every record is "Unknown"). Dots are colored by NIBRS
 * crime-against instead, using the spec'd offense-map palette.
 */
const CRIME_AGAINST_COLOR_MAP: Record<string, string> = {
  ...MAP_DOT_COLORS,
  "All Other Offenses": "#9ca3af",
  "Not a Crime": "#9ca3af",
};

/**
 * Preferred order for case-status tabs. Only statuses present in the
 * jurisdiction's payload are rendered, so a source with no clearance field
 * doesn't show empty clearance tabs.
 */
const CASE_STATUS_ORDER = [
  "Cleared (Arrestee Age 17 or Under)",
  "Cleared (Arrestee 18 or Older)",
  "Open",
  "Closed",
  "Suspended",
  "Unknown",
];

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
  const config = useJurisdiction();

  // A jurisdiction with no published 311 source gets no 311 layer to toggle.
  const has311 = config.domains.includes("311") && !config.dataNotices?.["311"];

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
          .map((og) => ({ label: og.group })),
      }));
  }, [nibrsTree]);

  // Map points carry the offense group only. These resolve a group to its
  // crime-against, and a code (selected on the offense pages, which share the
  // filter store) to its group.
  const { groupToCrimeAgainst, codeToGroup } = useMemo(() => {
    const g2ca = new Map<string, string>();
    const c2g = new Map<string, string>();
    for (const node of nibrsTree ?? []) {
      if (!g2ca.has(node.offenseGroup)) g2ca.set(node.offenseGroup, node.crimeAgainst);
      for (const code of node.nibrsCodes) c2g.set(code.description, node.offenseGroup);
    }
    return { groupToCrimeAgainst: g2ca, codeToGroup: c2g };
  }, [nibrsTree]);

  // No case status in the source → color by crime-against, drop status tabs.
  const hasCaseStatus = (incMeta?.caseStatuses ?? []).some((s) => s !== "Unknown");

  const selectedLabels = offenseStore.nibrsCodes;
  const selectedOffenses = useMemo(
    () => new Set(selectedLabels.map((l) => codeToGroup.get(l) ?? l)),
    [selectedLabels, codeToGroup],
  );

  // Build combined map points
  const mapPoints: DotMapPoint[] = useMemo(() => {
    const pts: DotMapPoint[] = [];

    // Offense points (filtered by date range + case status)
    if (showOffenses && incidentPoints) {
      for (const p of incidentPoints) {
        if (dateFrom && p.d < dateFrom) continue;
        if (dateTo && p.d > dateTo) continue;
        if (caseStatusFilter !== "All" && p.cs !== caseStatusFilter) continue;
        if (
          selectedOffenses.size > 0 &&
          !selectedOffenses.has(p.ca) &&
          !selectedOffenses.has(groupToCrimeAgainst.get(p.ca) ?? "")
        )
          continue;
        pts.push({
          lat: p.lat,
          lon: p.lon,
          category: hasCaseStatus ? p.cs : (groupToCrimeAgainst.get(p.ca) ?? "All Other Offenses"),
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
  }, [
    showOffenses,
    show311,
    incidentPoints,
    r311Points,
    caseStatusFilter,
    dateFrom,
    dateTo,
    selectedOffenses,
    hasCaseStatus,
    groupToCrimeAgainst,
  ]);

  const caseStatusTabs = useMemo(() => {
    const present = new Set(incMeta?.caseStatuses ?? []);
    const ordered = CASE_STATUS_ORDER.filter((s) => present.has(s));
    const extra = Array.from(present)
      .filter((s) => !CASE_STATUS_ORDER.includes(s))
      .sort();
    return ["All", ...ordered, ...extra];
  }, [incMeta?.caseStatuses]);

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
        {has311 && (
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
        )}
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
      {showOffenses && hasCaseStatus && caseStatusTabs.length > 2 && (
        <div className="flex flex-wrap gap-1">
          {caseStatusTabs.map((tab) => (
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
          center={config.geo?.center}
          zoom={config.geo?.zoom}
          points={mapPoints}
          colorMap={hasCaseStatus ? COLOR_MAP : { ...CRIME_AGAINST_COLOR_MAP, "311 Request": COLOR_MAP["311 Request"] }}
          title={`${mapPoints.reduce((s, p) => s + p.count, 0).toLocaleString()} incidents`}
          height={600}
        />
      )}
    </div>
  );
}
