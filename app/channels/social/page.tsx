import { ChannelPage } from "@/components/channel-page";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function SocialPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <ChannelPage
      channel="Social"
      description="Traffic arriving from social platforms — Instagram, Facebook, and the rest. Post-level reach and follower growth need the Meta API, which isn't connected yet."
      channels={["Organic Social", "Paid Social"]}
      searchParams={searchParams}
    />
  );
}
