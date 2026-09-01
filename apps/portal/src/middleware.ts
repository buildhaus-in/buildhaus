import { type NextRequest, NextResponse } from "next/server";
// Deep import, not the `@buildhaus/database` barrel: Middleware runs in
// Next's Edge runtime, which can't resolve Node built-ins. updateSession()
// itself has none, but importing it via the barrel (src/index.ts) pulls in
// every other export's module graph too — including storage.ts, which uses
// node:crypto/node:fs for Demo Mode's local file uploads — and the Edge
// bundler fails on that `import` even though nothing here calls it.
import { updateSession } from "@buildhaus/database/src/supabase/middleware";

// The portal has no public marketing routes — it's a private app front to
// back. Only /login (and the framework's own /auth/* handlers) are reachable
// without a session; everything else requires one.
//
// CRITICAL: this file must live at apps/portal/src/middleware.ts, not
// apps/portal/middleware.ts. Next.js requires middleware.ts alongside the
// `src` directory when a project uses one (this one does — see
// apps/portal/src/app/) — a copy sitting at the project root next to a src/
// layout is simply never picked up as middleware at all, with no build
// error or warning. Confirmed via .next/server/middleware-manifest.json
// (`{"middleware": {}}` — completely empty) that this had been silently
// happening: none of the logic below (including the x-pathname header the
// (app) layout's ROLE_ALLOWED_PREFIXES check depends on to block a signed-in
// user from a section their role doesn't cover) was ever executing. It was
// masked because apps/portal/src/app/(app)/layout.tsx has its own
// independent `if (!ctx) redirect("/login")` fallback for the "no session"
// case — but nothing was covering cross-role blocking, which depends
// entirely on this file actually running.
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAppArea =
    pathname.startsWith("/owner") ||
    pathname.startsWith("/engineer") ||
    pathname.startsWith("/architect") ||
    pathname.startsWith("/client");

  if (isAppArea && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/owner"; // (app) layout re-routes to the signed-in user's actual home
    return NextResponse.redirect(url);
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/owner" : "/login";
    return NextResponse.redirect(url);
  }

  // Exposed so the (app) layout can enforce role-prefix access without a
  // second round-trip to resolve the current path.
  //
  // Must be set on the *request* headers, not the response — a plain
  // `response.headers.set(...)` only reaches the outgoing HTTP response
  // sent to the browser, not the request context Next.js uses to render the
  // Server Component tree for this same request, so `headers()` in a Server
  // Component would never see it. NextResponse.next({ request: { headers } })
  // is the documented way to thread a computed value from middleware into
  // headers(): https://nextjs.org/docs/app/building-your-application/routing/middleware#setting-headers.
  // updateSession() may have set refreshed auth cookies on `response` (real
  // Supabase mode); those still need to reach the browser, so they're
  // copied onto the new response before returning it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const finalResponse = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.getAll().forEach((cookie) => finalResponse.cookies.set(cookie));
  return finalResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
