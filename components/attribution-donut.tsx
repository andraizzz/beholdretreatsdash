"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type Props = {
  data: { name: string; value: number }[];
};

const COLORS: Record<string, string> = {
  Search: "#d3a95c",
  Social: "#05133a",
  Email: "#8a9a8b",
  "Referral / Article": "#b6805c",
  AI: "#6b7a99",
};

const FALLBACK = "#d8d5cc";

export function AttributionDonut({ data }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={2}
            stroke="var(--background)"
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={COLORS[entry.name] ?? FALLBACK}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const v = Number(value ?? 0);
              const pct = total > 0 ? ((v / total) * 100).toFixed(0) : "0";
              return [`${v} (${pct}%)`, String(name)];
            }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              borderColor: "var(--border)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
