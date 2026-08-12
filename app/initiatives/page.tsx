import { Suspense } from "react";
import { connection } from "next/server";
import { getInitiatives } from "@/lib/initiatives";
import { resolveLiveMetric } from "@/lib/initiatives-live";
import { InitiativeCard } from "@/components/initiative-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function InitiativesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">Initiatives</h1>
        <p className="text-sm text-muted-foreground mt-1">
          What we&apos;re running for the next 3 months — half tied to live
          dashboard data, half updated by hand. See what&apos;s performing and
          what isn&apos;t.
        </p>
      </div>

      <Suspense fallback={<InitiativesSkeleton />}>
        <InitiativesList />
      </Suspense>

      <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
        Updates flow via chat: tell me the new number for a manual metric
        (&ldquo;we&apos;ve contacted 5 companies&rdquo;) or a status change
        (&ldquo;Primal Focus launched&rdquo;), and I edit{" "}
        <code>lib/initiatives.ts</code> + redeploy. Live-metric rows pull
        automatically from GA4, Typeform, Places, and AI Search on the weekly
        cache — no manual update needed for those.
      </div>
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
