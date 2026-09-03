// @vitest-environment node
//
// Security / access-boundary tests, run as real HTTP requests against the
// already-running portal dev server (localhost:3001) — this exercises the
// actual middleware (apps/portal/src/middleware.ts), the (app) layout
// guard, each page's own ownership checks, AND real Postgres RLS, rather
// than re-implementing any of that logic against a mock. Every "session" in
// this file is a REAL Supabase Auth session for a REAL, freshly-created
// throwaway test user — see the fixture in beforeAll()/afterAll() below.
//
// Previously this file authenticated via the `bh_demo_session` cookie
// (a bare profile id — Demo Mode's auth shortcut, see
// packages/database/src/demo/client.ts) and ran against Demo Mode's mock
// data layer, which has no RLS. Once this session wired the dev server to a
// real Supabase project, that cookie stopped meaning anything — every
// request here silently redirected to /login and got its 200 instead of the
// expected 404/403, so this whole suite was blind to real regressions
// without ever failing loudly. Rewritten to sign in for real and build its
// own fixture data against the real project instead.
//
// This file is what caught the most severe bug found in the whole repair
// pass this suite is regression coverage for: middleware.ts was sitting at
// apps/portal/middleware.ts instead of apps/portal/src/middleware.ts (this
// project uses a `src` directory, which Next.js requires middleware.ts to
// live alongside) — so it was NEVER running, with no build error or
// warning. That file is what injects the x-pathname header
// apps/portal/src/app/(app)/layout.tsx's ROLE_ALLOWED_PREFIXES check
// depends on, so cross-role blocking was completely inert: a Site
// Engineer's session could load /owner directly. The "cross-role prefix
// blocking" and "middleware-only redirects" describe blocks below exist
// specifically to catch this class of regression again.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import ws from "ws";

// Same pattern as scripts/seed-users.mjs / scripts/link-real-users.mjs:
// load the repo-root .env.local (git-ignored, already required for `npm
// run seed`) so this suite talks to the real project without needing a
// separate vitest env-loading setup.
try {
  readFileSync(".env.local", "utf8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    });
} catch {
  // .env.local not present — the env checks below produce a clear error.
}

const PORTAL = "http://localhost:3001";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// The one organisation every real fixture in this repo (seed data, other
// scripts) has used all along — see scripts/_setup_ui_test.mjs et al.
const ORG = "00000000-0000-0000-0000-0000000000b1";

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  throw new Error(
    "access-boundaries.test.ts needs real Supabase credentials in .env.local " +
      "(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) — " +
      "this suite exercises real RLS end-to-end and has no Demo Mode equivalent."
  );
}

const admin = createAdminClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws as any },
});

async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(`${PORTAL}/login`, { redirect: "manual" });
    return res.status < 500;
  } catch {
    return false;
  }
}

function randomPassword(): string {
  return "Zz1!" + crypto.randomBytes(18).toString("base64url");
}

// Signs in for real against Supabase Auth and returns the exact Cookie
// header the browser would send afterward — built by the real
// @supabase/ssr code path (the same one packages/database/src/supabase/
// server.ts uses), not hand-reconstructed, so the cookie name/chunking/
// encoding is guaranteed to match what the app's own createClient() reads.
async function cookieHeaderFor(email: string, password: string): Promise<string> {
  const jar: Record<string, string> = {};
  const supabase = createServerClient(SUPABASE_URL!, ANON_KEY!, {
    // Node 18 (this repo's dev Node version) has no native WebSocket —
    // supabase-js's realtime client needs one explicitly or the whole
    // client constructor throws, even though nothing here uses realtime.
    realtime: { transport: ws as any },
    cookies: {
      getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })),
      setAll: (cookiesToSet: { name: string; value: string }[]) => {
        for (const { name, value } of cookiesToSet) {
          if (value) jar[name] = value;
          else delete jar[name];
        }
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return Object.entries(jar)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function roleId(key: string): Promise<string> {
  const { data, error } = await admin.from("roles").select("id").eq("organisation_id", ORG).eq("key", key).maybeSingle();
  if (error || !data) throw new Error(`roleId(${key}): ${error?.message ?? "not found"}`);
  return data.id;
}

type FixtureUser = { id: string; email: string; password: string; cookie: string };

async function makeUser(roleKey: string, label: string, suffix: string): Promise<FixtureUser> {
  const email = `zzz-access-test-${label}-${suffix}@buildhaus.example`;
  const password = randomPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `ZZZ Access Test ${label}` },
  });
  if (error) throw new Error(`create ${label}: ${error.message}`);
  const id = data.user.id;
  await admin.from("profiles").upsert({ id, organisation_id: ORG, full_name: `ZZZ Access Test ${label}` });
  const rid = await roleId(roleKey);
  await admin.from("user_roles").insert({ profile_id: id, role_id: rid });
  const cookie = await cookieHeaderFor(email, password);
  return { id, email, password, cookie };
}

