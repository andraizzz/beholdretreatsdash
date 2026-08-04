import { MetricCard } from "@/components/metric-card";
import { Placeholder, SectionTitle } from "@/components/placeholder";
import { Badge } from "@/components/ui/badge";

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Week of — · comparing to previous 7 days
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Data sources not yet connected
        </Badge>
      </div>

      <section>
        <SectionTitle title="This week" subtitle="Top-of-funnel and conversion at a glance" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <MetricCard label="Website sessions" value="—" hint="GA4" />
          <MetricCard label="Applications" value="—" hint="Typeform" />
          <MetricCard label="Qualified leads" value="—" hint="GHL" />
          <MetricCard label="Deposits taken" value="—" hint="GHL" />
          <MetricCard label="Bookings" value="—" hint="GHL" />
        </div>
      </section>

      <section>
        <SectionTitle
          title="Funnel by channel"
          subtitle="Sessions → applications → qualified → deposits → bookings, broken down by attributed channel"
        />
        <Placeholder label="Channel funnel table" height={320} />
      </section>

      <section>
        <SectionTitle
          title="Weekly trend"
          subtitle="Last 12 weeks — spot which channels are trending up or fading"
        />
        <Placeholder label="Trend chart (sessions + applications by channel)" height={280} />
      </section>
    </div>
  );
}
