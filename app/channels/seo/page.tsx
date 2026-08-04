import { Suspense } from "react";
import { GscOverview } from "@/components/gsc-overview";
import { DateRangeSelect } from "@/components/date-range-select";
import { Skeleton } from "@/components/ui/skeleton";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function SeoPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-3xl tracking-tight">SEO</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organic search — what queries and pages are driving traffic
          </p>
        </div>
        <Suspense fallback={<div className="w-[160px] h-9" />}>
          <DateRangeSelect />
        </Suspense>
      </div>

      <Suspense fallback={<SeoSkeleton />}>
        <GscOverviewSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function GscOverviewSection({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const daysParam = Array.isArray(params.days) ? params.days[0] : params.days;
  const days = Number(daysParam) || 7;
  return <GscOverview days={days} />;
}

function SeoSkeleton() {
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