// --- Fixture state, populated in beforeAll, torn down in afterAll -------

const SUFFIX = crypto.randomBytes(4).toString("hex");
let owner: FixtureUser, engineer: FixtureUser, architect: FixtureUser, client: FixtureUser, client2: FixtureUser;
let villaId: string, duplexId: string, commercialId: string;
let villaCode: string, commercialCode: string, duplexName: string;
let clientRowId: string, client2RowId: string;
let memberIds: string[] = [];
let docVisibleTitle: string, docHiddenTitle: string;
let receiptOwnId: string, receiptOtherId: string;
let documentIds: string[] = [];
let receiptIds: string[] = [];

async function makeProject(nameFragment: string, clientId: string | null) {
  const code = `ZZ-${SUFFIX}-${nameFragment.slice(0, 3).toUpperCase()}`;
  const { data, error } = await admin
    .from("projects")
    .insert({
      organisation_id: ORG,
      code,
      name: `ZZZ Access Test ${nameFragment} (${SUFFIX})`,
      project_type: "villa",
      site_address: "Test address, generated by access-boundaries.test.ts",
      status: "pre_construction",
      client_id: clientId,
    })
    .select("id,code,name")
    .single();
  if (error) throw new Error(`create project ${nameFragment}: ${error.message}`);
  return data as { id: string; code: string; name: string };
}

beforeAll(async () => {
  const up = await isServerUp();
  if (!up) {
    throw new Error(
      `apps/portal dev server isn't reachable at ${PORTAL}. These access-boundary tests exercise the ` +
        `real middleware/layout/page guards over HTTP and need the dev server running (npm run dev:portal).`
    );
  }

  [owner, engineer, architect, client, client2] = await Promise.all([
    makeUser("owner", "owner", SUFFIX),
    makeUser("site_engineer", "eng", SUFFIX),
    makeUser("architect", "arch", SUFFIX),
    makeUser("client", "client", SUFFIX),
    makeUser("client", "client2", SUFFIX),
  ]);

  const [clientRow, client2Row] = await Promise.all([
    admin
      .from("clients")
      .insert({ organisation_id: ORG, profile_id: client.id, full_name: "ZZZ Access Test Client", mobile: "+91 90000 00001" })
      .select("id")
      .single(),
    admin
      .from("clients")
      .insert({ organisation_id: ORG, profile_id: client2.id, full_name: "ZZZ Access Test Client 2", mobile: "+91 90000 00002" })
      .select("id")
      .single(),
  ]);
  if (clientRow.error) throw new Error(`create clients row: ${clientRow.error.message}`);
  if (client2Row.error) throw new Error(`create client2 row: ${client2Row.error.message}`);
  clientRowId = clientRow.data.id;
  client2RowId = client2Row.data.id;

  const [villa, duplex, commercial] = await Promise.all([
    makeProject("Villa", clientRowId),
    makeProject("Duplex", client2RowId),
    makeProject("Commercial", null),
  ]);
  villaId = villa.id;
  duplexId = duplex.id;
  commercialId = commercial.id;
  villaCode = villa.code;
  commercialCode = commercial.code;
  duplexName = duplex.name;

  // engineer: villa + duplex, NOT commercial. architect: villa +
  // commercial, NOT duplex. Mirrors the access pattern the original
  // Demo Mode seed data used, so the assertions below stay meaningful.
  const memberInserts = await admin
    .from("project_members")
    .insert([
      { project_id: villaId, profile_id: engineer.id, role_key: "site_engineer" },
      { project_id: duplexId, profile_id: engineer.id, role_key: "site_engineer" },
      { project_id: villaId, profile_id: architect.id, role_key: "architect" },
      { project_id: commercialId, profile_id: architect.id, role_key: "architect" },
    ])
    .select("id");
  if (memberInserts.error) throw new Error(`create project_members: ${memberInserts.error.message}`);
  memberIds = memberInserts.data.map((r: any) => r.id);

  docVisibleTitle = `ZZZ Construction agreement (${SUFFIX})`;
  docHiddenTitle = `ZZZ Internal cost estimate workbook (${SUFFIX})`;
  const docInserts = await admin
    .from("documents")
    .insert([
      {
        organisation_id: ORG,
        project_id: villaId,
        title: docVisibleTitle,
        file_url: `/uploads/documents/${villaId}/test-${SUFFIX}-visible.pdf`,
        client_visible: true,
      },
      {
        organisation_id: ORG,
        project_id: villaId,
        title: docHiddenTitle,
        file_url: `/uploads/documents/${villaId}/test-${SUFFIX}-hidden.pdf`,
        client_visible: false,
      },
    ])
    .select("id");
  if (docInserts.error) throw new Error(`create documents: ${docInserts.error.message}`);
  documentIds = docInserts.data.map((r: any) => r.id);

  // rcpt-own belongs to the client's own project (villa); rcpt-other
  // belongs to project-duplex, owned by a DIFFERENT client (client2) —
  // exactly the cross-client guess this describe block exists to block.
  const receiptInserts = await admin
    .from("client_receipts")
    .insert([
      { project_id: villaId, amount: 100000, mode: "bank", receipt_no: `ZZ-${SUFFIX}-OWN` },
      { project_id: duplexId, amount: 50000, mode: "bank", receipt_no: `ZZ-${SUFFIX}-OTHER` },
    ])
    .select("id");
  if (receiptInserts.error) throw new Error(`create client_receipts: ${receiptInserts.error.message}`);
  receiptIds = receiptInserts.data.map((r: any) => r.id);
  receiptOwnId = receiptIds[0];
  receiptOtherId = receiptIds[1];
}, 30_000);

