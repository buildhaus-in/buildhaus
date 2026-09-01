// @vitest-environment node
//
// Regression coverage for the Phase 0 finding: NEXT_PUBLIC_SUPABASE_URL set
// but NEXT_PUBLIC_SUPABASE_ANON_KEY missing (or vice versa) used to pass
// `undefined` straight through to the Supabase SDK via a `!` non-null
// assertion, failing deep inside supabase-js with a generic error instead
// of naming which variable was missing. requireSupabaseEnv()/
// requireServiceRoleKey() are what packages/database/src/supabase/{server,
// client,middleware,admin}.ts now call instead.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requireServiceRoleKey, requireSupabaseEnv } from "./env";

const ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("requireSupabaseEnv", () => {
  it("returns both values when present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    expect(requireSupabaseEnv()).toEqual({ url: "https://example.supabase.co", anonKey: "anon-key" });
  });

  it("throws naming NEXT_PUBLIC_SUPABASE_ANON_KEY when only the URL is set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(() => requireSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("throws naming NEXT_PUBLIC_SUPABASE_URL when only the anon key is set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    expect(() => requireSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws naming both when neither is set", () => {
    expect(() => requireSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL.*NEXT_PUBLIC_SUPABASE_ANON_KEY/s);
  });
});

describe("requireServiceRoleKey", () => {
  it("returns the key when present", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    expect(requireServiceRoleKey()).toBe("service-key");
  });

  it("throws naming SUPABASE_SERVICE_ROLE_KEY when absent", () => {
    expect(() => requireServiceRoleKey()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
