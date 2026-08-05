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
  topSource: { source: string; sessions: number; isSelfReferral: boolean } | null;
};

const COLORS = [
  "#d3a95c",
  "#05133a",
  "#8a9a8b",
  "#b6805c",
  "#6b7a99",
  "#a8b5c4",
];

const OTHER_COLOR = "#d8d5cc";

// Slices below this share of traffic get folded into "Other" so the donut
// stays readable — the list below it still itemizes every channel.
const MIN_SLICE_SHARE = 0.02;

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
  const major = rows.filter((r) => r.share >= MIN_SLICE_SHARE);
  const minorSessions = rows
    .filter((r) => r.share < MIN_SLICE_SHARE)
    .reduce((sum, r) => sum + r.sessions, 0);

  const chartData = [
    ...major.map((r, i) => ({
      name: r.channel,
      value: r.sessions,
      color: COLORS[i % COLORS.length],
    })),
    ...(minorSessions > 0
      ? [{ name: "Other", value: minorSessions, color: OTHER_COLOR }]
      : []),
  ];

  const colorFor = (channel: string, index: number) =>
    index < major.length ? COLORS[index % COLORS.length] : OTHER_COLOR;

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
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
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

      <div className="divide-y max-w-xl">
        {rows.map((row, i) => {
          const status = statusFor(row.deltaPct);
          return (
            <div key={row.channel} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colorFor(row.channel, i) }}
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
                {row.topSource && (
                  <div className="text-xs mt-0.5 flex items-center gap-1">
                    <span className="text-muted-foreground">
                      top source: {row.topSource.source}
                    </span>
                    {row.topSource.isSelfReferral && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-amber-200 bg-amber-50 text-amber-700"
                      >
                        self-referral
                      </Badge>
                    )}
                  </div>
                )}
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
