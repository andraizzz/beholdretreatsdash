"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Props = {
  terms: readonly string[];
  data: { date: string; values: number[] }[];
};

const COLORS = ["#d3a95c", "#05133a", "#8a9a8b"];

export function CompetitorTrendsChart({ terms, data }: Props) {
  const chartData = data.map((point) => {
    const row: Record<string, string | number> = { date: point.date };
    terms.forEach((term, i) => {
      row[term] = point.values[i] ?? 0;
    });
    return row;
  });

  return (
    <div className="rounded-md border p-4 h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            width={30}
            domain={[0, 100]}
            label={{
              value: "Search interest",
              angle: -90,
              position: "insideLeft",
              fontSize: 11,
            }}
          />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {terms.map((term, i) => (
            <Line
              key={term}
              type="monotone"
              dataKey={term}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={term === "Behold Retreats" ? 2.5 : 1.75}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
