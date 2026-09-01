import { Skeleton } from "@buildhaus/ui";

// Scoped to this leaf route only — deliberately NOT placed on the four
// role-home pages (owner/engineer/architect/client's own page.tsx) or on
// any folder with a notFound()-calling nested dynamic route ([id]/[slug]),
// since a loading.tsx cascades as a Suspense boundary to every nested
// child segment too. Wrapping one of those would silently change
// notFound()'s HTTP status from a real 404 to a 200 with a client-side-only
// redirect (a Next.js App Router streaming quirk) — see the git history for
// apps/portal/src/app/(app)/loading.tsx, which hit exactly this and was
// reverted. This file's folder has no such descendant, so it's safe.
export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-48" />
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
