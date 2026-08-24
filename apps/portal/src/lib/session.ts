import { createClient } from "@buildhaus/database";
import { cache } from "react";

export interface UserContext {
  userId: string;
  email: string | null;
  profile: {
    id: string;
    full_name: string;
    organisation_id: string;
    avatar_url: string | null;
  } | null;
  roles: string[];
  permissions: string[];
}

// Resolves the full identity of the signed-in user: profile, roles, and the
// flat set of permission keys. Cached per request.
export const getUserContext = cache(
  async (): Promise<UserContext | null> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, organisation_id, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("roles(key)")
      .eq("profile_id", user.id);

    const roles =
      (roleRows ?? [])
        .map((r: any) => r.roles?.key)
        .filter(Boolean) as string[];

    const { data: permRows } = await supabase
      .from("user_roles")
      .select("roles(role_permissions(permissions(key)))")
      .eq("profile_id", user.id);

    const permissions = new Set<string>();
    for (const r of permRows ?? []) {
      const rp = (r as any).roles?.role_permissions ?? [];
      for (const x of rp) {
        const key = x?.permissions?.key;
        if (key) permissions.add(key);
      }
    }

    return {
      userId: user.id,
      email: user.email ?? null,
      profile: profile ?? null,
      roles,
      permissions: Array.from(permissions),
    };
  }
);

export function can(ctx: UserContext | null, perm: string): boolean {
  if (!ctx) return false;
  if (ctx.roles.includes("owner")) return true;
  return ctx.permissions.includes(perm);
}
