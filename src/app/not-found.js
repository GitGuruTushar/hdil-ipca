"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Loader2 } from "lucide-react";
import EmptyState from "@/components/app/empty-state";
import { idFromIdSlug } from "@/utils/slugify";

// Covers both real failure modes for a /directory/<idSlug> path that didn't
// match a pre-rendered static route: a brand-new listing not yet in a build,
// or a renamed listing (names are editable) whose old slug no longer matches
// the current one. Either way, falling back to /directory?id=<id> — the
// mechanism that already works today — beats a dead 404.
export default function NotFound() {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const match = window.location.pathname.match(/\/directory\/([0-9a-f]{24})/i);
    if (!match) return;
    setRedirecting(true);
    router.replace(`/directory?id=${idFromIdSlug(match[1])}`);
  }, [router]);

  if (redirecting) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-5 pt-32 pb-24 text-sm text-body md:pt-40">
        <Loader2 className="h-5 w-5 animate-spin text-madder" />
        Taking you to that listing…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pt-28 pb-24 md:pt-36">
      <div className="glass glass-shadow rounded-[1.75rem]">
        <EmptyState
          icon={Compass}
          title="This page doesn't exist"
          description="The link may be outdated or mistyped. Try heading back home."
          action={
            <a
              href="/"
              className="h-9 rounded-full bg-gradient-to-r from-madder to-grape px-4 text-[13px] font-bold text-white inline-flex items-center"
            >
              Back to home
            </a>
          }
        />
      </div>
    </div>
  );
}
