import { Suspense } from "react";
import { ChannelDetail } from "@/components/channel-detail";
import { DateRangeSelect } from "@/components/date-range-select";
import { Skeleton } from "@/components/ui/skeleton";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type Props = {
  channel: string;
  description: string;
  /** GA4 default channel group names that make up this page. */
  channels: string[];
  searchParams: SearchParams;
};

export function ChannelPage({
  channel,
  description,
  channels,
  searchParams,
}: Props) {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-3xl tracking-tight">{channel}</h1>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <Suspense fallback={<div className="w-[160px] h-9" />}>
          <DateRangeSelect />
        </Suspense>
      </div>

      <Suspense fallback={<ChannelSkeleton />}>
        <ChannelSection
          channels={channels}
          sourceLabel={channel}
          searchParams={searchParams}
        />
      </Suspense>
    </div>
  );
}

async function ChannelSection({
  channels,
  sourceLabel,
  searchParams,
}: {
  channels: string[];
  sourceLabel: string;
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const daysParam = Array.isArray(params.days) ? params.days[0] : params.days;
  const days = Number(daysParam) || 7;
  return (
    <ChannelDetail channels={channels} sourceLabel={sourceLabel} days={days} />
  );
}

function ChannelSkeleton() {
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
