"use client";

import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn, formatNumber, formatPct, changeColor } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: number;
  priorValue?: number;
  pctChange?: number;
  loading?: boolean;
  /** Decimal places for value display (default: 0) */
  decimals?: number;
}

export function KPICard({ label, value, priorValue, pctChange, loading, decimals = 0 }: KPICardProps) {
  if (loading) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-3 bg-white/20 rounded w-20 mb-2" />
        <div className="h-8 bg-white/20 rounded w-24 mb-1" />
        <div className="h-3 bg-white/20 rounded w-16" />
      </div>
    );
  }

  const direction =
    pctChange !== undefined ? (Math.abs(pctChange) < 0.02 ? "flat" : pctChange > 0 ? "up" : "down") : null;

  return (
    <div className="p-4">
      <p className="text-xs text-white/60 uppercase tracking-wider font-sans mb-1">{label}</p>
      <p className="text-2xl md:text-3xl font-bold font-serif tabular-nums text-white">
        {decimals > 0 ? value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : formatNumber(value)}
      </p>
      {pctChange !== undefined && priorValue !== undefined && (
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-xs text-white/50">vs {formatNumber(priorValue)}</span>
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-semibold",
              direction === "up" && "text-red-300",
              direction === "down" && "text-blue-300",
              direction === "flat" && "text-white/50",
            )}
          >
            {direction === "up" && <ArrowUpRight className="h-3 w-3" />}
            {direction === "down" && <ArrowDownRight className="h-3 w-3" />}
            {direction === "flat" && <Minus className="h-3 w-3" />}
            {formatPct(pctChange)}
          </span>
        </div>
      )}
    </div>
  );
}
