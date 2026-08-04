import { MetricCard } from "@/components/metric-card";
import { Placeholder, SectionTitle } from "@/components/placeholder";
import { Badge } from "@/components/ui/badge";

type Props = {
  channel: string;
  description: string;
  primarySourceLabel: string;
  metrics: { label: string; hint?: string }[];
  detailTableLabel: string;
};

export function ChannelPage({
  channel,
  description,
  primarySourceLabel,
  metrics,
  detailTableLabel,
}: Props) {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-3xl tracking-tight">{channel}</h1>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {primarySourceLabel} not yet connected
        </Badge>
      </div>

      <section>
        <SectionTitle title="This week" subtitle="Headline metrics with week-over-week delta" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {metrics.map((m) => (
            <MetricCard key={m.label} label={m.label} value="—" hint={m.hint} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="12-week trend" />
        <Placeholder label="Trend chart" height={240} />
      </section>

      <section>
        <SectionTitle title={detailTableLabel} />
        <Placeholder label={detailTableLabel} height={260} />
      </section>

      <section>
        <SectionTitle
          title="Attributed applications"
          subtitle="Applications where this channel was cited in 'how did you hear' or matched a UTM"
        />
        <Placeholder label="Attributed applications list" height={220} />
      </section>
    </div>
  );
}
