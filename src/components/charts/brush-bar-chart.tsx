"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
} from "recharts";
import { COLORS } from "@/lib/constants";

const MONTH_ABBRS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonthShort(v: string) {
  const [y, m] = v.split("-");
  return `${MONTH_ABBRS[parseInt(m) - 1]} ${y.slice(2)}`;
}

function formatMonthLong(v: string) {
  const s = String(v);
  const [y, m] = s.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

interface BrushBarChartProps {
  data: { month: string; count: number }[];
  /** Current brush start index (null = full range) */
  startIndex?: number | null;
  /** Current brush end index */
  endIndex?: number | null;
  /** Called when brush range changes */
  onRangeChange?: (start: number, end: number) => void;
  color?: string;
  height?: number;
}

export function BrushBarChart({
  data,
  startIndex,
  endIndex,
  onRangeChange,
  color = COLORS.primary,
  height = 280,
}: BrushBarChartProps) {
  return (
    <div className="border border-border rounded-lg p-4 bg-white">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid stroke="#e8e8e8" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "#999" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatMonthShort}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#999" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v.toLocaleString()}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: "1px solid #d4d4d4",
              borderRadius: 4,
              boxShadow: "none",
            }}
            labelFormatter={(v) => formatMonthLong(String(v))}
            formatter={(value) => [Number(value).toLocaleString(), "Referrals"]}
          />
          <Bar dataKey="count" fill={color} radius={[2, 2, 0, 0]} />
          <Brush
            dataKey="month"
            height={30}
            stroke={COLORS.accent}
            fill="#f5f3ff"
            tickFormatter={formatMonthShort}
            startIndex={startIndex ?? 0}
            endIndex={endIndex ?? data.length - 1}
            onChange={(range) => {
              if (onRangeChange && range && typeof range.startIndex === "number" && typeof range.endIndex === "number") {
                onRangeChange(range.startIndex, range.endIndex);
              }
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