afterAll(async () => {
  // Best-effort, individually caught — a failure partway through must not
  // stop the rest of cleanup from running (see the identical pattern in
  // this session's scripts/_teardown_ui_test.mjs).
  // PromiseLike, not Promise — Supabase's PostgrestFilterBuilder is thenable
  // (satisfies `await`) but its type doesn't declare .catch/.finally/
  // Symbol.toStringTag, so it structurally fails a `Promise<unknown>` check.
  const step = async (label: string, fn: () => PromiseLike<unknown>) => {
    try {
      await fn();
    } catch (e: any) {
      console.error(`access-boundaries cleanup — ${label} failed: ${e.message}`);
    }
  };

  if (receiptIds.length) await step("delete client_receipts", () => admin.from("client_receipts").delete().in("id", receiptIds));
  if (documentIds.length) await step("delete documents", () => admin.from("documents").delete().in("id", documentIds));
  if (memberIds.length) await step("delete project_members", () => admin.from("project_members").delete().in("id", memberIds));
  const projectIds = [villaId, duplexId, commercialId].filter(Boolean);
  if (projectIds.length) await step("delete projects", () => admin.from("projects").delete().in("id", projectIds));
  const clientRowIds = [clientRowId, client2RowId].filter(Boolean);
  if (clientRowIds.length) await step("delete clients rows", () => admin.from("clients").delete().in("id", clientRowIds));

  for (const u of [owner, engineer, architect, client, client2]) {
    if (!u) continue;
    await step(`delete user_roles for ${u.email}`, () => admin.from("user_roles").delete().eq("profile_id", u.id));
    await step(`delete profile for ${u.email}`, () => admin.from("profiles").delete().eq("id", u.id));
    await step(`delete auth user ${u.email}`, () => admin.auth.admin.deleteUser(u.id));
  }
}, 30_000);

// --------------------------------------------------------------------------

describe("anonymous access is redirected to /login", () => {
  it.each(["/owner", "/engineer", "/architect", "/client"])(
    "GET %s with no session cookie redirects to /login",
    async (route) => {
      const res = await fetch(`${PORTAL}${route}`, { redirect: "manual" });
      expect([301, 302, 307, 308]).toContain(res.status);
      expect(res.headers.get("location") ?? "").toContain("/login");
    }
  );
});

