// Demo Mode auto-activates whenever no real Supabase project is configured,
// so the app is fully clickable with zero setup (spec §19). Once real
// NEXT_PUBLIC_SUPABASE_URL / ANON_KEY are set, every `createClient()` call
// switches to the real Supabase client with zero code changes elsewhere.
export function isDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("YOUR-PROJECT");
}
