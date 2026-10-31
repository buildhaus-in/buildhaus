// buildhaus.in/whatsapp — short link for the Instagram bio and printed
// material. Instagram re-encodes any "%" in a saved link (%20 → %2520), so a
// wa.me link with a pre-filled message can't be pasted there directly; this
// URL has no "%" for it to break. A route handler rather than a next.config
// redirect, because those decode the destination and send raw spaces in the
// Location header, which some in-app browsers reject.
import { whatsappUrl } from "@/lib/whatsapp";

export function GET() {
  // 307, not permanent, so the number or message can change later.
  return new Response(null, { status: 307, headers: { Location: whatsappUrl(), "Cache-Control": "no-store" } });
}
