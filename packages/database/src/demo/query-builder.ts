// A minimal, chainable stand-in for the supabase-js query builder, covering
// exactly the surface this app uses (eq/neq/gt/gte/lt/lte/in/not/ilike/is,
// order/limit/range, maybeSingle/single, insert/upsert/update/delete, and
// count/head selects) plus embedded-resource selects like "roles(key)" via
// the RELATIONS registry. Backed by the in-memory DemoDB.
import { DemoDB, Row, nowIso } from "./db";
import { RELATIONS } from "./relations";

type Op = "select" | "insert" | "upsert" | "update" | "delete";

function splitTopLevel(str: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === sep && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

interface SelectNode { name: string; cols?: string; embed?: SelectNode[] }

function parseSelect(str: string): SelectNode[] {
  return splitTopLevel(str, ",").map((part) => {
    const m = part.match(/^([\w]+)\((.*)\)$/s);
    if (m) return { name: m[1], embed: parseSelect(m[2]) };
    // "alias:column" not needed anywhere yet; keep plain column names.
    return { name: part };
  });
}

function projectRow(table: string, row: Row, spec: SelectNode[], db: DemoDB): Row {
  const out: Row = {};
  for (const node of spec) {
    if (node.name === "*") {
      Object.assign(out, row);
      continue;
    }
    if (node.embed) {
      const rel = RELATIONS[table]?.[node.name];
      if (!rel) {
        out[node.name] = null;
        continue;
      }
      if (rel.type === "belongsTo") {
        const target = db.table(rel.table).find((r) => r.id === row[rel.localKey!]);
        out[node.name] = target ? projectRow(rel.table, target, node.embed, db) : null;
      } else {
        const targets = db.table(rel.table).filter((r) => r[rel.foreignKey!] === row.id);
        out[node.name] = targets.map((t) => projectRow(rel.table, t, node.embed!, db));
      }
    } else {
      out[node.name] = row[node.name];
    }
  }
  return out;
}

function parseNotInValue(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    return val.replace(/^\(|\)$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [val];
}

export class DemoQueryBuilder implements PromiseLike<{ data: any; error: any; count?: number | null }> {
  private op: Op = "select";
  private payload: Row | Row[] | null = null;
  private filters: Array<(row: Row) => boolean> = [];
  private cols = "*";
  private countMode: "exact" | null = null;
  private headOnly = false;
  private orderSpec: { col: string; asc: boolean } | null = null;
  private limitN: number | null = null;
  private rangeSpec: { from: number; to: number } | null = null;
  private singleMode: "single" | "maybeSingle" | null = null;

  constructor(private db: DemoDB, private tableName: string) {}

  select(cols?: string, opts?: { count?: "exact"; head?: boolean }): this {
    this.cols = cols ?? "*";
    if (opts?.count === "exact") this.countMode = "exact";
    if (opts?.head) this.headOnly = true;
    return this;
  }
  eq(col: string, val: any): this { this.filters.push((r) => r[col] === val); return this; }
  neq(col: string, val: any): this { this.filters.push((r) => r[col] !== val); return this; }
  gt(col: string, val: any): this { this.filters.push((r) => r[col] != null && r[col] > val); return this; }
  gte(col: string, val: any): this { this.filters.push((r) => r[col] != null && r[col] >= val); return this; }
  lt(col: string, val: any): this { this.filters.push((r) => r[col] != null && r[col] < val); return this; }
  lte(col: string, val: any): this { this.filters.push((r) => r[col] != null && r[col] <= val); return this; }
  in(col: string, arr: any[]): this { this.filters.push((r) => arr.includes(r[col])); return this; }
  is(col: string, val: any): this { this.filters.push((r) => (r[col] ?? null) === val); return this; }
  ilike(col: string, pattern: string): this {
    const needle = pattern.replace(/%/g, "").toLowerCase();
    this.filters.push((r) => String(r[col] ?? "").toLowerCase().includes(needle));
    return this;
  }
  like(col: string, pattern: string): this { return this.ilike(col, pattern); }
  not(col: string, op: string, val: any): this {
    if (op === "in") {
      const arr = parseNotInValue(val);
      this.filters.push((r) => !arr.includes(r[col]));
    } else if (op === "eq") {
      this.filters.push((r) => r[col] !== val);
    } else if (op === "is") {
      this.filters.push((r) => (r[col] ?? null) !== val);
    }
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderSpec = { col, asc: opts?.ascending !== false };
    return this;
  }
  limit(n: number): this { this.limitN = n; return this; }
  range(from: number, to: number): this { this.rangeSpec = { from, to }; return this; }
  maybeSingle(): this { this.singleMode = "maybeSingle"; return this; }
  single(): this { this.singleMode = "single"; return this; }

  insert(payload: Row | Row[]): this { this.op = "insert"; this.payload = payload; return this; }
  upsert(payload: Row | Row[]): this { this.op = "upsert"; this.payload = payload; return this; }
  update(payload: Row): this { this.op = "update"; this.payload = payload; return this; }
  delete(): this { this.op = "delete"; return this; }

  private applyFilters(rows: Row[]): Row[] {
    return rows.filter((r) => this.filters.every((f) => f(r)));
  }

  private async execute(): Promise<{ data: any; error: any; count?: number | null }> {
    try {
      if (this.op === "insert") {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
        const inserted = rows.map((r) => this.db.insert(this.tableName, r));
        return { data: this.singleMode ? inserted[0] ?? null : inserted, error: null };
      }
      if (this.op === "upsert") {
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
        const result = rows.map((r) => this.db.upsert(this.tableName, r));
        return { data: this.singleMode ? result[0] ?? null : result, error: null };
      }
      if (this.op === "update") {
        const matched = this.db.updateWhere(this.tableName, (r) => this.filters.every((f) => f(r)), this.payload as Row);
        return { data: this.singleMode ? matched[0] ?? null : matched, error: null };
      }
      if (this.op === "delete") {
        const matched = this.db.deleteWhere(this.tableName, (r) => this.filters.every((f) => f(r)));
        return { data: matched, error: null };
      }

      // select
      let rows = this.applyFilters(this.db.table(this.tableName));
      const count = rows.length;
      if (this.orderSpec) {
        const { col, asc } = this.orderSpec;
        rows = [...rows].sort((a, b) => {
          const av = a[col], bv = b[col];
          if (av == null && bv == null) return 0;
          if (av == null) return asc ? -1 : 1;
          if (bv == null) return asc ? 1 : -1;
          if (av < bv) return asc ? -1 : 1;
          if (av > bv) return asc ? 1 : -1;
          return 0;
        });
      }
      if (this.rangeSpec) rows = rows.slice(this.rangeSpec.from, this.rangeSpec.to + 1);
      if (this.limitN != null) rows = rows.slice(0, this.limitN);

      if (this.headOnly) return { data: null, count, error: null };

      const spec = parseSelect(this.cols);
      const projected = rows.map((r) => projectRow(this.tableName, r, spec, this.db));

      if (this.singleMode === "single") {
        return projected[0]
          ? { data: projected[0], error: null }
          : { data: null, error: { message: "No rows found" } };
      }
      if (this.singleMode === "maybeSingle") {
        return { data: projected[0] ?? null, error: null };
      }
      return { data: projected, count: this.countMode ? count : undefined, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? String(e) } };
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export { nowIso };
