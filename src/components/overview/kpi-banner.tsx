"use client";

import { formatPctChange } from "@/lib/measures";

interface BannerKPI {
  count: number;
  pctChange: number | null;
}

interface KPIBannerProps {
  offenses: BannerKPI | null;
  arrests: BannerKPI | null;
  cfs: BannerKPI | null;
  requests311: BannerKPI | null;
  isLoading?: boolean;
}

function KPIBlock({
  label,
  value,
  pctChange,
  increaseIsBad,
  isLoading,
}: {
  label: string;
  value: string;
  pctChange: number | null;
  increaseIsBad?: boolean;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-1 px-4 py-3">
        <div className="h-3 w-16 bg-white/20 animate-pulse rounded" />
        <div className="h-7 w-12 bg-white/20 animate-pulse rounded" />
        <div className="h-3 w-20 bg-white/20 animate-pulse rounded" />
      </div>
    );
  }

  const arrow =
    pctChange !== null && pctChange !== 0
      ? pctChange > 0
        ? "\u25B2 "
        : "\u25BC "
      : "";

  let changeColor = "text-white/60";
  if (pctChange !== null && pctChange !== 0) {
    const isIncrease = pctChange > 0;
    const isBad = increaseIsBad !== false ? isIncrease : !isIncrease;
    changeColor = isBad ? "text-red-300" : "text-emerald-300";
  }

  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-3">
      <span className="text-xs text-white/60 uppercase tracking-wider font-medium">
        {label}
      </span>
      <span className="text-2xl font-bold tabular-nums text-white">
        {value}
      </span>
      {pctChange !== null && (
        <span className={`text-xs font-semibold ${changeColor}`}>
          {arrow}
          {formatPctChange(pctChange)} vs last year
        </span>
      )}
    </div>
  );
}

export function KPIBanner({
  offenses,
  arrests,
  cfs,
  requests311,
  isLoading,
}: KPIBannerProps) {
  return (
    <div className="bg-[#2C1A6B] rounded-lg mb-6 overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
        <KPIBlock
          label="Offenses YTD"
          value={offenses?.count?.toLocaleString() ?? "—"}
          pctChange={offenses?.pctChange ?? null}
          increaseIsBad={true}
          isLoading={isLoading}
        />
        <KPIBlock
          label="Arrests YTD"
          value={arrests?.count?.toLocaleString() ?? "—"}
          pctChange={arrests?.pctChange ?? null}
          increaseIsBad={true}
          isLoading={isLoading}
        />
        <KPIBlock
          label="CFS Calls YTD"
          value={cfs?.count?.toLocaleString() ?? "—"}
          pctChange={cfs?.pctChange ?? null}
          increaseIsBad={true}
          isLoading={isLoading}
        />
        <KPIBlock
          label="311 Requests YTD"
          value={requests311?.count?.toLocaleString() ?? "—"}
          pctChange={requests311?.pctChange ?? null}
          increaseIsBad={false}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
