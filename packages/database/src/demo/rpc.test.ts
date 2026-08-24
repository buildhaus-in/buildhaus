// @vitest-environment node
//
// demoRpc always goes through getDemoDB(), which reads/writes the shared,
// file-backed store (see db.ts's storeFile()). To keep this test from ever
// touching the real `.demo-data/store.json` two live dev servers are reading
// (or, worse, its default fallback path when DEMO_DATA_DIR is unset), every
// test here points DEMO_DATA_DIR at a fresh, throwaway temp directory before
// running and restores the previous env var afterwards.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { STANDARD_STAGES } from "@buildhaus/utils";
import { demoRpc } from "./rpc";
import { getDemoDB } from "./db";

let tmpDir: string;
let prevDemoDataDir: string | undefined;

beforeEach(() => {
  prevDemoDataDir = process.env.DEMO_DATA_DIR;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bh-demo-rpc-test-"));
  process.env.DEMO_DATA_DIR = tmpDir;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (prevDemoDataDir === undefined) delete process.env.DEMO_DATA_DIR;
  else process.env.DEMO_DATA_DIR = prevDemoDataDir;
});

describe("demoRpc('next_code')", () => {
  it("generates sequential codes within the same scope", async () => {
    const first = await demoRpc("next_code", { p_scope: "project", p_prefix: "BH" });
    const second = await demoRpc("next_code", { p_scope: "project", p_prefix: "BH" });
    const third = await demoRpc("next_code", { p_scope: "project", p_prefix: "BH" });

    expect(first.error).toBeNull();
    expect(first.data).toMatch(/^BH-\d{4}-0001$/);
    expect(second.data).toMatch(/^BH-\d{4}-0002$/);
    expect(third.data).toMatch(/^BH-\d{4}-0003$/);
  });

  it("keeps separate sequences per scope", async () => {
    const projectCode = await demoRpc("next_code", { p_scope: "project", p_prefix: "BH" });
    const quotationCode = await demoRpc("next_code", { p_scope: "quotation", p_prefix: "BH-Q" });
    expect(projectCode.data).toMatch(/^BH-\d{4}-0001$/);
    expect(quotationCode.data).toMatch(/^BH-Q-\d{4}-0001$/);
  });
});

describe("demoRpc('convert_lead_to_project')", () => {
  it("creates a client + project with STANDARD_STAGES.length stages, and marks the lead won", async () => {
    const db = getDemoDB();
    const lead = db.insert("leads", {
      organisation_id: "org-1",
      customer_name: "Test Lead",
      mobile: "+91 9000000000",
      email: "test.lead@example.com",
      site_location: "Test Site, Nellore",
      building_type: "villa",
      builtup_area_sqft: 2000,
      floors: 2,
      estimated_value: 5000000,
      stage: "quoted",
    });

    const { data, error } = await demoRpc("convert_lead_to_project", { p_lead_id: lead.id });
    expect(error).toBeNull();
    expect(data.project_id).toBeTruthy();
    expect(data.client_id).toBeTruthy();

    // Re-read fresh from disk, same as a subsequent request from either app
    // process would — proves the mutation was actually persisted, not just
    // held in the in-memory instance that made the call.
    const db2 = getDemoDB();

    const stages = db2.table("project_stages").filter((s: any) => s.project_id === data.project_id);
    expect(stages).toHaveLength(STANDARD_STAGES.length);
    expect(stages.map((s: any) => s.name).sort()).toEqual([...STANDARD_STAGES].sort());

    const project = db2.table("projects").find((p: any) => p.id === data.project_id);
    expect(project).toBeTruthy();
    expect(project?.client_id).toBe(data.client_id);
    expect(project?.status).toBe("pre_construction");

    const client = db2.table("clients").find((c: any) => c.id === data.client_id);
    expect(client?.full_name).toBe("Test Lead");
    expect(client?.mobile).toBe("+91 9000000000");

    const updatedLead = db2.table("leads").find((l: any) => l.id === lead.id);
    expect(updatedLead?.stage).toBe("won");
    expect(updatedLead?.converted_project_id).toBe(data.project_id);
  });

  it("returns an error for an unknown lead id, without creating anything", async () => {
    const before = getDemoDB().table("projects").length;

    const { data, error } = await demoRpc("convert_lead_to_project", { p_lead_id: "does-not-exist" });
    expect(data).toBeNull();
    expect(error).toBeTruthy();

    // Seed data already ships with projects (see seed.ts) — assert the
    // failed conversion didn't add a new one, rather than assuming zero.
    const after = getDemoDB().table("projects").length;
    expect(after).toBe(before);
  });
});

describe("demoRpc — unknown function name", () => {
  it("returns a descriptive error instead of throwing", async () => {
    const { data, error } = await demoRpc("not_a_real_function", {});
    expect(data).toBeNull();
    expect(error?.message).toContain("not_a_real_function");
  });
});
