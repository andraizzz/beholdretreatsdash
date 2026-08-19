import type { Initiative, InitiativeStatus } from "@/lib/initiatives";
import type { ResolvedLiveMetric } from "@/lib/initiatives-live";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<InitiativeStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
  blocked: "Blocked",
};

const STATUS_STYLES: Record<InitiativeStatus, string> = {
  not_started: "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blocked: "border-red-200 bg-red-50 text-red-700",
};

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function daysUntil(iso: string): number {
  const target = new Date(`${iso}T00:00:00Z`).getTime();
  return Math.ceil((target - Date.now()) / (24 * 60 * 60 * 1000));
}

type Props = {
  initiative: Initiative;
  live: ResolvedLiveMetric | null;
};

export function InitiativeCard({ initiative: init, live }: Props) {
  const days = daysUntil(init.targetAt);
  const overdue = days < 0 && init.status !== "complete";
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-xl font-heading tracking-tight leading-tight">
              {init.title}
            </CardTitle>
            <div className="text-xs text-muted-foreground mt-1.5">
              {init.owner} · {formatDate(init.startedAt)} → {formatDate(init.targetAt)}
              {" · "}
              <span className={cn(overdue && "text-red-600 font-medium")}>
                {days >= 0 ? `${days} days left` : `${Math.abs(days)} days overdue`}
              </span>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 text-[10px] uppercase tracking-wide", STATUS_STYLES[init.status])}
          >
            {STATUS_LABELS[init.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground leading-snug">{init.description}</p>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border p-3 space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
              Progress
            </div>
            <div className="font-medium">{init.manualProgress}</div>
            <div className="text-[10px] text-muted-foreground">
              What we&apos;re measuring: {init.metric}
            </div>
          </div>

          {live && (
            <div className="rounded-md border p-3 space-y-1">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                {live.label}
              </div>
              <div
                className={cn(
                  "font-medium",
                  live.tone === "positive" && "text-emerald-700",
                  live.tone === "negative" && "text-red-700",
                )}
              >
                {live.value}
              </div>
              {live.detail && (
                <div className="text-[10px] text-muted-foreground">
                  {live.detail}
                </div>
              )}
            </div>
          )}
        </div>

        {init.tasks && init.tasks.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
              Tasks ({init.tasks.filter((t) => t.done).length} of{" "}
              {init.tasks.length} done)
            </div>
            <ul className="space-y-1.5 text-sm">
              {init.tasks.map((t, i) => (
                <li key={i} className="flex items-start gap-2 leading-snug">
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 select-none tabular-nums",
                      t.done ? "text-emerald-600" : "text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    {t.done ? "☑" : "☐"}
                  </span>
                  <span
                    className={cn(
                      t.done && "line-through text-muted-foreground",
                    )}
                  >
                    {t.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {init.notes.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
              Recent updates
            </div>
            <ul className="space-y-1 text-xs">
              {init.notes.slice(0, 4).map((n, i) => (
                <li key={i} className="text-muted-foreground">
                  <span className="tabular-nums font-medium mr-2">{n.date}</span>
                  {n.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
