// Public surface of @buildhaus/database. Both apps/website and apps/portal
// import exclusively through here — never reach into demo/* or supabase/*
// directly, so the Demo Mode ↔ real Supabase swap stays a one-file decision.
export { createClient } from "./supabase/server";
export { createAdminClient } from "./supabase/admin";
export { createClient as createBrowserClient } from "./supabase/client";
export { updateSession } from "./supabase/middleware";

export { isDemoMode } from "./demo/mode";
export { getDemoDB, resetDemoDB, genId, nowIso } from "./demo/db";
export type { Row } from "./demo/db";
export { IDS } from "./demo/ids";
// STANDARD_STAGES lives in @buildhaus/utils (a pure constant, not database
// access) specifically so client components can import it without pulling in
// this package's server-only demo store — import it from there directly.
export { RELATIONS } from "./demo/relations";
export type { Relation } from "./demo/relations";
export { DEMO_USERS, findByEmail, findById, registerDemoUser } from "./demo/users";
export type { DemoUser } from "./demo/users";

export { uploadFile, resolveUploadPath, getSignedDownloadUrl } from "./storage";
export type { UploadInput, UploadResult } from "./storage";
