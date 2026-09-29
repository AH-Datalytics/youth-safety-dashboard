"use client";

import { formatPctChange } from "@/lib/measures";

interface BannerKPI {
  count: number;
  pctChange: number | null;
}

interface CardKPI {
  ytdCount: number;
  ytdPctChange: number | null;
  /** Period the count covers, e.g. "Jan–Aug 2026". */
  label?: string;
}

interface KPIBannerProps {
  offenses: BannerKPI | null;
  arrests: BannerKPI | null;
  clearedUnder17: BannerKPI | null;
  clearedOver18: BannerKPI | null;
  requests311: BannerKPI | null;
  /**
   * Stand-ins shown only when a jurisdiction can't publish some of the
   * standard measures, so its banner isn't a row of dashes.
   */
  youthCourt?: CardKPI | null;
  schoolDiscipline?: CardKPI | null;
  isLoading?: boolean;
  /** Measure keys the jurisdiction's sources cannot produce. */
  unavailableMeasures?: readonly string[];
}

function KPIBlock({
  label,
  value,
  pctChange,
  increaseIsBad,
  isLoading,
  unavailable,
  period,
}: {
  label: string;
  /** Shown under the value when the measure isn't calendar year-to-date. */
  period?: string;
  value: string;
  pctChange: number | null;
  increaseIsBad?: boolean;
  isLoading?: boolean;
  /** The jurisdiction's source cannot produce this measure. */
  unavailable?: boolean;
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

  if (unavailable) {
    return (
      <div className="flex flex-col items-center gap-0.5 px-4 py-3">
        <span className="text-xs text-white/60 uppercase tracking-wider font-medium">
          {label}
        </span>
        <span className="text-2xl font-bold text-white/40">&mdash;</span>
        <span className="text-xs text-white/50">Not published</span>
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
      {period && <span className="text-xs text-white/50">{period}</span>}
      {pctChange !== null && (
        <span className={`text-xs font-semibold ${changeColor}`}>
          {arrow}
          {formatPctChange(pctChange)} vs last year
        </span>
      )}
    </div>
  );
}

/** Tailwind needs literal class names, so map the block count to a grid. */
const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
};

type BlockProps = Parameters<typeof KPIBlock>[0];

export function KPIBanner({
  offenses,
  arrests,
  clearedUnder17,
  clearedOver18,
  requests311,
  youthCourt,
  schoolDiscipline,
  isLoading,
  unavailableMeasures = [],
}: KPIBannerProps) {
  const unavailable = new Set(unavailableMeasures);

  const standard: Array<BlockProps & { measure?: string }> = [
    {
      label: "Offenses YTD",
      value: offenses?.count?.toLocaleString() ?? "—",
      pctChange: offenses?.pctChange ?? null,
      increaseIsBad: true,
    },
    {
      measure: "arrests",
      label: "Arrests YTD",
      value: arrests?.count?.toLocaleString() ?? "—",
      pctChange: arrests?.pctChange ?? null,
      increaseIsBad: true,
    },
    {
      measure: "youth-clearance",
      label: "Arrests (17 & Under)",
      value: clearedUnder17?.count?.toLocaleString() ?? "—",
      pctChange: clearedUnder17?.pctChange ?? null,
      increaseIsBad: true,
    },
    {
      measure: "youth-clearance",
      label: "Arrests (18 & Older)",
      value: clearedOver18?.count?.toLocaleString() ?? "—",
      pctChange: clearedOver18?.pctChange ?? null,
      increaseIsBad: true,
    },
    {
      measure: "311",
      label: "311 Requests YTD",
      value: requests311?.count?.toLocaleString() ?? "—",
      pctChange: requests311?.pctChange ?? null,
      increaseIsBad: false,
    },
  ];

  // Drop measures this jurisdiction can't produce; if any were dropped, fill
  // with the youth court and school discipline headlines instead.
  const blocks: BlockProps[] = standard.filter((b) => !b.measure || !unavailable.has(b.measure));
  if (blocks.length < standard.length) {
    blocks.push(
      {
        label: "Youth Court Referrals",
        value: youthCourt?.ytdCount?.toLocaleString() ?? "—",
        pctChange: youthCourt?.ytdPctChange ?? null,
        increaseIsBad: true,
        period: youthCourt?.label,
      },
      {
        label: "School Discipline Incidents",
        value: schoolDiscipline?.ytdCount?.toLocaleString() ?? "—",
        pctChange: schoolDiscipline?.ytdPctChange ?? null,
        increaseIsBad: true,
        period: schoolDiscipline?.label,
      },
    );
  }

  return (
    <div className="bg-[#2C1A6B] rounded-lg mb-6 overflow-hidden">
      <div className={`grid ${GRID_COLS[blocks.length] ?? GRID_COLS[5]} divide-x divide-white/10`}>
        {blocks.map((b) => (
          <KPIBlock key={b.label} {...b} isLoading={isLoading} />
        ))}
      </div>
    </div>
  );
}
