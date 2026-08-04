import { ChannelPage } from "@/components/channel-page";

export default function DirectPage() {
  return (
    <ChannelPage
      channel="Direct"
      description="Direct traffic + word-of-mouth applications (people typing the URL, remembering the brand, or referred by friends)"
      primarySourceLabel="GA4"
      metrics={[
        { label: "Direct sessions", hint: "GA4" },
        { label: "Applications", hint: "Attributed" },
        { label: "Word-of-mouth apps", hint: "'friend/referral' in Typeform" },
        { label: "Bookings", hint: "Attributed · GHL" },
      ]}
      detailTableLabel="Landing pages for direct traffic"
    />
  );
}
