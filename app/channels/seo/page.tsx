import { ChannelPage } from "@/components/channel-page";

export default function SeoPage() {
  return (
    <ChannelPage
      channel="SEO"
      description="Organic search — what queries are landing people on the site, and which of those turn into applications"
      primarySourceLabel="Search Console"
      metrics={[
        { label: "Impressions", hint: "GSC" },
        { label: "Clicks", hint: "GSC" },
        { label: "Applications", hint: "Attributed" },
        { label: "Bookings", hint: "Attributed · GHL" },
      ]}
      detailTableLabel="Top queries and landing pages"
    />
  );
}
