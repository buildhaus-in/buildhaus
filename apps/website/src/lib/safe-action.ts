// Wraps a public form's server action so an unexpected server error (a
// missing environment variable, a dropped database connection) comes back as
// a message the visitor can act on, instead of a thrown error that crashes
// the page into Next's "Application error: a client-side exception has
// occurred" screen. The real error is logged for the Vercel function logs.

const FALLBACK =
  "We couldn't send this right now. Please try again in a minute, or call / WhatsApp us on +91 73825 73826.";

export async function safeAction<T>(name: string, run: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await run();
  } catch (e) {
    console.error(`[${name}] failed:`, e);
    return { error: FALLBACK };
  }
}
