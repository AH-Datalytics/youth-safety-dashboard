"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { COLORS } from "@/lib/constants";

interface BarChartHorizontalProps {
  data: { key: string; count: number }[];
  title?: string;
  color?: string;
  height?: number;
  maxBars?: number;
  /** When set, bars are clickable and clicking toggles a filter value */
  onBarClick?: (key: string) => void;
  /** Currently active/selected bar keys (highlighted) */
  activeKeys?: string[];
}

export function BarChartHorizontal({
  data,
  title,
  color = COLORS.primary,
  height,
  maxBars = 15,
  onBarClick,
  activeKeys,
}: BarChartHorizontalProps) {
  const display = data.slice(0, maxBars);
  const computedHeight = height ?? Math.max(200, display.length * 28 + 40);
  const isInteractive = !!onBarClick;
  const hasActive = activeKeys && activeKeys.length > 0;

  return (
    <div className="border border-border rounded-lg p-4 bg-white">
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif font-bold text-sm">{title}</h3>
          {isInteractive && hasActive && (
            <button
              onClick={() => onBarClick?.("")}
              className="text-xs text-accent hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      )}
      <ResponsiveContainer width="100%" height={computedHeight}>
        <BarChart
          data={display}
          layout="vertical"
          margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
          onClick={(e) => {
            if (onBarClick && e?.activeLabel) onBarClick(String(e.activeLabel));
          }}
          style={isInteractive ? { cursor: "pointer" } : undefined}
        >
          <CartesianGrid stroke="#e8e8e8" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#999" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v.toLocaleString()}
          />
          <YAxis
            type="category"
            dataKey="key"
            tick={{ fontSize: 11, fill: "#666" }}
            tickLine={false}
            axisLine={false}
            width={180}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: "1px solid #d4d4d4",
              borderRadius: 4,
              boxShadow: "none",
            }}
            formatter={(value) => [Number(value).toLocaleString(), "Count"]}
          />
          <Bar dataKey="count" radius={[0, 3, 3, 0]} fill={color}>
            {hasActive &&
              display.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={activeKeys.includes(entry.key) ? color : `${color}33`}
                />
              ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
