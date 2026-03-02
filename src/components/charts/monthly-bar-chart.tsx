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
  LabelList,
} from "recharts";
import { COLORS } from "@/lib/constants";

interface MonthlyBarChartProps {
  data: { month: string; count: number }[];
  title?: string;
  color?: string;
  height?: number;
  showLabels?: boolean;
}

export function MonthlyBarChart({
  data,
  title,
  color = COLORS.primary,
  height = 300,
  showLabels = false,
}: MonthlyBarChartProps) {
  return (
    <div className="border border-border rounded-lg p-4 bg-white">
      {title && <h3 className="font-serif font-bold text-sm mb-3">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: showLabels ? 20 : 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid stroke="#e8e8e8" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "#999" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => {
              const [y, m] = v.split("-");
              return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(m) - 1]} ${y.slice(2)}`;
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
            labelFormatter={(v) => {
              const s = String(v);
              const [y, m] = s.split("-");
              return `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][parseInt(m) - 1]} ${y}`;
            }}
            formatter={(value) => [Number(value).toLocaleString(), "Count"]}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={color} />
            ))}
            {showLabels && (
              <LabelList
                dataKey="count"
                position="top"
                style={{ fontSize: 9, fill: "#666" }}
                formatter={(v) => Number(v).toLocaleString()}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
