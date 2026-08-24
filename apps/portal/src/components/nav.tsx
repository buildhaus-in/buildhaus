"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Logo } from "@buildhaus/ui";
import type { NavGroup, NavItem } from "@/lib/nav-config";

function useActive() {
  const path = usePathname();
  return (href: string) =>
    href === "/owner" || href === "/engineer" || href === "/architect" || href === "/client"
      ? path === href
      : path === href || path.startsWith(href + "/");
}

/* Top bar (all roles) */
export function TopBar({ roleLabel, userName }: { roleLabel: string; userName: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Logo markClassName="h-6 w-6" wordmarkClassName="text-base" />
          <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-wide text-sand">{roleLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted sm:inline">{userName}</span>
          <form action="/auth/signout" method="post">
            <button className="rounded-lg border border-border px-3 py-1.5 text-xs text-sand hover:bg-card">Sign out</button>
          </form>
        </div>
      </div>
    </header>
  );
}

/* Desktop grouped sidebar */
export function SideNav({ groups }: { groups: NavGroup[] }) {
  const isActive = useActive();
  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-4 md:flex">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.heading && (
            <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">{g.heading}</div>
          )}
          <div className="flex flex-col gap-0.5">
            {g.items.map((it) => (
              <Link key={it.href} href={it.href}
                className={clsx("rounded-lg px-3 py-2 text-sm",
                  isActive(it.href) ? "bg-brand text-white font-semibold" : "text-sand hover:bg-card")}>
                {it.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

/* Mobile: horizontal scroll bar for owner/architect/client */
export function MobileScrollNav({ groups }: { groups: NavGroup[] }) {
  const isActive = useActive();
  const items = groups.flatMap((g) => g.items);
  return (
    <nav className="flex gap-1 overflow-x-auto border-t border-border bg-surface px-2 py-1 md:hidden">
      {items.map((it) => (
        <Link key={it.href} href={it.href}
          className={clsx("whitespace-nowrap rounded-lg px-3 py-1.5 text-xs",
            isActive(it.href) ? "bg-brand text-white font-semibold" : "text-muted hover:bg-card")}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

/* Mobile: fixed bottom nav for the Site Engineer (large touch targets) */
export function EngineerBottomNav({ primary }: { primary: NavItem[] }) {
  const isActive = useActive();
  const items = [...primary, { href: "/engineer/more", label: "More" }];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface md:hidden">
      {items.map((it) => (
        <Link key={it.href} href={it.href}
          className={clsx("flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium",
            isActive(it.href) ? "text-brand" : "text-muted")}>
          <span className={clsx("h-1.5 w-1.5 rounded-full", isActive(it.href) ? "bg-brand" : "bg-transparent")} />
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
