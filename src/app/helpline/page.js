import PageHeroCms from "@/components/site/page-hero-cms";
import HelplineSections from "@/components/site/helpline/sections";

export const metadata = {
  title: "Emergency Helpline",
  description: "Every critical number for the park. Tap to call.",
};

const FALLBACK = {
  eyebrow: "Emergency contacts · Helpline",
  titleLead: "Help,",
  titleEm: "one tap away.",
  sub: "Every critical number for the park. Tap to call.",
};

export default function HelplinePage() {
  return (
    <>
      <PageHeroCms page="helpline" fallback={FALLBACK} />
      <HelplineSections />
    </>
  );
}
