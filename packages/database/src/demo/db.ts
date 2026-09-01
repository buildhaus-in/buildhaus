import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { SEED } from "./seed";

// Mirrors the table list audit_row() is wired to via the trg_audit_<table>
// triggers in supabase/migrations/0011_triggers_functions.sql. Demo Mode has
// no Postgres triggers, so without this mirror these tables get a real
// audit trail on a live Supabase project but silently none at all in the
// only environment this app is actually tested in — see
// docs/SCHEMA-DRIFT-FOLLOWUP.md's sibling note on Demo Mode enforcing no
// schema; this is the same class of invisible parity gap, for triggers
// instead of columns.
const AUDIT_TABLES = new Set([
  "projects", "payments", "expenses", "quotations", "drawings",
  "daily_reports", "client_approvals", "purchases", "suppliers", "inspections",
]);
const SESSION_COOKIE = "bh_demo_session";

// Demo Mode's "database". apps/website and apps/portal are two independent
// Next.js server processes (ports 3000/3001) — an in-memory globalThis store
// (the original single-app implementation) would give each app its own
// disconnected copy of the data, so an enquiry submitted on the website would
// never show up in the portal's CRM. Instead this reads/writes a shared JSON
// file on disk: every call re-reads current state (cheap at demo scale) and
// every mutation writes back immediately, so both processes always see the
// same data. This is a deliberate, honest substitute for real Postgres (see
// README) — not a production persistence strategy.

export type Row = Record<string, any>;

export function genId(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

function storeFile(): string {
  const dir = process.env.DEMO_DATA_DIR
    ? path.resolve(process.env.DEMO_DATA_DIR)
    : path.resolve(process.cwd(), "../../.demo-data");
  return path.join(dir, "store.json");
}

function seedTables(): Record<string, Row[]> {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(SEED)) {
    tables[name] = rows.map((r) => ({ ...r }));
  }
  return tables;
}

function loadTables(): Record<string, Row[]> {
  const file = storeFile();
  if (!fs.existsSync(file)) return seedTables();
  try {
    const raw = fs.readFileSync(file, "utf8");
    if (!raw.trim()) return seedTables();
    return JSON.parse(raw);
  } catch {
    // Corrupt or mid-write file (rare, single-user demo tool) — reseed
    // rather than crash every page in both apps.
    return seedTables();
  }
}

function persist(tables: Record<string, Row[]>): void {
  const file = storeFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Write-then-rename for basic atomicity — avoids the other app's process
  // reading a half-written file if two requests land at the same instant.
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(tables));
  fs.renameSync(tmp, file);
}

export class DemoDB {
  tables: Record<string, Row[]>;

  constructor(tables: Record<string, Row[]>) {
    this.tables = tables;
  }

  table(name: string): Row[] {
    if (!this.tables[name]) this.tables[name] = [];
    return this.tables[name];
  }

  private save(): void {
    persist(this.tables);
  }

  // Mirrors audit_row()'s per-row insert into audit_logs — see AUDIT_TABLES
  // above. Resolves the acting profile from the demo session cookie the
  // same way rpc.ts's log_audit stand-in does (current_org_id()/auth.uid()
  // have no equivalent outside a real Postgres session).
  private recordAudit(table: string, op: "insert" | "update" | "delete", entityId: string | null | undefined): void {
    if (!AUDIT_TABLES.has(table)) return;
    let uid: string | null = null;
    try {
      uid = cookies().get(SESSION_COOKIE)?.value ?? null;
    } catch {
      // cookies() throws outside a request context (e.g. a script that
      // constructs DemoDB directly) — the audit row just gets a null actor.
      uid = null;
    }
    const profile = uid ? this.table("profiles").find((p) => p.id === uid) : undefined;
    this.table("audit_logs").push({
      id: genId("aud"),
      organisation_id: profile?.organisation_id ?? null,
      actor_id: uid,
      action: op,
      entity_type: table,
      entity_id: entityId ?? null,
      summary: `${op.toUpperCase()} on ${table}`,
      diff: null,
      created_at: nowIso(),
    });
    // Not folded into the caller's own save() — this can run after that
    // save already happened (upsert's insert() branch, for example), and a
    // second persist() of the now-audit-log-carrying tables is cheap and
    // correct either way at demo scale.
    this.save();
  }

  insert(name: string, row: Row): Row {
    const final: Row = {
      id: row.id ?? genId(name.slice(0, 4)),
      created_at: row.created_at ?? nowIso(),
      updated_at: nowIso(),
      ...row,
    };
    this.table(name).push(final);
    this.save();
    this.recordAudit(name, "insert", final.id);
    return final;
  }

  upsert(name: string, row: Row): Row {
    const t = this.table(name);
    const idx = row.id ? t.findIndex((r) => r.id === row.id) : -1;
    if (idx >= 0) {
      t[idx] = { ...t[idx], ...row, updated_at: nowIso() };
      this.save();
      this.recordAudit(name, "update", t[idx].id);
      return t[idx];
    }
    return this.insert(name, row);
  }

  updateWhere(name: string, pred: (r: Row) => boolean, patch: Row): Row[] {
    const matched = this.table(name).filter(pred);
    matched.forEach((r) => Object.assign(r, patch, { updated_at: nowIso() }));
    if (matched.length) this.save();
    for (const r of matched) this.recordAudit(name, "update", r.id);
    return matched;
  }

  deleteWhere(name: string, pred: (r: Row) => boolean): Row[] {
    const t = this.table(name);
    const matched = t.filter(pred);
    this.tables[name] = t.filter((r) => !pred(r));
    if (matched.length) this.save();
    for (const r of matched) this.recordAudit(name, "delete", r.id);
    return matched;
  }
}

// Every call reads fresh from disk, so a request handled by the website
// process always sees mutations made a moment ago by the portal process
// (and vice versa) — this replaces the old globalThis-per-process cache.
export function getDemoDB(): DemoDB {
  return new DemoDB(loadTables());
}

export function resetDemoDB(): void {
  persist(seedTables());
}
