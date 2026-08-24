import { IDS } from "./ids";
import { getDemoDB } from "./db";

// Demo Mode login directory — mirrors the four seed accounts documented in
// README.md so the same credentials work whether or not Supabase is wired up.
export interface DemoUser {
  id: string;
  email: string;
  password: string;
  full_name: string;
}

// Seed rows for the auth table (kept separate from `profiles`, same as real
// Supabase Auth vs. the `profiles` table it's linked to).
export const DEMO_USERS: DemoUser[] = [
  { id: IDS.profileOwner, email: "owner@buildhaus.example", password: "Buildhaus#Owner1", full_name: "Samanth" },
  { id: IDS.profileEngineer, email: "engineer@buildhaus.example", password: "Buildhaus#Engineer1", full_name: "Murali Krishna" },
  { id: IDS.profileArchitect, email: "architect@buildhaus.example", password: "Buildhaus#Architect1", full_name: "Priya" },
  { id: IDS.profileClient, email: "client@buildhaus.example", password: "Buildhaus#Client1", full_name: "Sunil Reddy" },
];

// New accounts created via Owner > Users > Create user are persisted in the
// shared DemoDB (table "__auth_users") on top of the fixed seed logins below,
// so they survive both across dev-server restarts and across apps/website +
// apps/portal (two separate processes sharing the same file-backed store).
export function registerDemoUser(user: DemoUser): void {
  getDemoDB().insert("__auth_users", user);
}

export function allDemoUsers(): DemoUser[] {
  const extra = getDemoDB().table("__auth_users") as DemoUser[];
  return [...DEMO_USERS, ...extra];
}

export function findByEmail(email: string): DemoUser | undefined {
  return allDemoUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findById(id: string): DemoUser | undefined {
  return allDemoUsers().find((u) => u.id === id);
}
