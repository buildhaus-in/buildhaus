// The public website and the private portal are separate Next.js apps on
// separate ports/domains (see README) — a "Login" link here is always a
// cross-app navigation, never an internal route.
export const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3001";
export const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3000";
