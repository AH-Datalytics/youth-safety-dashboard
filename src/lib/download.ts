"use client";

import type { ColumnDef } from "@/config/download-columns";

// ---------------------------------------------------------------------------
// Key expansion — compact record keys → readable headers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

/** Expand compact-key records into objects with readable header keys. */
export function expandRecords(
  records: AnyRecord[],
  columns: ColumnDef[],
): AnyRecord[] {
  return records.map((r) => {
    const row: AnyRecord = {};
    for (const col of columns) {
      const raw = r[col.key];
      row[col.header] = col.format ? col.format(raw) : (raw ?? "");
    }
    return row;
  });
}

// ---------------------------------------------------------------------------
// CSV generation (no extra deps)
// ---------------------------------------------------------------------------

function escapeCSV(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCSV(records: AnyRecord[], columns: ColumnDef[]): string {
  const headers = columns.map((c) => escapeCSV(c.header));
  const rows = records.map((r) =>
    columns.map((c) => {
      const raw = r[c.key];
      const val = c.format ? c.format(raw) : raw;
      return escapeCSV(val);
    }),
  );
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

// ---------------------------------------------------------------------------
// XLSX generation (uses already-installed xlsx package)
// ---------------------------------------------------------------------------

export async function toXLSX(
  records: AnyRecord[],
  columns: ColumnDef[],
  sheetName = "Data",
): Promise<Blob> {
  const XLSX = await import("xlsx");
  const expanded = expandRecords(records, columns);
  const ws = XLSX.utils.json_to_sheet(expanded, {
    header: columns.map((c) => c.header),
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// ---------------------------------------------------------------------------
// Browser download trigger
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export type DownloadFormat = "csv" | "xlsx";
export type DownloadVariant = "filtered" | "full";

function buildFilename(
  jurisdiction: string,
  domain: string,
  variant: DownloadVariant,
  format: DownloadFormat,
): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${jurisdiction}-${domain}-${variant}-${date}.${format}`;
}

export async function downloadData(
  records: AnyRecord[],
  columns: ColumnDef[],
  jurisdiction: string,
  domain: string,
  variant: DownloadVariant,
  format: DownloadFormat,
) {
  const filename = buildFilename(jurisdiction, domain, variant, format);

  if (format === "csv") {
    const csv = toCSV(records, columns);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, filename);
  } else {
    const blob = await toXLSX(records, columns, domain);
    downloadBlob(blob, filename);
  }
}
