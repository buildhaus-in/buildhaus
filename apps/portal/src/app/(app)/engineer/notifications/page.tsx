import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Badge, SubmitButton } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { dateLabel } from "@buildhaus/utils";
import { clsx } from "clsx";
import { markNotificationRead, markAllNotificationsRead } from "./actions";

export default async function EngineerNotifications() {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id,title,body,read,link,created_at")
    .eq("profile_id", ctx?.userId ?? "")
    .order("created_at", { ascending: false });

  const unreadCount = (notifications ?? []).filter((n: any) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ivory">Notifications</h1>
          <p className="text-sm text-muted">{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}</p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <SubmitButton variant="outline">Mark all as read</SubmitButton>
          </form>
        )}
      </div>

      {(!notifications || notifications.length === 0) ? (
        <EmptyState title="No notifications" hint="Task assignments, returned reports and approvals will show up here." />
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <Card key={n.id} className={clsx(!n.read && "border-brand/40 bg-brand/5")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link href={n.link || "#"} className="flex-1">
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                    <span className="text-sm font-semibold text-sandlight">{n.title}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted">{n.body}</div>
                  <div className="mt-1 text-xs text-muted">{dateLabel(n.created_at)}</div>
                </Link>
                {!n.read && (
                  <form action={markNotificationRead}>
                    <input type="hidden" name="notification_id" value={n.id} />
                    <SubmitButton variant="ghost" className="!px-2 !py-1 text-xs">Mark read</SubmitButton>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
