"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { COLORS } from "@/lib/constants";

interface TrendChartProps {
  data: { month: string; count: number }[];
  title?: string;
  color?: string;
  height?: number;
}

export function TrendChart({
  data,
  title,
  color = COLORS.primary,
  height = 280,
}: TrendChartProps) {
  return (
    <div className="border border-border rounded-lg p-4 bg-white">
      {title && <h3 className="font-serif font-bold text-sm mb-3">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid stroke="#e8e8e8" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#999" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => {
              const [y, m] = v.split("-");
              return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m) - 1]} ${y.slice(2)}`;
            }}
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
            formatter={(value) => [Number(value).toLocaleString(), "Count"]}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
