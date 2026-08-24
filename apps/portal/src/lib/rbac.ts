// Central RBAC vocabulary shared by client + server. The database is the
// source of truth (RLS); these constants keep the UI in sync and give each
// role a home route. Adding a future role means adding a row in the DB and,
// at most, a case here — no schema change.

export type RoleKey =
  | "owner"
  | "site_engineer"
  | "architect"
  | "client";

export const ROLE_HOME: Record<RoleKey, string> = {
  owner: "/owner",
  site_engineer: "/engineer",
  architect: "/architect",
  client: "/client",
};

export const ROLE_LABEL: Record<RoleKey, string> = {
  owner: "Owner",
  site_engineer: "Site Engineer",
  architect: "Architect",
  client: "Client",
};

// Which top-level route prefixes each role may enter. Enforced in middleware
// AND re-checked in the (app) layout. Owner may enter everything.
export const ROLE_ALLOWED_PREFIXES: Record<RoleKey, string[]> = {
  owner: ["/owner", "/engineer", "/architect", "/client"],
  site_engineer: ["/engineer"],
  architect: ["/architect"],
  client: ["/client"],
};

export function homeFor(roles: string[]): string {
  const order: RoleKey[] = ["owner", "site_engineer", "architect", "client"];
  const primary = order.find((r) => roles.includes(r));
  return primary ? ROLE_HOME[primary] : "/login";
}
