import { PageHero } from "@/components/site/ui";
import GalleryAlbums from "@/components/site/gallery/albums";
import { site } from "@/content/site";

export const metadata = {
  title: "Gallery",
  description: site.gallery.hero.sub,
};

export default function GalleryPage() {
  const { hero } = site.gallery;
  return (
    <>
      <PageHero
        eyebrow={hero.eyebrow}
        titleLead={hero.titleLead}
        titleEm={hero.titleEm}
        sub={hero.sub}
      />
      <GalleryAlbums />
    </>
  );
}
