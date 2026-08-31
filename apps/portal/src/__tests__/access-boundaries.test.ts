// @vitest-environment node
//
// Security / access-boundary tests, run as real HTTP requests against the
// already-running portal dev server (localhost:3001) — this exercises the
// actual middleware (apps/portal/src/middleware.ts), the (app) layout
// guard, and each page's own ownership checks, rather than re-implementing
// that logic against the demo data layer directly. Demo Mode's "session" is
// just the `bh_demo_session` cookie holding a profile id (see
// packages/database/src/demo/client.ts) — no login flow needed to set it.
//
// This file is what caught the most severe bug found in this whole repair
// pass: middleware.ts was sitting at apps/portal/middleware.ts instead of
// apps/portal/src/middleware.ts (this project uses a `src` directory, which
// Next.js requires middleware.ts to live alongside) — so it was NEVER
// running, with no build error or warning. That file is what injects the
// x-pathname header apps/portal/src/app/(app)/layout.tsx's
// ROLE_ALLOWED_PREFIXES check depends on, so cross-role blocking was
// completely inert: a Site Engineer's session could load /owner directly.
// The "cross-role prefix blocking" and "middleware-only redirects" describe
// blocks below exist specifically to catch this class of regression again —
// they were the only tests in this file that actually depended on
// middleware.ts running (the "no session cookie" tests below happened to
// keep passing throughout, because apps/portal/src/app/(app)/layout.tsx has
// its own independent `if (!ctx) redirect("/login")` fallback).
//
// Relies on the fixed seed data in packages/database/src/demo/seed.ts:
//   - profile-engineer is a site_engineer on project-villa and
//     project-duplex, but NOT project-commercial.
//   - profile-architect is an architect on project-villa and
//     project-commercial, but NOT project-duplex ("Anitha Residence").
//   - profile-client (client-sunil) owns project-villa only; rcpt-1/rcpt-2
//     belong to project-villa, rcpt-3 belongs to project-duplex (a
//     different client).
import { describe, it, expect, beforeAll } from "vitest";

const PORTAL = "http://localhost:3001";

function cookieFor(profileId: string) {
  return { Cookie: `bh_demo_session=${profileId}` };
}

async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(`${PORTAL}/login`, { redirect: "manual" });
    return res.status < 500;
  } catch {
    return false;
  }
}

beforeAll(async () => {
  const up = await isServerUp();
  if (!up) {
    throw new Error(
      `apps/portal dev server isn't reachable at ${PORTAL}. These access-boundary tests exercise the ` +
        `real middleware/layout/page guards over HTTP and need the dev server running (npm run dev:portal).`
    );
  }
});

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
    const res = await fetch(`${PORTAL}/login`, { headers: cookieFor("profile-owner"), redirect: "manual" });
    expect([301, 302, 307, 308]).toContain(res.status);
    expect(res.headers.get("location") ?? "").not.toContain("/login");
  });

  it("GET / redirects to /login when signed out, and away from /login when signed in", async () => {
    const signedOut = await fetch(`${PORTAL}/`, { redirect: "manual" });
    expect([301, 302, 307, 308]).toContain(signedOut.status);
    expect(signedOut.headers.get("location") ?? "").toContain("/login");

    const signedIn = await fetch(`${PORTAL}/`, { headers: cookieFor("profile-owner"), redirect: "manual" });
    expect([301, 302, 307, 308]).toContain(signedIn.status);
    expect(signedIn.headers.get("location") ?? "").not.toContain("/login");
  });
});

describe("cross-role prefix blocking ((app) layout's ROLE_ALLOWED_PREFIXES)", () => {
  // Each blocked request must redirect to the caller's OWN home, not /login
  // (they're signed in — this isn't an auth failure) and not just pass
  // through. Repair-plan Phase 1 test items #2, #3, #11.
  it.each([
    ["profile-engineer", "/owner", "/engineer"],
    ["profile-engineer", "/owner/users", "/engineer"],
    ["profile-engineer", "/owner/finance", "/engineer"],
    ["profile-engineer", "/owner/settings", "/engineer"],
    ["profile-architect", "/owner", "/architect"],
    ["profile-architect", "/owner/users", "/architect"],
    ["profile-architect", "/owner/finance", "/architect"],
    ["profile-architect", "/engineer/report", "/architect"],
    ["profile-client", "/owner/users", "/client"],
    ["profile-client", "/owner/finance", "/client"],
    ["profile-client", "/engineer/report", "/client"],
    ["profile-client", "/architect/drawings/new", "/client"],
  ])("%s requesting %s is redirected to %s, not served", async (profileId, route, expectedHome) => {
    const res = await fetch(`${PORTAL}${route}`, { headers: cookieFor(profileId), redirect: "manual" });
    expect([301, 302, 307, 308]).toContain(res.status);
    expect(res.headers.get("location") ?? "").toContain(expectedHome);
  });

  it("the Owner is NOT blocked from any role's section (owner sees all)", async () => {
    for (const route of ["/owner", "/engineer", "/architect", "/client"]) {
      const res = await fetch(`${PORTAL}${route}`, { headers: cookieFor("profile-owner"), redirect: "manual" });
      expect(res.status).toBe(200);
    }
  });
});

