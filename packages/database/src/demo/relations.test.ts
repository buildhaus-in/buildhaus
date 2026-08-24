// @vitest-environment node
//
// Embedded-select ("roles(key)"-style) relation resolution, against a
// DemoDB built directly in-memory — see query-builder.test.ts for why this
// is select-only and safe against the shared, file-backed demo store.
import { describe, it, expect } from "vitest";
import { DemoDB } from "./db";
import { DemoQueryBuilder } from "./query-builder";

function makeDb() {
  return new DemoDB({
    profiles: [
      { id: "profile-1", full_name: "Murali Krishna" },
      { id: "profile-2", full_name: "Priya" },
    ],
    projects: [{ id: "proj-1", code: "BH-9001", name: "Test Villa" }],
    project_members: [
      { id: "pm-1", project_id: "proj-1", profile_id: "profile-1", role_key: "site_engineer" },
      { id: "pm-2", project_id: "proj-1", profile_id: "profile-2", role_key: "architect" },
    ],
  });
}

describe("embedded-select relations", () => {
  it("resolves a belongsTo relation (project_members -> profiles)", async () => {
    const { data } = await new DemoQueryBuilder(makeDb(), "project_members")
      .select("id,role_key,profiles(id,full_name)")
      .eq("id", "pm-1");
    expect(data).toEqual([
      { id: "pm-1", role_key: "site_engineer", profiles: { id: "profile-1", full_name: "Murali Krishna" } },
    ]);
  });

  it("belongsTo resolves to null when the foreign key points at nothing", async () => {
    const db = makeDb();
    db.table("project_members").push({ id: "pm-orphan", project_id: "proj-1", profile_id: "no-such-profile", role_key: "architect" });
    const { data } = await new DemoQueryBuilder(db, "project_members").select("id,profiles(id)").eq("id", "pm-orphan");
    expect(data[0].profiles).toBeNull();
  });

  it("resolves a hasMany relation (projects -> project_members), returning an array", async () => {
    const { data } = await new DemoQueryBuilder(makeDb(), "projects")
      .select("id,project_members(id,role_key)")
      .eq("id", "proj-1");
    expect(data[0].project_members).toEqual(
      expect.arrayContaining([
        { id: "pm-1", role_key: "site_engineer" },
        { id: "pm-2", role_key: "architect" },
      ])
    );
    expect(data[0].project_members).toHaveLength(2);
  });

  it("hasMany resolves to an empty array when there are no related rows", async () => {
    const db = makeDb();
    db.table("projects").push({ id: "proj-empty", code: "BH-9002", name: "No members yet" });
    const { data } = await new DemoQueryBuilder(db, "projects").select("id,project_members(id)").eq("id", "proj-empty");
    expect(data[0].project_members).toEqual([]);
  });
});
