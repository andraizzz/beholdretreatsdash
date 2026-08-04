import { ChannelPage } from "@/components/channel-page";

export default function ReferralsPage() {
  return (
    <ChannelPage
      channel="Referrals"
      description="Traffic from other sites — including the Costa Rica News article backlink and any PR pickups"
      primarySourceLabel="GA4 + GSC"
      metrics={[
        { label: "Referral sessions", hint: "GA4" },
        { label: "Top referrer sessions", hint: "GA4" },
        { label: "Applications", hint: "Attributed" },
        { label: "Bookings", hint: "Attributed · GHL" },
      ]}
      detailTableLabel="Top referring sites and pages"
    />
  );
}