describe("middleware-only redirects (apps/portal/src/middleware.ts)", () => {
  // Unlike the "no session cookie" tests above, these two behaviors have NO
  // fallback anywhere else in the app — they only ever happen if
  // middleware.ts is actually running. Direct regression coverage for the
  // "wrong file location, silently never executes" bug documented above.
  it("a signed-in user visiting /login is redirected away, not shown the login form", async () => {
    const res = await fetch(`${PORTAL}/login`, { headers: { Cookie: owner.cookie }, redirect: "manual" });
    expect([301, 302, 307, 308]).toContain(res.status);
    expect(res.headers.get("location") ?? "").not.toContain("/login");
  });

  it("GET / redirects to /login when signed out, and away from /login when signed in", async () => {
    const signedOut = await fetch(`${PORTAL}/`, { redirect: "manual" });
    expect([301, 302, 307, 308]).toContain(signedOut.status);
    expect(signedOut.headers.get("location") ?? "").toContain("/login");

    const signedIn = await fetch(`${PORTAL}/`, { headers: { Cookie: owner.cookie }, redirect: "manual" });
    expect([301, 302, 307, 308]).toContain(signedIn.status);
    expect(signedIn.headers.get("location") ?? "").not.toContain("/login");
  });
});

describe("cross-role prefix blocking ((app) layout's ROLE_ALLOWED_PREFIXES)", () => {
  // Each blocked request must redirect to the caller's OWN home, not /login
  // (they're signed in — this isn't an auth failure) and not just pass
  // through. Repair-plan Phase 1 test items #2, #3, #11.
  // 20s, not vitest's 5s default: each iteration is a real request that
  // does a real Postgres round-trip (getUserContext() -> user_roles) over
  // the network to resolve who's asking before it can decide where to
  // redirect them — Demo Mode's in-memory mock never needed this because
  // it never left the process. 4 sequential real requests at ~1.5-2s each
  // routinely runs past 5s.
  it(
    "engineer requesting /owner routes is redirected to /engineer, not served",
    async () => {
      for (const route of ["/owner", "/owner/users", "/owner/finance", "/owner/settings"]) {
        const res = await fetch(`${PORTAL}${route}`, { headers: { Cookie: engineer.cookie }, redirect: "manual" });
        expect([301, 302, 307, 308]).toContain(res.status);
        expect(res.headers.get("location") ?? "").toContain("/engineer");
      }
    },
    20_000
  );

  it(
    "architect requesting /owner or /engineer routes is redirected to /architect, not served",
    async () => {
      for (const route of ["/owner", "/owner/users", "/owner/finance", "/engineer/report"]) {
        const res = await fetch(`${PORTAL}${route}`, { headers: { Cookie: architect.cookie }, redirect: "manual" });
        expect([301, 302, 307, 308]).toContain(res.status);
        expect(res.headers.get("location") ?? "").toContain("/architect");
      }
    },
    20_000
  );

  it(
    "client requesting any staff route is redirected to /client, not served",
    async () => {
      for (const route of ["/owner/users", "/owner/finance", "/engineer/report", "/architect/drawings/new"]) {
        const res = await fetch(`${PORTAL}${route}`, { headers: { Cookie: client.cookie }, redirect: "manual" });
        expect([301, 302, 307, 308]).toContain(res.status);
        expect(res.headers.get("location") ?? "").toContain("/client");
      }
    },
    20_000
  );

  it(
    "the Owner is NOT blocked from any role's section (owner sees all)",
    async () => {
      for (const route of ["/owner", "/engineer", "/architect", "/client"]) {
        const res = await fetch(`${PORTAL}${route}`, { headers: { Cookie: owner.cookie }, redirect: "manual" });
        expect(res.status).toBe(200);
      }
    },
    20_000
  );
});

describe("client document/photo visibility (client_visible flag)", () => {
  // Regression coverage for the repair-plan's "client visibility is opt-in"
  // requirement (Phase 1 test #10) — client/documents/page.tsx filters on
  // `.eq("client_visible", true)`; docHidden is deliberately client_visible:
  // false on the client's own project, so this proves the filter is
  // actually applied, not just present in a query that never runs.
  it("does not list a document marked client_visible: false, even on the client's own project", async () => {
    const res = await fetch(`${PORTAL}/client/documents`, { headers: { Cookie: client.cookie } });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(docVisibleTitle);
    expect(html).not.toContain(docHiddenTitle);
  });
});

