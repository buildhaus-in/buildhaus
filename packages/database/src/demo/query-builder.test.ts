// @vitest-environment node
//
// DemoQueryBuilder is exercised here against a DemoDB constructed directly
// in-memory (not via getDemoDB()'s file-backed singleton) — see db.ts's
// `DemoDB` export. These fixtures never call an insert/upsert/update/delete
// operation, so DemoDB.save() (which persists to the shared, file-backed
// store two live dev servers are reading) is never invoked; this file is
// pure-select and cannot touch `.demo-data/store.json`.
import { describe, it, expect } from "vitest";
import { DemoDB } from "./db";
import { DemoQueryBuilder } from "./query-builder";

function makeDb() {
  return new DemoDB({
    widgets: [
      { id: "w1", name: "Alpha", status: "open", score: 3 },
      { id: "w2", name: "Beta", status: "open", score: 1 },
      { id: "w3", name: "Gamma", status: "closed", score: 2 },
      { id: "w4", name: "Delta", status: "closed", score: 5 },
    ],
  });
}

describe("DemoQueryBuilder — filters", () => {
  it(".eq() matches only exact equality", async () => {
    const { data } = await new DemoQueryBuilder(makeDb(), "widgets").select("*").eq("status", "open");
    expect(data.map((r: any) => r.id).sort()).toEqual(["w1", "w2"]);
  });

  it(".in() matches any value present in the given array", async () => {
    const { data } = await new DemoQueryBuilder(makeDb(), "widgets").select("*").in("id", ["w1", "w3"]);
    expect(data.map((r: any) => r.id).sort()).toEqual(["w1", "w3"]);
  });

  it(".not(col, 'in', [...]) excludes the given values", async () => {
    const { data } = await new DemoQueryBuilder(makeDb(), "widgets").select("*").not("status", "in", ["closed"]);
    expect(data.map((r: any) => r.id).sort()).toEqual(["w1", "w2"]);
  });

  it(".not(col, 'eq', v) excludes a single value", async () => {
    const { data } = await new DemoQueryBuilder(makeDb(), "widgets").select("*").not("id", "eq", "w1");
    expect(data.map((r: any) => r.id).sort()).toEqual(["w2", "w3", "w4"]);
  });

  it(".order() sorts ascending by default and descending on request", async () => {
    const asc = await new DemoQueryBuilder(makeDb(), "widgets").select("*").order("score", { ascending: true });
    expect(asc.data.map((r: any) => r.id)).toEqual(["w2", "w3", "w1", "w4"]);

    const desc = await new DemoQueryBuilder(makeDb(), "widgets").select("*").order("score", { ascending: false });
    expect(desc.data.map((r: any) => r.id)).toEqual(["w4", "w1", "w3", "w2"]);
  });

  it(".limit() caps the number of rows returned, after ordering", async () => {
    const { data } = await new DemoQueryBuilder(makeDb(), "widgets")
      .select("*")
      .order("score", { ascending: true })
      .limit(2);
    expect(data.map((r: any) => r.id)).toEqual(["w2", "w3"]);
  });

  it(".maybeSingle() returns the one matching row, or null with no error when nothing matches", async () => {
    const found = await new DemoQueryBuilder(makeDb(), "widgets").select("*").eq("id", "w1").maybeSingle();
    expect(found.data?.id).toBe("w1");
    expect(found.error).toBeNull();

    const missing = await new DemoQueryBuilder(makeDb(), "widgets").select("*").eq("id", "does-not-exist").maybeSingle();
    expect(missing.data).toBeNull();
    expect(missing.error).toBeNull();
  });

  it("filters can be chained and are combined with AND semantics", async () => {
    const { data } = await new DemoQueryBuilder(makeDb(), "widgets")
      .select("*")
      .eq("status", "open")
      .in("id", ["w1", "w2", "w3"]);
    expect(data.map((r: any) => r.id).sort()).toEqual(["w1", "w2"]);
  });
});
