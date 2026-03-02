"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Download, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useJurisdiction } from "@/lib/jurisdiction-context";
import { downloadData, type DownloadFormat, type DownloadVariant } from "@/lib/download";
import type { ColumnDef } from "@/config/download-columns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface DownloadButtonProps {
  domain: string;
  columns: ColumnDef[];
  filteredData: AnyRecord[];
  fullData: AnyRecord[];
  isLoading?: boolean;
}

export function DownloadButton({
  domain,
  columns,
  filteredData,
  fullData,
  isLoading,
}: DownloadButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { id: jurisdiction } = useJurisdiction();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleDownload = useCallback(
    async (variant: DownloadVariant, format: DownloadFormat) => {
      const records = variant === "filtered" ? filteredData : fullData;
      await downloadData(records, columns, jurisdiction, domain, variant, format);
      setOpen(false);
    },
    [filteredData, fullData, columns, jurisdiction, domain],
  );

  const disabled = isLoading || fullData.length === 0;
  const filteredCount = filteredData.length;
  const fullCount = fullData.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 border rounded px-2 py-1 text-sm transition-colors",
          disabled
            ? "border-border text-muted-foreground opacity-50 cursor-not-allowed"
            : "border-border text-muted-foreground hover:border-accent hover:text-foreground bg-white",
        )}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Download</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-border rounded shadow-lg z-50 w-56">
          {/* Filtered data section */}
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Filtered data ({filteredCount.toLocaleString()} rows)
            </p>
          </div>
          <button
            onClick={() => handleDownload("filtered", "csv")}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            Download CSV
          </button>
          <button
            onClick={() => handleDownload("filtered", "xlsx")}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            Download Excel
          </button>

          {/* Divider */}
          <div className="border-t border-border my-1" />

          {/* Full dataset section */}
          <div className="px-3 pt-1 pb-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Full dataset ({fullCount.toLocaleString()} rows)
            </p>
          </div>
          <button
            onClick={() => handleDownload("full", "csv")}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            Download CSV
          </button>
          <button
            onClick={() => handleDownload("full", "xlsx")}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors mb-1"
          >
            Download Excel
          </button>
        </div>
      )}
    </div>
  );
}
