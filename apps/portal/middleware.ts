import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@buildhaus/database";

// The portal has no public marketing routes — it's a private app front to
// back. Only /login (and the framework's own /auth/* handlers) are reachable
// without a session; everything else requires one.
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
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