describe("client document/photo visibility (client_visible flag)", () => {
  // Regression coverage for the repair-plan's "client visibility is opt-in"
  // requirement (Phase 1 test #10) — client/documents/page.tsx filters on
  // `.eq("client_visible", true)`; doc-3 in the seed data
  // (packages/database/src/demo/seed.ts) is deliberately client_visible:
  // false on the client's own project (project-villa), so this proves the
  // filter is actually applied, not just present in a query that never runs.
  it("does not list a document marked client_visible: false, even on the client's own project", async () => {
    const res = await fetch(`${PORTAL}/client/documents`, { headers: cookieFor("profile-client") });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Construction agreement"); // doc-1, client_visible: true
    expect(html).not.toContain("Internal cost estimate workbook"); // doc-3, client_visible: false
  });
});

describe("engineer project scoping (project_members)", () => {
  it("can open a project they ARE assigned to as site_engineer", async () => {
    const res = await fetch(`${PORTAL}/engineer/projects/project-villa`, {
      headers: cookieFor("profile-engineer"),
    });
    expect(res.status).toBe(200);
  });

  it("gets a 404 for a project they are NOT assigned to", async () => {
    const res = await fetch(`${PORTAL}/engineer/projects/project-commercial`, {
      headers: cookieFor("profile-engineer"),
    });
    expect(res.status).toBe(404);
  });
});

describe("architect project scoping (project_members)", () => {
  it("'My Projects' lists only projects the architect is assigned to", async () => {
    const res = await fetch(`${PORTAL}/architect/projects`, { headers: cookieFor("profile-architect") });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("BH-2026-0001"); // project-villa — assigned (pm-2)
    expect(html).toContain("BH-2026-0003"); // project-commercial — assigned (pm-4)
    expect(html).not.toContain("Anitha Residence"); // project-duplex — NOT assigned
    expect(html).not.toContain("BH-2026-0002");
  });
});

describe("/uploads/[...path] — project-scoped file serving", () => {
  // Regression coverage for the Phase 0 finding: this route previously had
  // no authorization at all (any request, signed in or not, that knew or
  // guessed a path got the file back). It now requires a session and checks
  // canViewProject() against the path's project-id segment before even
  // looking at disk — proven here by using a path that doesn't exist on
  // disk and confirming the *reason* for the non-200 differs by caller
  // (401/403 before the file-existence check, vs 404 after it).
  it("unauthenticated request is rejected before the file-existence check", async () => {
    const res = await fetch(`${PORTAL}/uploads/documents/project-villa/does-not-exist.pdf`, {
      redirect: "manual",
    });
    expect(res.status).toBe(401);
  });

  it("a project member for a DIFFERENT project is rejected, not served/404'd", async () => {
    // profile-engineer is assigned to project-villa and project-duplex, but
    // not project-commercial (see file header) — reading from a project
    // they're not on must fail closed at the auth check, not fall through
    // to "file not found."
    const res = await fetch(`${PORTAL}/uploads/documents/project-commercial/does-not-exist.pdf`, {
      headers: cookieFor("profile-engineer"),
      redirect: "manual",
    });
    expect(res.status).toBe(403);
  });

  it("a member of the project clears the auth check (fails on file existence instead)", async () => {
    // profile-engineer IS assigned to project-villa — this must get past
    // canViewProject() and only 404 because the file itself doesn't exist,
    // proving the authorization check isn't what's blocking it.
    const res = await fetch(`${PORTAL}/uploads/documents/project-villa/does-not-exist.pdf`, {
      headers: cookieFor("profile-engineer"),
      redirect: "manual",
    });
    expect(res.status).toBe(404);
  });

  it("the Owner clears the auth check for any project", async () => {
    const res = await fetch(`${PORTAL}/uploads/documents/project-commercial/does-not-exist.pdf`, {
      headers: cookieFor("profile-owner"),
      redirect: "manual",
    });
    expect(res.status).toBe(404);
  });
});

describe("client scoping (clients.profile_id -> projects.client_id)", () => {
  it("can open a receipt that belongs to their own project", async () => {
    const res = await fetch(`${PORTAL}/client/payments/receipts/rcpt-1`, {
      headers: cookieFor("profile-client"),
    });
    expect(res.status).toBe(200);
  });

  it("cannot fetch another client's receipt by guessing its id — 404s instead of leaking data", async () => {
    // rcpt-3 belongs to project-duplex (client-anitha), not client-sunil's project.
    const res = await fetch(`${PORTAL}/client/payments/receipts/rcpt-3`, {
      headers: cookieFor("profile-client"),
    });
    expect(res.status).toBe(404);
  });

  it("cannot fetch a receipt id that doesn't exist at all", async () => {
    const res = await fetch(`${PORTAL}/client/payments/receipts/rcpt-does-not-exist`, {
      headers: cookieFor("profile-client"),
    });
    expect(res.status).toBe(404);
  });
});
