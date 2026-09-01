import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Badge, SubmitButton } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import { markRead, markAllRead } from "./actions";

export default async function NotificationsPage() {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id,title,body,link,read,created_at")
    .eq("profile_id", ctx?.userId ?? "")
    .order("created_at", { ascending: false });

  const list = notifications ?? [];
  const unreadCount = list.filter((n: any) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ivory">Notifications</h1>
          <p className="text-sm text-muted">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllRead}>
            <SubmitButton variant="outline">Mark all read</SubmitButton>
          </form>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState title="No notifications yet" hint="Approvals, submissions and payment alerts will show up here." />
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-border">
            {list.map((n: any) => (
              <div key={n.id} className={`flex items-start justify-between gap-3 px-5 py-3 ${!n.read ? "bg-brand/5" : ""}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                    <span className="text-sm font-semibold text-sandlight">{n.title}</span>
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                    <span>{dateLabel(n.created_at)}</span>
                    {n.link && <Link href={n.link} className="text-brand hover:underline">Open →</Link>}
                  </div>
                </div>
                {!n.read && (
                  <form action={markRead}>
                    <input type="hidden" name="id" value={n.id} />
                    <SubmitButton variant="ghost" className="shrink-0 text-xs">Mark read</SubmitButton>
                  </form>
                )}
                {n.read && <Badge tone="muted">read</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
