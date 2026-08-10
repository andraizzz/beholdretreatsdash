"use client";

import { useState, useTransition } from "react";
import { saveThisWeekSpend } from "@/app/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  initial: { bing: number; crNews: number; weekStart: string } | null;
};

function formatWeekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function SpendInput({ initial }: Props) {
  const [bing, setBing] = useState<string>(
    initial?.bing !== undefined ? String(initial.bing) : "",
  );
  const [crNews, setCrNews] = useState<string>(
    initial?.crNews !== undefined ? String(initial.crNews) : "",
  );
  const [status, setStatus] = useState<
    "idle" | "saved" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total =
    (Number.parseFloat(bing) || 0) + (Number.parseFloat(crNews) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await saveThisWeekSpend({
          bing: Number.parseFloat(bing) || 0,
          crNews: Number.parseFloat(crNews) || 0,
        });
        setStatus("saved");
      } catch (error) {
        setStatus("error");
        setErrorMsg(error instanceof Error ? error.message : String(error));
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Weekly ad spend{" "}
          {initial && (
            <span className="text-muted-foreground font-normal">
              — {formatWeekLabel(initial.weekStart)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Bing (USD)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={bing}
              onChange={(e) => setBing(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">
              Costa Rica News (USD)
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={crNews}
              onChange={(e) => setCrNews(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0"
            />
          </label>
          <div className="text-sm">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-medium tabular-nums h-[34px] flex items-center">
              ${total.toFixed(2)}
            </div>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </form>
        {status === "saved" && (
          <div className="text-xs text-emerald-700 mt-2">
            Saved. The Cost-per-application tile above will update on the next refresh.
          </div>
        )}
        {status === "error" && (
          <div className="text-xs text-red-600 mt-2">
            Couldn&apos;t save: {errorMsg}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
