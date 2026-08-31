"use client";
import { useEffect } from "react";
import { Button, Card, ErrorState } from "@buildhaus/ui";

// Route-segment error boundary for everything under (app) — every
// owner/engineer/architect/client page. Next.js requires this to be a
// Client Component and renders it in place of the page whenever a Server
// Component render or a Server Action throws (uncaught) anywhere in this
// segment. Most Server Actions in this codebase are still plain
// `(formData) => Promise<void>` functions with no useFormState channel
// back to the UI (see apps/portal/src/lib/mutation.ts's throwIfError()) —
// this is what actually catches those thrown errors and shows something,
// instead of a rejected write silently vanishing or Next's bare default
// error screen.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-10">
      <Card>
        <h1 className="mb-3 font-bold text-ivory">Something went wrong</h1>
        <ErrorState message={error.message || "An unexpected error occurred."} />
        <div className="mt-4 flex gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>Go home</Button>
        </div>
      </Card>
    </div>
  );
}
