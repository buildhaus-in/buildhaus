import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/session";
import { homeFor } from "@/lib/rbac";

// Portal root. The middleware's regex matcher doesn't fire for the bare "/"
// path (path-to-regexp parameters must consume at least one character), so
// this page — not middleware — owns the root redirect: signed-in users go to
// their role home, everyone else to /login.
export default async function PortalRoot() {
  const ctx = await getUserContext();
  redirect(ctx ? homeFor(ctx.roles) : "/login");
}
