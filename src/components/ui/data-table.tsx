"use client";

import { cn, formatNumber } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  numeric?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  title?: string;
  maxRows?: number;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  title,
  maxRows,
}: DataTableProps<T>) {
  const rows = maxRows ? data.slice(0, maxRows) : data;

  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      {title && (
        <div className="px-4 pt-3 pb-2 border-b border-border">
          <h3 className="font-serif font-bold text-sm">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-strong">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-2 text-[10px] uppercase tracking-wider font-mono text-muted-foreground font-medium",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    !col.align && "text-left",
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-2",
                      col.numeric && "font-mono tabular-nums",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : col.numeric
                        ? formatNumber(row[col.key] as number)
                        : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {maxRows && data.length > maxRows && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
          Showing {maxRows} of {formatNumber(data.length)} rows
        </div>
      )}
    </div>
  );
}
