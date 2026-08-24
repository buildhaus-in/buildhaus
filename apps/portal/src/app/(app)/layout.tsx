import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getUserContext } from "@/lib/session";
import { ROLE_ALLOWED_PREFIXES, ROLE_LABEL, homeFor, type RoleKey } from "@/lib/rbac";
import { TopBar, SideNav, MobileScrollNav, EngineerBottomNav } from "@/components/nav";
import { navGroupsFor, ENGINEER_PRIMARY } from "@/lib/nav-config";
import { isDemoMode } from "@buildhaus/database";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");
  if (!ctx.profile) redirect("/login?e=no_profile");

  const roles = ctx.roles as RoleKey[];
  const home = homeFor(roles);

  // Current section from the path header set in middleware.
  const pathname = headers().get("x-pathname") || home;

  // Enforce: the user must hold a role whose allowed prefixes cover this section.
  const allowed = new Set<string>();
  roles.forEach((r) => (ROLE_ALLOWED_PREFIXES[r] ?? []).forEach((p) => allowed.add(p)));
  const sectionPrefix =
    ["/owner", "/engineer", "/architect", "/client"].find((p) => pathname.startsWith(p)) ?? home;
  const permitted = [...allowed].some((p) => sectionPrefix.startsWith(p));
  if (!permitted) redirect(home);

  const groups = navGroupsFor(sectionPrefix);
  const roleLabel = ROLE_LABEL[(roles[0] as RoleKey) ?? "client"] ?? "User";
  const isEngineer = sectionPrefix.startsWith("/engineer");

  return (
    <div className="min-h-screen bg-bg print:bg-white">
      {isDemoMode() && (
        <div className="border-b border-warn/30 bg-warn/10 px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-warn print:hidden">
          Demo Mode — sample data, changes are saved for this session only
        </div>
      )}
      <div className="print:hidden">
        <TopBar roleLabel={roleLabel} userName={ctx.profile.full_name} />
      </div>
      {/* Mobile nav: bottom bar for engineers, scroll bar for everyone else */}
      {!isEngineer && <div className="print:hidden"><MobileScrollNav groups={groups} /></div>}
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 print:block print:max-w-none print:p-0">
        <div className="print:hidden"><SideNav groups={groups} /></div>
        <main className="min-w-0 flex-1 pb-24 print:pb-0">{children}</main>
      </div>
      {isEngineer && <div className="print:hidden"><EngineerBottomNav primary={ENGINEER_PRIMARY} /></div>}
    </div>
  );
}
