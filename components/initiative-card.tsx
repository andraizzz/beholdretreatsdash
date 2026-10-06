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
  const done = init.status === "complete";
  const overdue = days < 0 && !done;
  return (
    <Card
      className={cn(
        done && "border-2 border-emerald-500 bg-emerald-50 shadow-md ring-0",
      )}
    >
      {done && (
        <div className="-mt-4 flex items-center gap-2 bg-emerald-600 px-5 py-2 text-sm font-bold uppercase tracking-widest text-white">
          <span className="text-lg" aria-hidden>🎉</span> Goal achieved
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            {done && (
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white"
                aria-hidden
              >
                ✓
              </span>
            )}
            <div>
              <CardTitle
                className={cn(
                  "text-2xl font-heading tracking-tight leading-tight",
                  done && "text-emerald-900",
                )}
              >
                {init.title}
              </CardTitle>
              <div className="text-sm text-muted-foreground mt-1.5">
                {init.owner}
                {!done && (
                  <>
                    {" · "}
                    <span className={cn(overdue && "text-red-600 font-medium")}>
                      {days >= 0
                        ? `${days} days left`
                        : `${Math.abs(days)} days overdue`}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {!done && (
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-xs uppercase tracking-wide",
                STATUS_STYLES[init.status],
              )}
            >
              {STATUS_LABELS[init.status]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-lg leading-snug">
          {init.highlights.map((h, i) => (
            <li key={i} className="flex gap-3">
              <span
                className={cn(
                  "shrink-0",
                  done ? "text-emerald-600" : "text-muted-foreground",
                )}
                aria-hidden
              >
                •
              </span>
              <span className={cn(done && "font-medium text-emerald-950")}>
                {h}
              </span>
            </li>
          ))}
        </ul>

        {live && !done && (
          <div className="rounded-md border p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              {live.label}
            </div>
            <div
              className={cn(
                "text-lg font-semibold",
                live.tone === "positive" && "text-emerald-700",
                live.tone === "negative" && "text-red-700",
              )}
            >
              {live.value}
            </div>
          </div>
        )}

        {init.tasks && init.tasks.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm uppercase tracking-wide text-muted-foreground font-medium">
              Tasks: {init.tasks.filter((t) => t.done).length} of{" "}
              {init.tasks.length} done
            </div>
            <ul className="space-y-2 text-base">
              {init.tasks.map((t, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-3 rounded-md px-3 py-2 leading-snug",
                    t.done
                      ? "bg-emerald-100 text-emerald-900 font-medium"
                      : "bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0 text-xl leading-none",
                      t.done ? "text-emerald-600" : "text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    {t.done ? "✅" : "☐"}
                  </span>
                  <span>{t.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
