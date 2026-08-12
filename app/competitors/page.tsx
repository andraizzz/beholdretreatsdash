import { Suspense } from "react";
import { AiSearchVisibility } from "@/components/ai-search-visibility";
import { CompetitorContentPulse } from "@/components/competitor-content-pulse";
import { CompetitorReputation } from "@/components/competitor-reputation";
import { SectionTitle } from "@/components/placeholder";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompetitorsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">Competitors</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Behold Retreats vs. Soltara, Rythmia, New Life Rising, Posada
          Natura, and Florestral — where we appear in AI search, what
          competitors are publishing, and how our reputation compares
        </p>
      </div>

      <section>
        <SectionTitle
          title="AI Search visibility"
          subtitle="How ChatGPT, Claude, and Perplexity answer high-intent retreat prompts — where does Behold appear, and who's mentioned alongside? Refreshed weekly."
        />
        <Suspense fallback={<Skeleton className="h-96" />}>
          <AiSearchVisibility />
        </Suspense>
      </section>

      <section>
        <SectionTitle
          title="Competitor content pulse"
          subtitle="Publishing cadence + recent topics from each competitor's blog. Silence is itself a signal — most of the competitive set has stopped publishing."
        />
        <Suspense fallback={<Skeleton className="h-48" />}>
          <CompetitorContentPulse />
        </Suspense>
      </section>

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
        Pricing, retreat offerings, and social following aren&apos;t available
        through any free API. Automated SEO share-of-voice (keyword rankings,
        backlink gap, estimated organic traffic) would need a paid Ahrefs or
        similar subscription, which isn&apos;t connected here. Google Trends
        was tried and dropped — Google hard-blocks its unofficial API from
        cloud/datacenter IPs including Vercel&apos;s.
      </div>
    </div>
  );
}
