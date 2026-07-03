import { PageHero } from "@/components/site/ui";
import {
  History,
  MissionVision,
  AboutStats,
  Leadership,
} from "@/components/site/about/sections";
import { site } from "@/content/site";

export const metadata = {
  title: "About Us",
  description: site.about.hero.sub,
};

export default function AboutPage() {
  const { hero } = site.about;
  return (
    <>
      <PageHero
        eyebrow={hero.eyebrow}
        titleLead={hero.titleLead}
        titleEm={hero.titleEm}
        sub={hero.sub}
      />
      <History />
      <AboutStats />
      <div className="pt-16 md:pt-24">
        <MissionVision />
      </div>
      <Leadership />
    </>
  );
}
