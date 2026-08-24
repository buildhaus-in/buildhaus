import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Button } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { Textarea } from "@buildhaus/ui";
import { clsx } from "clsx";
import { sendMessage } from "./actions";

function timeLabel(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function ClientMessages() {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: clientRow } = await supabase
    .from("clients").select("id").eq("profile_id", ctx?.userId ?? "").maybeSingle();

  const { data: project } = clientRow
    ? await supabase.from("projects").select("id,code,name").eq("client_id", clientRow.id).maybeSingle()
    : { data: null };

  if (!project) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-ivory">Messages</h1>
        <EmptyState
          title="Your project workspace is being set up"
          hint="You'll be able to message your Buildhaus team once your project is active."
        />
      </div>
    );
  }

  const { data: messages } = await supabase
    .from("comments")
    .select("id,body,created_at,created_by,profiles(full_name)")
    .eq("entity_type", "project").eq("entity_id", project.id).eq("client_visible", true)
    .order("created_at", { ascending: true });

  const list = messages ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-brand">{project.code}</div>
        <h1 className="text-xl font-bold text-ivory">Messages</h1>
        <p className="text-sm text-muted">A shared thread with your Buildhaus project team.</p>
      </div>

      <Card>
        {list.length === 0 ? (
          <EmptyState title="No messages yet" hint="Send the first message below to start the conversation." />
        ) : (
          <div className="space-y-4">
            {list.map((m: any) => {
              const mine = m.created_by === ctx?.userId;
              return (
                <div key={m.id} className={clsx("flex", mine ? "justify-end" : "justify-start")}>
                  <div className={clsx("max-w-[80%] rounded-xl2 border px-3 py-2", mine ? "border-brand/30 bg-brand/10" : "border-border bg-surface")}>
                    <div className="mb-1 flex items-center gap-2 text-[11px] text-muted">
                      <span className="font-semibold text-sandlight">{mine ? "You" : m.profiles?.full_name ?? "Buildhaus team"}</span>
                      <span>{timeLabel(m.created_at)}</span>
                    </div>
                    <div className="text-sm text-sand">{m.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <form action={sendMessage} className="space-y-2">
          <Textarea name="body" label="Send a message" placeholder="Type your message…" required />
          <Button type="submit" variant="primary">Send</Button>
        </form>
      </Card>
    </div>
  );
}
