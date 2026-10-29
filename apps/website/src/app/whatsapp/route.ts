// buildhaus.in/whatsapp — short link for the Instagram bio and printed
// material. Instagram re-encodes any "%" in a saved link (%20 → %2520), so a
// wa.me link with a pre-filled message can't be pasted there directly; this
// URL has no "%" for it to break. A route handler rather than a next.config
// redirect, because those decode the destination and send raw spaces in the
// Location header, which some in-app browsers reject.

const WHATSAPP_NUMBER = "917382573826";
const MESSAGE = "Hi Buildhaus, I'd like a site visit";

export function GET() {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(MESSAGE)}`;
  // 307, not permanent, so the number or message can change later.
  return new Response(null, { status: 307, headers: { Location: url, "Cache-Control": "no-store" } });
}
