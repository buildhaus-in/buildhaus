import "server-only";
import { cookies } from "next/headers";
import { getDemoDB, genId } from "./db";
import { DemoQueryBuilder } from "./query-builder";
import { demoRpc } from "./rpc";
import { findByEmail, findById, registerDemoUser } from "./users";

const COOKIE = "bh_demo_session";

async function getUser() {
  const id = cookies().get(COOKIE)?.value;
  const u = id ? findById(id) : undefined;
  if (!u) return { data: { user: null }, error: null };
  return { data: { user: { id: u.id, email: u.email } }, error: null };
}

async function signInWithPassword({ email, password }: { email: string; password: string }) {
  const u = findByEmail(email);
  if (!u || u.password !== password) {
    return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
  }
  cookies().set(COOKIE, u.id, { httpOnly: true, path: "/", sameSite: "lax" });
  return { data: { user: { id: u.id, email: u.email }, session: { access_token: "demo" } }, error: null };
}

async function signOut() {
  cookies().set(COOKIE, "", { path: "/", maxAge: 0 });
  return { error: null };
}

async function createUser({ email, password, user_metadata }: { email: string; password: string; email_confirm?: boolean; user_metadata?: Record<string, any> }) {
  if (findByEmail(email)) return { data: { user: null }, error: { message: "A user with this email already exists" } };
  const id = genId("user");
  registerDemoUser({ id, email, password, full_name: user_metadata?.full_name ?? email.split("@")[0] });
  return { data: { user: { id, email } }, error: null };
}

// Demo Mode replacement for both the regular (anon) and admin Supabase
// clients. Same `.from()/.rpc()/.auth` surface as supabase-js, backed by the
// in-memory DemoDB, so every existing Server Component / Server Action works
// unmodified. Swap back to real Supabase by setting NEXT_PUBLIC_SUPABASE_URL.
export function createDemoClient(opts: { admin?: boolean } = {}) {
  const db = getDemoDB();
  return {
    from(table: string) {
      return new DemoQueryBuilder(db, table);
    },
    rpc(name: string, params?: Record<string, any>) {
      return demoRpc(name, params);
    },
    auth: {
      getUser,
      signInWithPassword,
      signOut,
      ...(opts.admin ? { admin: { createUser } } : {}),
    },
  };
}
