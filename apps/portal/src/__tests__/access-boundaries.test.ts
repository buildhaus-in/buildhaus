// @vitest-environment node
//
// Security / access-boundary tests, run as real HTTP requests against the
// already-running portal dev server (localhost:3001) — this exercises the
// actual middleware (apps/portal/middleware.ts), the (app) layout guard,
// and each page's own ownership checks, rather than re-implementing that
// logic against the demo data layer directly. Demo Mode's "session" is just
// the `bh_demo_session` cookie holding a profile id (see
// packages/database/src/demo/client.ts) — no login flow needed to set it.
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
