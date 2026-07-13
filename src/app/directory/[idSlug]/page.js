import { BusinessDetailView } from "@/components/site/business-detail-view";
import { buildIdSlug } from "@/utils/slugify";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

// Enumerates the static shell only (id-slug values) — the page itself still
// fetches full content client-side, same as the rest of this public site.
// Wrapped in try/catch: a failed build-time fetch (e.g. Render's free tier
// cold-starting mid-build) should mean "no real pre-rendered detail pages
// this deploy," not a failed GitHub Pages deploy — the ?id= fallback and
// not-found.js redirect cover any listing missing from this list. Next.js's
// `output: 'export'` treats an EMPTY generateStaticParams() result as
// equivalent to a MISSING one and hard-fails the whole build (confirmed by
// a real CI failure, not just inferred) — so the failure path must return at
// least one harmless placeholder param, never [].
const PLACEHOLDER_PARAMS = [{ idSlug: "000000000000000000000000-placeholder" }];

export async function generateStaticParams() {
  const idSlugs = [];
  let page = 1;
  let totalPages = 1;

  try {
    do {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(`${API_BASE}/industries?page=${page}&limit=200`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Industries fetch failed with status ${res.status}`);

      const data = await res.json();
      totalPages = data.totalPages || 1;
      (data.industries || []).forEach((industry) => {
        idSlugs.push({ idSlug: buildIdSlug(industry._id, industry.name?.en) });
      });
      page += 1;
    } while (page <= totalPages);
  } catch (err) {
    console.warn("[directory/[idSlug]] generateStaticParams failed — building with a placeholder param only:", err.message);
    return PLACEHOLDER_PARAMS;
  }

  return idSlugs.length ? idSlugs : PLACEHOLDER_PARAMS;
}

export default async function BusinessDetailPage({ params }) {
  const { idSlug } = await params;
  return <BusinessDetailView idSlug={idSlug} />;
}
