import Link from "next/link";
import { ENGINEER_MORE } from "@/lib/nav-config";
import { Card } from "@buildhaus/ui";

export default function More() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-ivory">More</h1>
      <Card className="p-2">
        <div className="divide-y divide-border">
          {ENGINEER_MORE.map((it) => (
            <Link key={it.href} href={it.href}
              className="flex items-center justify-between px-3 py-3.5 text-sm text-sandlight hover:bg-surface">
              <span>{it.label}</span>
              <span className="text-muted">→</span>
            </Link>
          ))}
          <form action="/auth/signout" method="post">
            <button className="flex w-full items-center justify-between px-3 py-3.5 text-left text-sm text-danger hover:bg-surface">
              <span>Sign out</span><span className="text-muted">→</span>
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
