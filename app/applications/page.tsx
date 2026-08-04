import { MetricCard } from "@/components/metric-card";
import { Placeholder, SectionTitle } from "@/components/placeholder";
import { Badge } from "@/components/ui/badge";

export default function ApplicationsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-3xl tracking-tight">Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every Typeform submission, enriched with GHL pipeline stage and channel attribution
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Typeform + GHL not yet connected
        </Badge>
      </div>

      <section>
        <SectionTitle title="This week" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <MetricCard label="New applications" value="—" hint="Typeform" />
          <MetricCard label="Qualified" value="—" hint="GHL" />
          <MetricCard label="Deposits taken" value="—" hint="GHL" />
          <MetricCard label="Bookings" value="—" hint="GHL" />
        </div>
      </section>

      <section>
        <SectionTitle
          title="'How did you hear about us?'"
          subtitle="Normalized answers from the Typeform field, this week"
        />
        <Placeholder label="Answer breakdown (bar chart)" height={260} />
      </section>

      <section>
        <SectionTitle
          title="Application list"
          subtitle="Each row: name, applied date, 'how did you hear', UTM, current GHL stage, channel attribution confidence"
        />
        <Placeholder label="Application table" height={400} />
      </section>
    </div>
  );
}
