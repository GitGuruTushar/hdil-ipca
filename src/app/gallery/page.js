import PageHeroCms from "@/components/site/page-hero-cms";
import GalleryAlbums from "@/components/site/gallery/albums";

export const metadata = {
  title: "Gallery",
  description: "Events, works and everyday life across the park.",
};

const FALLBACK = {
  eyebrow: "Gallery",
  titleLead: "The park,",
  titleEm: "framed.",
  sub: "Events, works and everyday life across the park.",
};

export default function GalleryPage() {
  return (
    <>
      <PageHeroCms page="gallery" fallback={FALLBACK} />
      <GalleryAlbums />
    </>
  );
}
