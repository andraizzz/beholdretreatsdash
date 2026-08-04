import { Suspense } from "react";
import { ApplicationSources } from "@/components/application-sources";
import { ApplicationTrend } from "@/components/application-trend";
import { DateRangeSelect } from "@/components/date-range-select";
import { SectionTitle } from "@/components/placeholder";
import { Skeleton } from "@/components/ui/skeleton";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function ApplicationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-3xl tracking-tight">Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Application volume and self-reported source, from the Typeform
            application form
          </p>
        </div>
        <Suspense fallback={<div className="w-[160px] h-9" />}>
          <DateRangeSelect />
        </Suspense>
      </div>

      <Suspense fallback={<ApplicationsSkeleton />}>
        <ApplicationsSection searchParams={searchParams} />
      </Suspense>

      <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
        Pipeline stage, deposits, and bookings need GoHighLevel connected —
        deferred until GHL&apos;s pipeline stages and Typeform sync are
        confirmed with the team.
      </div>
    </div>
  );
}

async function ApplicationsSection({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const daysParam = Array.isArray(params.days) ? params.days[0] : params.days;
  const days = Number(daysParam) || 7;

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle
          title="Application volume"
          subtitle={`Daily applications, last ${days} days — complete days only, today is excluded`}
        />
        <ApplicationTrend days={days} />
      </section>

      <ApplicationSources days={days} />
    </div>
  );
}

function ApplicationsSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-64" />
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
