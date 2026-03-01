"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { COLORS } from "@/lib/constants";

interface BarChartHorizontalProps {
  data: { key: string; count: number }[];
  title?: string;
  color?: string;
  height?: number;
  maxBars?: number;
}

export function BarChartHorizontal({
  data,
  title,
  color = COLORS.primary,
  height,
  maxBars = 15,
}: BarChartHorizontalProps) {
  const display = data.slice(0, maxBars);
  const computedHeight = height ?? Math.max(200, display.length * 28 + 40);

  return (
    <div className="border border-border rounded-lg p-4 bg-white">
      {title && <h3 className="font-serif font-bold text-sm mb-3">{title}</h3>}
      <ResponsiveContainer width="100%" height={computedHeight}>
        <BarChart data={display} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
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
          <Bar dataKey="count" fill={color} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
