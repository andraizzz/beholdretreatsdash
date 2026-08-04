import { ChannelPage } from "@/components/channel-page";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function DirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <ChannelPage
      channel="Direct"
      description="People who typed the URL or arrived from an untracked link — word of mouth, offline mentions, and messaging apps"
      channels={["Direct"]}
      searchParams={searchParams}
    />
  );
}
