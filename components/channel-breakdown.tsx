"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ChannelBreakdownRow = {
  channel: string;
  sessions: number;
  previousSessions: number | null;
  share: number;
  deltaPct: number | null;
  engagementRate: number;
  keyEvents: number;
};

const COLORS = [
  "#d3a95c",
  "#05133a",
  "#8a9a8b",
  "#b6805c",
  "#6b7a99",
  "#c9c3b4",
];

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function statusFor(deltaPct: number | null) {
  if (deltaPct === null) {
    return { label: "New", variant: "secondary" as const };
  }
  if (deltaPct >= 5) {
    return { label: "Working", variant: "working" as const };
  }
  if (deltaPct <= -5) {
    return { label: "Not working", variant: "not-working" as const };
  }
  return { label: "Steady", variant: "secondary" as const };
}

export function ChannelBreakdown({ rows }: { rows: ChannelBreakdownRow[] }) {
  const chartData = rows.map((r) => ({ name: r.channel, value: r.sessions }));

  return (
    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
      <div className="h-56 md:h-auto">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              stroke="var(--background)"
              strokeWidth={2}
            >
              {chartData.map((entry, i) => (
                <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                `${formatNumber(Number(value ?? 0))} sessions`,
                String(name),
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                borderColor: "var(--border)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="divide-y">
        {rows.map((row, i) => {
          const status = statusFor(row.deltaPct);
          return (
            <div
              key={row.channel}
              className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {row.channel}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      status.variant === "working" &&
                        "border-emerald-200 bg-emerald-50 text-emerald-700",
                      status.variant === "not-working" &&
                        "border-red-200 bg-red-50 text-red-700",
                    )}
                  >
                    {status.label}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatNumber(row.sessions)} sessions ·{" "}
                  {(row.share * 100).toFixed(0)}% of traffic ·{" "}
                  {row.keyEvents} key event{row.keyEvents === 1 ? "" : "s"}
                </div>
              </div>
              <div
                className={cn(
                  "text-sm font-medium tabular-nums shrink-0",
                  row.deltaPct !== null && row.deltaPct > 0 && "text-emerald-600",
                  row.deltaPct !== null && row.deltaPct < 0 && "text-red-600",
                  row.deltaPct === null && "text-muted-foreground",
                )}
              >
                {row.deltaPct === null
                  ? "—"
                  : `${row.deltaPct > 0 ? "↑" : row.deltaPct < 0 ? "↓" : ""} ${Math.abs(row.deltaPct)}%`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
