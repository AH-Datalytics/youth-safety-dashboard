"use client";

import { Fragment, useMemo } from "react";
import { formatPctChange, getPctChangeColor } from "@/lib/measures";
import { cn, formatNumber } from "@/lib/utils";
import type { CampusRecord } from "@/lib/types";

interface CompStatDisciplineTableProps {
  records: CampusRecord[];
  schoolYears: string[];
  /** When set, this SY is the rightmost column and 2 prior SYs fill in */
  selectedYear?: string | null;
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

interface GroupRow {
  description: string;
  counts: number[]; // one per SY column
  pctChange: number | null;
}

interface Section {
  label: string;
  sectionCode: string;
  rows: GroupRow[];
  subtotals: number[];
  subtotalPct: number | null;
}

export function CompStatDisciplineTable({
  records,
  schoolYears,
  selectedYear,
  title,
}: CompStatDisciplineTableProps) {
  const { sections, syColumns, grandTotals, grandPct } = useMemo(() => {
    const sorted = [...schoolYears].sort();

    // If a year is selected, show it + the 2 prior years
    // Otherwise default to the last 3 available years
    let syColumns: string[];
    if (selectedYear) {
      const idx = sorted.indexOf(selectedYear);
      if (idx >= 0) {
        const start = Math.max(0, idx - 2);
        syColumns = sorted.slice(start, idx + 1);
      } else {
        syColumns = sorted.slice(-3);
      }
    } else {
      syColumns = sorted.slice(-3);
    }

    // Filter to Incident Type records only
    const incidentRecords = records.filter((r) => r.tp === "Incident Type");

    // Group definitions
    const groupDefs = [
      { label: "Incident Reasons", sectionCode: "W-REASON INCIDENT COUNTS" },
      { label: "Discipline Actions", sectionCode: "X-DISCIPLINE ACTION COUNTS" },
    ];

    const sections: Section[] = groupDefs.map(({ label, sectionCode }) => {
      // Get records for this section
      const sectionRecords = incidentRecords.filter((r) => r.se === sectionCode);

      // Aggregate by description × school year
      const descMap = new Map<string, Map<string, number>>();
      for (const r of sectionRecords) {
        if (!descMap.has(r.ds)) descMap.set(r.ds, new Map());
        const syMap = descMap.get(r.ds)!;
        syMap.set(r.sy, (syMap.get(r.sy) ?? 0) + r.v);
      }

      // Build rows sorted by most recent SY count (descending)
      const rows: GroupRow[] = Array.from(descMap.entries())
        .map(([description, syMap]) => {
          const counts = syColumns.map((sy) => syMap.get(sy) ?? 0);
          const curr = counts[counts.length - 1];
          const prev = counts.length >= 2 ? counts[counts.length - 2] : 0;
          const pctChange = prev === 0 ? null : (curr - prev) / prev;
          return { description, counts, pctChange };
        })
        .sort((a, b) => {
          const aLast = a.counts[a.counts.length - 1];
          const bLast = b.counts[b.counts.length - 1];
          return bLast - aLast;
        });

      // Subtotals per SY
      const subtotals = syColumns.map((_, i) =>
        rows.reduce((sum, r) => sum + r.counts[i], 0),
      );
      const subCurr = subtotals[subtotals.length - 1];
      const subPrev = subtotals.length >= 2 ? subtotals[subtotals.length - 2] : 0;
      const subtotalPct = subPrev === 0 ? null : (subCurr - subPrev) / subPrev;

      return { label, sectionCode, rows, subtotals, subtotalPct };
    });

    // Grand totals
    const grandTotals = syColumns.map((_, i) =>
      sections.reduce((sum, s) => sum + s.subtotals[i], 0),
    );
    const gCurr = grandTotals[grandTotals.length - 1];
    const gPrev = grandTotals.length >= 2 ? grandTotals[grandTotals.length - 2] : 0;
    const grandPct = gPrev === 0 ? null : (gCurr - gPrev) / gPrev;

    return { sections, syColumns, grandTotals, grandPct };
  }, [records, schoolYears]);

  if (syColumns.length === 0) return null;

  // Format SY label: "2023-2024" → "23-24"
  const formatSY = (sy: string) => {
    const parts = sy.split("-");
    if (parts.length === 2) return `${parts[0].slice(-2)}-${parts[1].slice(-2)}`;
    return sy;
  };

  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-serif font-bold text-sm">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2">
                Description
              </th>
              {syColumns.map((sy) => (
                <th
                  key={sy}
                  className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2"
                >
                  {formatSY(sy)}
                </th>
              ))}
              <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                % Change
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <Fragment key={section.sectionCode}>
                {/* Group header row */}
                <tr className="border-b border-border bg-muted/40">
                  <td className="px-4 py-1.5 text-xs font-bold text-primary uppercase tracking-wide">
                    {section.label}
                  </td>
                  {section.subtotals.map((st, i) => (
                    <td
                      key={i}
                      className="text-right px-3 py-1.5 text-xs tabular-nums font-bold"
                    >
                      {formatNumber(st)}
                    </td>
                  ))}
                  <td className="text-right px-3 py-1.5">
                    <PctCell value={section.subtotalPct} />
                  </td>
                </tr>
                {/* Data rows */}
                {section.rows.map((row) => (
                  <tr
                    key={row.description}
                    className="border-b border-border/50 last:border-b-0 hover:bg-muted/20"
                  >
                    <td className="px-6 py-1.5 text-sm text-primary font-medium">
                      {row.description}
                    </td>
                    {row.counts.map((c, i) => (
                      <td
                        key={i}
                        className={cn(
                          "text-right px-3 py-1.5 text-sm tabular-nums",
                          i === row.counts.length - 1
                            ? "font-semibold"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatNumber(c)}
                      </td>
                    ))}
                    <td className="text-right px-3 py-1.5">
                      <PctCell value={row.pctChange} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-primary/20 bg-muted/30 font-bold">
              <td className="px-4 py-2 text-sm">Total</td>
              {grandTotals.map((gt, i) => (
                <td key={i} className="text-right px-3 py-2 text-sm tabular-nums">
                  {formatNumber(gt)}
                </td>
              ))}
              <td className="text-right px-3 py-2">
                <PctCell value={grandPct} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
