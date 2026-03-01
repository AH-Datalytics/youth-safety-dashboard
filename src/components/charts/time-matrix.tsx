"use client";

import { cn } from "@/lib/utils";

interface TimeMatrixProps {
  /** Array of { h: hour 0-23, dw: day 0=Sun..6=Sat, c: count } */
  data: { h: number; dw: number; c: number }[];
  title?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function TimeMatrix({ data, title }: TimeMatrixProps) {
  // Build lookup
  const lookup = new Map<string, number>();
  let maxCount = 0;
  for (const d of data) {
    const key = `${d.h}-${d.dw}`;
    const val = lookup.get(key) ?? 0;
    lookup.set(key, val + d.c);
    if (val + d.c > maxCount) maxCount = val + d.c;
  }

  const getIntensity = (h: number, dw: number): number => {
    const val = lookup.get(`${h}-${dw}`) ?? 0;
    if (maxCount === 0) return 0;
    return val / maxCount;
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-white">
      {title && <h3 className="font-serif font-bold text-sm mb-3">{title}</h3>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-[10px] font-mono text-muted-foreground p-1" />
              {HOURS.map((h) => (
                <th key={h} className="text-[10px] font-mono text-muted-foreground p-1 text-center">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, dw) => (
              <tr key={day}>
                <td className="text-[10px] font-mono text-muted-foreground p-1 pr-2">{day}</td>
                {HOURS.map((h) => {
                  const intensity = getIntensity(h, dw);
                  return (
                    <td key={h} className="p-0.5">
                      <div
                        className={cn(
                          "w-full aspect-square rounded-sm min-w-[16px]",
                          intensity === 0 && "bg-muted",
                        )}
                        style={
                          intensity > 0
                            ? {
                                backgroundColor: `color-mix(in srgb, #2C1A6B ${Math.round(intensity * 100)}%, #e8e8e8)`,
                              }
                            : undefined
                        }
                        title={`${day} ${h}:00 — ${(lookup.get(`${h}-${dw}`) ?? 0).toLocaleString()}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-1 mt-2">
        <span className="text-[10px] text-muted-foreground">Low</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
          <div
            key={v}
            className="w-3 h-3 rounded-sm"
            style={{
              backgroundColor: `color-mix(in srgb, #2C1A6B ${Math.round(v * 100)}%, #e8e8e8)`,
            }}
          />
        ))}
        <span className="text-[10px] text-muted-foreground">High</span>
      </div>
    </div>
  );
}
