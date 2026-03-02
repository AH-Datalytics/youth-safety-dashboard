"use client";

import { Fragment, useMemo } from "react";
import { formatPctChange, getPctChangeColor } from "@/lib/measures";
import type { CrimeTypeYTDRow } from "@/lib/measures";
import { cn, formatNumber } from "@/lib/utils";

interface YtdChangeTableProps {
  data: CrimeTypeYTDRow[];
  title?: string;
}

function PctCell({ value }: { value: number | null }) {
  const color = getPctChangeColor(value);
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        color === "increase" && "text-red-600",
        color === "decrease" && "text-blue-600",
        color === "neutral" && "text-muted-foreground",
      )}
    >
      {formatPctChange(value)}
    </span>
  );
}

/** Group rows by their `group` field, preserving order */
function groupRows(data: CrimeTypeYTDRow[]): { group: string; rows: CrimeTypeYTDRow[] }[] {
  const hasGroups = data.some((r) => r.group);
  if (!hasGroups) return [{ group: "", rows: data }];

  const groups: { group: string; rows: CrimeTypeYTDRow[] }[] = [];
  let currentGroup: string | null = null;
  let currentRows: CrimeTypeYTDRow[] = [];

  for (const row of data) {
    const g = row.group ?? "";
    if (g !== currentGroup) {
      if (currentRows.length > 0) groups.push({ group: currentGroup ?? "", rows: currentRows });
      currentGroup = g;
      currentRows = [];
    }
    currentRows.push(row);
  }
  if (currentRows.length > 0) groups.push({ group: currentGroup ?? "", rows: currentRows });

  return groups;
}

export function YtdChangeTable({ data, title }: YtdChangeTableProps) {
  const groups = useMemo(() => groupRows(data), [data]);

  // Totals row
  const totals = data.reduce(
    (acc, r) => ({
      currentYTD: acc.currentYTD + r.currentYTD,
      lastYTD: acc.lastYTD + r.lastYTD,
      twoYearYTD: acc.twoYearYTD + r.twoYearYTD,
    }),
    { currentYTD: 0, lastYTD: 0, twoYearYTD: 0 },
  );
  const totalYtdPct = totals.lastYTD === 0 ? null : (totals.currentYTD - totals.lastYTD) / totals.lastYTD;
  const totalTwoYrPct = totals.twoYearYTD === 0 ? null : (totals.currentYTD - totals.twoYearYTD) / totals.twoYearYTD;

  const hasGroups = groups.length > 1 || (groups.length === 1 && groups[0].group !== "");

  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-serif font-bold text-sm">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2">
                Offense Group
              </th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                Current YTD
              </th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                Last YTD
              </th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                Change
              </th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                2 Yr Ago
              </th>
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                2 Yr Change
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((section) => {
              // Compute group subtotals
              const sub = section.rows.reduce(
                (acc, r) => ({
                  currentYTD: acc.currentYTD + r.currentYTD,
                  lastYTD: acc.lastYTD + r.lastYTD,
                  twoYearYTD: acc.twoYearYTD + r.twoYearYTD,
                }),
                { currentYTD: 0, lastYTD: 0, twoYearYTD: 0 },
              );
              const subYtdPct = sub.lastYTD === 0 ? null : (sub.currentYTD - sub.lastYTD) / sub.lastYTD;
              const subTwoYrPct = sub.twoYearYTD === 0 ? null : (sub.currentYTD - sub.twoYearYTD) / sub.twoYearYTD;

              return (
                <Fragment key={section.group || "_default"}>
                  {/* Group header row */}
                  {hasGroups && section.group && (
                    <tr className="border-b border-border bg-muted/40">
                      <td className="px-4 py-1.5 text-xs font-bold text-primary uppercase tracking-wide">
                        {section.group}
                      </td>
                      <td className="text-right px-3 py-1.5 text-xs tabular-nums font-bold">{formatNumber(sub.currentYTD)}</td>
                      <td className="text-right px-3 py-1.5 text-xs tabular-nums text-muted-foreground font-semibold">{formatNumber(sub.lastYTD)}</td>
                      <td className="text-right px-3 py-1.5"><PctCell value={subYtdPct} /></td>
                      <td className="text-right px-3 py-1.5 text-xs tabular-nums text-muted-foreground font-semibold">{formatNumber(sub.twoYearYTD)}</td>
                      <td className="text-right px-3 py-1.5"><PctCell value={subTwoYrPct} /></td>
                    </tr>
                  )}
                  {/* Data rows */}
                  {section.rows.map((row) => (
                    <tr key={row.crimeType} className="border-b border-border/50 last:border-b-0 hover:bg-muted/20">
                      <td className={cn("py-1.5 text-sm text-primary font-medium", hasGroups ? "px-6" : "px-4")}>
                        {row.crimeType}
                      </td>
                      <td className="text-right px-3 py-1.5 text-sm tabular-nums font-semibold">{formatNumber(row.currentYTD)}</td>
                      <td className="text-right px-3 py-1.5 text-sm tabular-nums text-muted-foreground">{formatNumber(row.lastYTD)}</td>
                      <td className="text-right px-3 py-1.5"><PctCell value={row.ytdPctChange} /></td>
                      <td className="text-right px-3 py-1.5 text-sm tabular-nums text-muted-foreground">{formatNumber(row.twoYearYTD)}</td>
                      <td className="text-right px-3 py-1.5"><PctCell value={row.twoYearPctChange} /></td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-primary/20 bg-muted/30 font-bold">
              <td className="px-4 py-2 text-sm">Total</td>
              <td className="text-right px-3 py-2 text-sm tabular-nums">{formatNumber(totals.currentYTD)}</td>
              <td className="text-right px-3 py-2 text-sm tabular-nums text-muted-foreground">{formatNumber(totals.lastYTD)}</td>
              <td className="text-right px-3 py-2"><PctCell value={totalYtdPct} /></td>
              <td className="text-right px-3 py-2 text-sm tabular-nums text-muted-foreground">{formatNumber(totals.twoYearYTD)}</td>
              <td className="text-right px-3 py-2"><PctCell value={totalTwoYrPct} /></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
