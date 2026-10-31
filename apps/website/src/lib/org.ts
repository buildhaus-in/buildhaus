import "server-only";
import { IDS, isDemoMode } from "@buildhaus/database";

// The organisation every public-website lead and quotation belongs to.
// Website visitors aren't signed in, so unlike the portal there is no
// profile to read it from. IDS.org ("org-1") is the Demo Mode id only — a
// real Postgres project rejects it (organisation_id and next_code's p_org are
// uuid), which is why no website form had ever saved a lead in production.
// The real id is the fixed one supabase/seed.sql creates the Buildhaus
// organisation with; BUILDHAUS_ORG_ID overrides it if that ever changes.
const SEEDED_ORG_ID = "00000000-0000-0000-0000-0000000000b1";

export function websiteOrgId(): string {
  if (isDemoMode()) return IDS.org;
  return process.env.BUILDHAUS_ORG_ID || SEEDED_ORG_ID;
}
