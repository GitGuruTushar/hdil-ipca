import HomeHero from "@/components/site/home/hero";
import {
  StatsBand,
  Intro,
  IndustriesMarquee,
  NewsTeaser,
  GalleryTeaser,
  HelplineStrip,
} from "@/components/site/home/sections";
import { site } from "@/content/site";

export const metadata = {
  title: "HDIL-IPCA — HDIL Industrial Park, Virar (East)",
  description: site.home.hero.sub,
};

export default function Home() {
  return (
    <>
      <HomeHero />
      <StatsBand />
      <Intro />
      <IndustriesMarquee />
      <NewsTeaser />
      <GalleryTeaser />
      <HelplineStrip />
    </>
  );
}
