import { PageHero } from "@/components/site/ui";
import {
  EmergencyNumbers,
  ParkLines,
  Providers,
} from "@/components/site/helpline/sections";
import { site } from "@/content/site";

export const metadata = {
  title: "Emergency Helpline",
  description: site.helpline.hero.sub,
};

export default function HelplinePage() {
  const { hero } = site.helpline;
  return (
    <>
      <PageHero
        eyebrow={hero.eyebrow}
        titleLead={hero.titleLead}
        titleEm={hero.titleEm}
        sub={hero.sub}
      />
      <EmergencyNumbers />
      <ParkLines />
      <Providers />
    </>
  );
}
