"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Props = {
  data: { date: string; sessions: number; keyEvents: number }[];
};

export function SessionsTrendChart({ data }: Props) {
  return (
    <div className="rounded-md border p-4 h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="sessions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d3a95c" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#d3a95c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => d.slice(5)}
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} width={40} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="sessions"
            stroke="#be9853"
            fill="url(#sessions)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
