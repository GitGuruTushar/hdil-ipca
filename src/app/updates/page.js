import PageHeroCms from "@/components/site/page-hero-cms";
import NewsExplorer from "@/components/site/updates/news-explorer";

export const metadata = {
  title: "News & Updates",
  description: "Circulars, works and wins — straight from the office.",
};

const FALLBACK = {
  eyebrow: "News · Bulletins · Work updates",
  titleLead: "The park,",
  titleEm: "in print.",
  sub: "Circulars, works and wins — straight from the office.",
};

export default function UpdatesPage() {
  return (
    <>
      <PageHeroCms page="updates" fallback={FALLBACK} />
      <NewsExplorer />
    </>
  );
}
