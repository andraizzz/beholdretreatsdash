import { Suspense } from "react";
import { CompetitorReputation } from "@/components/competitor-reputation";
import { SectionTitle } from "@/components/placeholder";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompetitorsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">Competitors</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Behold Retreats vs. Soltara Healing Center and Rythmia Life
          Advancement Center
        </p>
      </div>

      <section>
        <SectionTitle
          title="Google reputation"
          subtitle="Star rating and review count on Google — a rough read on brand trust"
        />
        <Suspense
          fallback={
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          }
        >
          <CompetitorReputation />
        </Suspense>
      </section>

      <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
        Search interest and SEO share-of-voice would need Google Trends or a
        paid SEO tool. We tried Google Trends first since it&apos;s free, but
        Google blocks its unofficial API hard from cloud/datacenter IPs
        (including Vercel&apos;s), so it was down more than it worked — not
        reliable enough for a weekly review. Pricing, retreat offerings, and
        social following aren&apos;t available through any free API either; a
        real SEO competitor tool (keyword rankings, backlink gap, estimated
        organic traffic) would need a paid Ahrefs or similar subscription,
        which isn&apos;t connected here.
      </div>
    </div>
  );
}
