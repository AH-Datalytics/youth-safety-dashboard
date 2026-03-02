"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";

interface MultiLineChartProps {
  /** Each data point has a `month` key + one key per series */
  data: Record<string, unknown>[];
  /** Names of the series to plot (keys in data objects) */
  series: string[];
  title?: string;
  height?: number;
  xKey?: string;
}

export function MultiLineChart({
  data,
  series,
  title,
  height = 300,
  xKey = "month",
}: MultiLineChartProps) {
  return (
    <div className="border border-border rounded-lg p-4 bg-white">
      {title && <h3 className="font-serif font-bold text-sm mb-3">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid stroke="#e8e8e8" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "#999" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => {
              const [y, m] = v.split("-");
              if (!y || !m) return v;
              const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
              return `${months[parseInt(m) - 1] ?? m} ${y.slice(2)}`;
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
            formatter={(value) => [Number(value).toLocaleString(), undefined]}
          />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          {series.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              name={name}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
