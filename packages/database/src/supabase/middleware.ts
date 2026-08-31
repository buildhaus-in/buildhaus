import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "../demo/mode";
import { requireSupabaseEnv } from "../env";

const DEMO_COOKIE = "bh_demo_session";
type CookieToSet = { name: string; value: string; options: CookieOptions };

// Refreshes the auth session on every request and exposes the user.
export async function updateSession(request: NextRequest) {
  // Demo Mode: no real Supabase project to talk to — just read the same
  // cookie src/lib/demo/client.ts sets on sign-in. Middleware only needs to
  // know *whether* someone is signed in; role/section checks happen in the
  // (app) layout via getUserContext(), which resolves the same cookie.
  if (isDemoMode()) {
    const uid = request.cookies.get(DEMO_COOKIE)?.value;
    return { response: NextResponse.next({ request }), user: uid ? { id: uid } : null };
  }

  let response = NextResponse.next({ request });

  const { url, anonKey } = requireSupabaseEnv();
  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
