import { Suspense } from "react";
import { Ga4Overview } from "@/components/ga4-overview";
import { Ga4SinceLaunch } from "@/components/ga4-since-launch";
import { ApplicationSources } from "@/components/application-sources";
import { WeeklyInsights } from "@/components/weekly-insights";
import { RefreshButton } from "@/components/refresh-button";
import { DateRangeSelect } from "@/components/date-range-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function OverviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-3xl tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Traffic and channels from Google Analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={<div className="w-[160px] h-9" />}>
            <DateRangeSelect />
          </Suspense>
          <RefreshButton />
        </div>
      </div>

      <Suspense fallback={<InsightsSkeleton />}>
        <WeeklyInsights />
      </Suspense>

      <Suspense fallback={<OverviewSkeleton />}>
        <Ga4OverviewSection searchParams={searchParams} />
      </Suspense>

      <Separator />

      <Suspense fallback={<OverviewSkeleton />}>
        <ApplicationSourcesSection searchParams={searchParams} />
      </Suspense>

      <Separator />

      <Suspense fallback={<OverviewSkeleton />}>
        <Ga4SinceLaunch />
      </Suspense>
    </div>
  );
}

async function Ga4OverviewSection({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const daysParam = Array.isArray(params.days) ? params.days[0] : params.days;
  const days = Number(daysParam) || 7;
  return <Ga4Overview days={days} />;
}

async function ApplicationSourcesSection({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const daysParam = Array.isArray(params.days) ? params.days[0] : params.days;
  const days = Number(daysParam) || 7;
  return <ApplicationSources days={days} />;
}

function InsightsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
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
