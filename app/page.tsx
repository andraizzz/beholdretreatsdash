import { Suspense } from "react";
import { Ga4Overview } from "@/components/ga4-overview";
import { Ga4SinceLaunch } from "@/components/ga4-since-launch";
import { RefreshButton } from "@/components/refresh-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function OverviewPage() {
  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Traffic and channels from Google Analytics
          </p>
        </div>
        <RefreshButton />
      </div>

      <Suspense fallback={<OverviewSkeleton />}>
        <Ga4Overview />
      </Suspense>

      <Separator />

      <Suspense fallback={<OverviewSkeleton />}>
        <Ga4SinceLaunch />
      </Suspense>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
