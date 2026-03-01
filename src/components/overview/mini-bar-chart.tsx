"use client";

import { ComposedChart, Bar, Line, ResponsiveContainer, XAxis, Tooltip } from "recharts";

interface MiniBarChartProps {
  data: Array<{ month: string; count: number }>;
}

export function MiniBarChart({ data }: MiniBarChartProps) {
  if (data.length === 0) {
    return <div className="h-16 flex items-center justify-center text-xs text-[#999]">No data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={64}>
      <ComposedChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <XAxis dataKey="month" hide />
        <Tooltip
          labelFormatter={(label) => {
            const str = String(label);
            // Handle both YYYY-MM and school year "2023-24" formats
            const [y, m] = str.split("-");
            if (!y || !m) return label;
            if (m.length === 2 && parseInt(m) >= 1 && parseInt(m) <= 12) {
              return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
            }
            return `SY ${str}`;
          }}
          formatter={((value: number) => [Number(value).toLocaleString(), ""]) as never}
          contentStyle={{ fontSize: 11, border: "1px solid #d4d4d4", borderRadius: 4, padding: "4px 8px" }}
        />
        <Bar dataKey="count" fill="#2C1A6B" radius={[1, 1, 0, 0]} opacity={0.3} />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#2C1A6B"
          strokeWidth={1.5}
          dot={false}
          activeDot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
