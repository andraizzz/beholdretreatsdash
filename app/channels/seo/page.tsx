import { Suspense } from "react";
import { GscOverview } from "@/components/gsc-overview";
import { Skeleton } from "@/components/ui/skeleton";

export default function SeoPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">SEO</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organic search — what queries and pages are driving traffic
        </p>
      </div>

      <Suspense fallback={<SeoSkeleton />}>
        <GscOverview />
      </Suspense>
    </div>
  );
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
