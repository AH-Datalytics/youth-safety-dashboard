"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MiniBarChart } from "./mini-bar-chart";
import { formatPctChange, getPctChangeColor } from "@/lib/measures";

interface DomainCardProps {
  title: string;
  href: string;
  ytdCount: number | null;
  ytdPctChange: number | null;
  monthlyData: Array<{ month: string; count: number }>;
  isLoading?: boolean;
  /** For domains where an increase is positive (not concerning), flip the color */
  invertColor?: boolean;
  /** Label override below the value */
  valueLabel?: string;
}

export function DomainCard({
  title,
  href,
  ytdCount,
  ytdPctChange,
  monthlyData,
  isLoading,
  invertColor,
  valueLabel,
}: DomainCardProps) {
  if (isLoading) {
    return (
      <div className="border border-[#e8e8e8] rounded-lg p-4 bg-white">
        <div className="h-5 w-32 bg-[#f0f0f0] animate-pulse rounded mb-3" />
        <div className="h-10 w-24 bg-[#f0f0f0] animate-pulse rounded mb-2" />
        <div className="h-16 bg-[#f0f0f0] animate-pulse rounded mb-3" />
        <div className="h-4 w-20 bg-[#f0f0f0] animate-pulse rounded" />
      </div>
    );
  }

  const colorKey = getPctChangeColor(ytdPctChange);
  let colorClass = "text-[#999]";
  if (colorKey === "increase") colorClass = invertColor ? "text-[#1565c0]" : "text-[#c62828]";
  if (colorKey === "decrease") colorClass = invertColor ? "text-[#c62828]" : "text-[#1565c0]";

  const arrow = ytdPctChange !== null && ytdPctChange !== 0
    ? (ytdPctChange > 0 ? "\u25B2 " : "\u25BC ")
    : "";

  return (
    <Link
      href={href}
      className="block border border-[#e8e8e8] rounded-lg p-4 bg-white hover:border-primary hover:shadow-sm transition-all group"
    >
      <h3 className="font-serif text-lg font-bold text-primary">{title}</h3>

      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-3xl font-bold tabular-nums text-primary">
          {ytdCount !== null ? ytdCount.toLocaleString() : "—"}
        </span>
        {ytdPctChange !== null && (
          <span className={`text-sm font-semibold ${colorClass}`}>
            {arrow}{formatPctChange(ytdPctChange)} vs last year
          </span>
        )}
      </div>
      <p className="text-xs text-[#999] mt-0.5">{valueLabel || "Year-to-Date"}</p>

      <div className="mt-3">
        <MiniBarChart data={monthlyData} />
      </div>

      <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
        Explore {title}
        <ArrowUpRight className="h-3 w-3" />
      </div>
    </Link>
  );
}
