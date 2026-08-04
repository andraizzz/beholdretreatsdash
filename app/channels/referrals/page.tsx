import { ChannelPage } from "@/components/channel-page";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function ReferralsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <ChannelPage
      channel="Referrals"
      description="Traffic from other sites — PR pickups, backlinks, and partner mentions"
      channels={["Referral"]}
      searchParams={searchParams}
    />
  );
}
