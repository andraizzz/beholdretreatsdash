import { Suspense } from "react";
import { connection } from "next/server";
import { getInitiatives, getWindowProgress } from "@/lib/initiatives";
import { resolveLiveMetric } from "@/lib/initiatives-live";
import { InitiativeCard } from "@/components/initiative-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function InitiativesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">Initiatives</h1>
        <p className="text-base text-muted-foreground mt-1">
          3-month plan: Aug 12 → Nov 12, 2026
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-28" />}>
        <ProgressBanner />
      </Suspense>

      <Suspense fallback={<InitiativesSkeleton />}>
        <InitiativesList />
      </Suspense>

    </div>
  );
}

async function InitiativesList() {
  await connection();
  const initiatives = getInitiatives();

  // Resolve live metrics in parallel — each hits a cached upstream fetcher,
  // so this is fast even the first time (later loads hit the "use cache: remote"
  // entries the rest of the dashboard has already populated this week).
  const cards = await Promise.all(
    initiatives.map(async (init) => ({
      init,
      live: await resolveLiveMetric(init),
    })),
  );

  return (
    <div className="grid gap-4">
      {cards.map(({ init, live }) => (
        <InitiativeCard key={init.id} initiative={init} live={live} />
      ))}
    </div>
  );
}

function InitiativesSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className="h-40" />
      ))}
    </div>
  );
}

async function ProgressBanner() {
  await connection();
  const { totalDays, elapsed, daysLeft, timePct } = getWindowProgress();

  const all = getInitiatives();
  const done = all.filter((i) => i.status === "complete").length;
  const donePct = Math.round((done / all.length) * 100);
  const ahead = donePct >= timePct;

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-heading text-xl tracking-tight">
          {daysLeft} days left
          <span className="text-sm text-muted-foreground font-sans ml-2">
            day {elapsed} of {totalDays} · ends Nov 12
          </span>
        </div>
        <div
          className={`text-sm font-medium ${ahead ? "text-emerald-700" : "text-amber-700"}`}
        >
          {done} of {all.length} initiatives complete ({donePct}%) vs. {timePct}% of time used
        </div>
      </div>
      <div className="space-y-2">
        <Bar label="Time elapsed" pct={timePct} color="bg-muted-foreground/50" />
        <Bar label="Initiatives complete" pct={donePct} color="bg-emerald-500" />
      </div>
    </div>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-36 shrink-0 text-muted-foreground">{label}</div>
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-10 text-right tabular-nums">{pct}%</div>
    </div>
  );
}
