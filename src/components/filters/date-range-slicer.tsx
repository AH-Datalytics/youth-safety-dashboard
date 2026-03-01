"use client";

interface DateRangeSlicerProps {
  dateFrom: string | null;
  dateTo: string | null;
  onDateFromChange: (v: string | null) => void;
  onDateToChange: (v: string | null) => void;
  min?: string;
  max?: string;
}

export function DateRangeSlicer({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  min = "2017-01-01",
  max,
}: DateRangeSlicerProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">From</label>
      <input
        type="date"
        value={dateFrom ?? ""}
        min={min}
        max={dateTo ?? max}
        onChange={(e) => onDateFromChange(e.target.value || null)}
        className="border border-border rounded px-2 py-1 text-sm bg-white"
      />
      <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">To</label>
      <input
        type="date"
        value={dateTo ?? ""}
        min={dateFrom ?? min}
        max={max}
        onChange={(e) => onDateToChange(e.target.value || null)}
        className="border border-border rounded px-2 py-1 text-sm bg-white"
      />
    </div>
  );
}