describe("engineer project scoping (project_members)", () => {
  it("can open a project they ARE assigned to as site_engineer", async () => {
    const res = await fetch(`${PORTAL}/engineer/projects/${villaId}`, { headers: { Cookie: engineer.cookie } });
    expect(res.status).toBe(200);
  });

  it("gets a 404 for a project they are NOT assigned to", async () => {
    const res = await fetch(`${PORTAL}/engineer/projects/${commercialId}`, { headers: { Cookie: engineer.cookie } });
    expect(res.status).toBe(404);
  });
});

describe("architect project scoping (project_members)", () => {
  it("'My Projects' lists only projects the architect is assigned to", async () => {
    const res = await fetch(`${PORTAL}/architect/projects`, { headers: { Cookie: architect.cookie } });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(villaCode); // villa — assigned
    expect(html).toContain(commercialCode); // commercial — assigned
    expect(html).not.toContain(duplexName); // duplex — NOT assigned
  });
});

describe("/uploads/[...path] — project-scoped file serving", () => {
  // Regression coverage for the Phase 0 finding: this route previously had
  // no authorization at all (any request, signed in or not, that knew or
  // guessed a path got the file back). It requires a session and checks
  // canViewProject() against the path's project-id segment before ever
  // looking the file up (real Supabase Storage, since this session's file-
  // upload fix) — proven here with a path that doesn't exist and confirming
  // the *reason* for the non-200 differs by caller (401/403 before the
  // existence check, vs 404 after it).
  it("unauthenticated request is rejected before the file-existence check", async () => {
    const res = await fetch(`${PORTAL}/uploads/documents/${villaId}/does-not-exist.pdf`, { redirect: "manual" });
    expect(res.status).toBe(401);
  });

  it("a project member for a DIFFERENT project is rejected, not served/404'd", async () => {
    // engineer is assigned to villa and duplex, but not commercial — reading
    // from a project they're not on must fail closed at the auth check, not
    // fall through to "file not found."
    const res = await fetch(`${PORTAL}/uploads/documents/${commercialId}/does-not-exist.pdf`, {
      headers: { Cookie: engineer.cookie },
      redirect: "manual",
    });
    expect(res.status).toBe(403);
  });

  it("a member of the project clears the auth check (fails on file existence instead)", async () => {
    // engineer IS assigned to villa — this must get past canViewProject()
    // and only 404 because the file itself doesn't exist in Storage,
    // proving the authorization check isn't what's blocking it.
    const res = await fetch(`${PORTAL}/uploads/documents/${villaId}/does-not-exist.pdf`, {
      headers: { Cookie: engineer.cookie },
      redirect: "manual",
    });
    expect(res.status).toBe(404);
  });

  it("the Owner clears the auth check for any project", async () => {
    const res = await fetch(`${PORTAL}/uploads/documents/${commercialId}/does-not-exist.pdf`, {
      headers: { Cookie: owner.cookie },
      redirect: "manual",
    });
    expect(res.status).toBe(404);
  });
});

describe("client scoping (clients.profile_id -> projects.client_id)", () => {
  it("can open a receipt that belongs to their own project", async () => {
    const res = await fetch(`${PORTAL}/client/payments/receipts/${receiptOwnId}`, { headers: { Cookie: client.cookie } });
    expect(res.status).toBe(200);
  });

  it("cannot fetch another client's receipt by guessing its id — 404s instead of leaking data", async () => {
    // receiptOther belongs to project-duplex (client2), not client's project.
    const res = await fetch(`${PORTAL}/client/payments/receipts/${receiptOtherId}`, { headers: { Cookie: client.cookie } });
    expect(res.status).toBe(404);
  });

  it("cannot fetch a receipt id that doesn't exist at all", async () => {
    const res = await fetch(`${PORTAL}/client/payments/receipts/${crypto.randomUUID()}`, { headers: { Cookie: client.cookie } });
    expect(res.status).toBe(404);
  });
});
