import { ChannelPage } from "@/components/channel-page";

export default function SocialPage() {
  return (
    <ChannelPage
      channel="Social"
      description="Instagram + Meta organic — reach, engagement, and how many applications trace back to social"
      primarySourceLabel="Meta Graph API"
      metrics={[
        { label: "IG reach", hint: "Meta" },
        { label: "Follower growth", hint: "Meta" },
        { label: "Applications", hint: "Attributed" },
        { label: "Bookings", hint: "Attributed · GHL" },
      ]}
      detailTableLabel="Top posts this week"
    />
  );
}
