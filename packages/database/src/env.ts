import "server-only";

// Fails loudly and specifically the moment a real (non-Demo-Mode) Supabase
// client is actually constructed, instead of letting
// `process.env.NEXT_PUBLIC_SUPABASE_URL!` pass `undefined` straight through
// to the Supabase SDK — which then fails deep inside supabase-js with a
// generic, hard-to-diagnose error instead of naming which variable is
// missing. isDemoMode() (./demo/mode.ts) already decides "is this meant to
// be Demo Mode at all" by checking NEXT_PUBLIC_SUPABASE_URL alone; this
// covers the gap that check doesn't: URL set to a real value but
// NEXT_PUBLIC_SUPABASE_ANON_KEY missing, which today silently proceeds into
// the "real Supabase" branch with an undefined key.
export function requireSupabaseEnv(): { url: string; anonKey: string } {
  const missing: string[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Set both to run against a real Supabase project (see apps/portal/.env.example / " +
        "apps/website/.env.example), or leave both unset to run in Demo Mode."
    );
  }
  return { url: url as string, anonKey: anonKey as string };
}

export function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY " +
        "(needed for admin operations — e.g. Owner > Users > Create user, or the public " +
        "website's service-role writes in apps/website/src/app/*/actions.ts)."
    );
  }
  return key;
}
