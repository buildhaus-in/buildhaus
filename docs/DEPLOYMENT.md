# Buildhaus — Deployment

This is a reference for deploying the two Next.js apps in this monorepo to Vercel, and for wiring up a real Supabase project so Demo Mode is no longer in play. **No deploy command has been run as part of writing this doc** — `apps/website/vercel.json` and `apps/portal/vercel.json` are config only; creating the actual Vercel projects, running `vercel link`/`vercel deploy`, and configuring DNS are manual steps for whoever owns the Vercel account and the `buildhaus.in` domain to perform themselves.

---

## 1. Read this first: Demo Mode is not a real deployment

`packages/database/src/demo/mode.ts` makes `createClient()` transparently return an in-memory/file-backed mock whenever `NEXT_PUBLIC_SUPABASE_URL` is unset (or still the placeholder). That's what lets both apps run fully clickable with zero setup today. **It should never be what's running behind a real public URL.**

The concrete reason: Demo Mode's session cookie (`bh_demo_session`, set in `packages/database/src/demo/client.ts`) is just a plain profile ID with no signature or encryption — e.g. `bh_demo_session=profile-owner`. There is no Row-Level Security under it either (RLS is a Postgres feature; Demo Mode never touches Postgres). Anyone who can set an arbitrary cookie value on the deployed domain — via browser devtools, a malicious extension, or any XSS elsewhere on the same origin — can set that cookie to any known profile ID and become that user, Owner included, with zero credentials. See `docs/SECURITY-CHECKLIST.md` for the full writeup.

**Before deploying either app publicly, wire up a real Supabase project (Section 4).** Once `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` are set to a real project, `createClient()` switches to `@supabase/ssr` automatically — real auth, real cookies, real RLS — with no code changes.

---

## 2. Two apps, two Vercel projects, one repo

| | apps/website | apps/portal |
|---|---|---|
| What | Public marketing site + cost estimator | Private CRM/ERP (Owner/Engineer/Architect/Client login) |
| Local port | 3000 | 3001 |
| Intended domain | `buildhaus.in` | `app.buildhaus.in` |
| Vercel Root Directory | `apps/website` | `apps/portal` |

Both apps live in one GitHub repo (npm workspaces, shared code in `packages/{ui,brand,database,utils,types,validation}` via `@buildhaus/*`). Vercel does **not** deploy a monorepo as a single project by default — you create **two separate Vercel Projects**, both pointing at the same GitHub repo, distinguished only by **Root Directory** in each project's settings. `vercel.json` alone cannot do this; Root Directory is a project-level setting only configurable in the Vercel dashboard (or `vercel link` interactively), not a vercel.json key.

### Steps (repeat once per app)

1. **New Project → Import** the `buildhaus` GitHub repo (do this twice, once per app — Vercel lets you import the same repo into multiple projects).
2. **Project Settings → General → Root Directory**: set to `apps/website` for the first project, `apps/portal` for the second.
3. **Project Settings → General → "Include source files outside of the Root Directory in the Build Step"**: turn this **ON** for both. This is required — without it, Vercel's build sandbox only checks out `apps/website/` (or `apps/portal/`) and can't see the root `package-lock.json`, the `packages/*` workspaces, or `supabase/`, which every build here needs (`transpilePackages` in each `next.config.js` pulls in `@buildhaus/*` source directly, not a built artifact).
4. Framework preset should auto-detect as **Next.js** from `vercel.json`'s `"framework": "nextjs"`. Build/Install commands are already set in each app's `vercel.json` (`cd ../.. && npm run build --workspace=apps/<app>`, run from the Root Directory Vercel checks out) — no need to override them in the dashboard.
5. Add environment variables (Section 3) before the first deploy — a build with Supabase vars unset will fall back to Demo Mode, which builds fine but is the wrong outcome for a production deploy.
6. Assign the custom domain (Section 5) after the first successful deploy.

---

## 3. Environment variables

Set these in **both** Vercel projects' **Project Settings → Environment Variables** (Production, and Preview if you want preview deploys to also hit the real backend — otherwise leave Preview unset and it'll fall back to Demo Mode, which is a reasonable default for PR previews).

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_WEBSITE_URL` | `https://buildhaus.in` | Needed by both apps (cross-links between them) |
| `NEXT_PUBLIC_PORTAL_URL` | `https://app.buildhaus.in` | Needed by both apps |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<your-project>.supabase.co` | Once a real Supabase project exists — see Section 4. Leaving this unset keeps the app in Demo Mode (see Section 1: not recommended for a real deploy) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public key from Supabase project settings | Safe to expose to the browser by design (RLS is what actually protects data, not key secrecy) |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key from Supabase project settings | **apps/portal only** — used by Owner > Users > Create user and `scripts/seed-users.mjs`. Bypasses RLS: server-only, never prefix with `NEXT_PUBLIC_`, never add to apps/website |
| `ANTHROPIC_API_KEY` | your Anthropic API key | **Not read anywhere in the codebase today.** Reserved for a future real integration with the Owner AI Assistant (`/owner/ai`) — as shipped, `owner/ai/actions.ts` is deliberately hardcoded to canned, templated responses regardless of this value, so setting it currently has no effect. Once that's wired up, call it exclusively from server routes/Server Actions per `docs/ARCHITECTURE.md` §D ("the key never reaches the browser") |

`NEXT_PUBLIC_*` values are baked in at build time (standard Next.js behavior), so changing them requires a redeploy, not just an env var update — Vercel handles this automatically when you trigger a redeploy after editing env vars.

---

## 4. Wiring up a real Supabase project

If `docs/ARCHITECTURE.md` gains a dedicated Supabase setup section later, prefer that; this is the short version.

1. Create a project at [supabase.com](https://supabase.com) (or self-hosted Postgres + your own auth if you're not using Supabase's hosted product — the migrations are plain SQL and don't depend on Supabase-specific features beyond `auth.users`).
2. Run every file in `supabase/migrations/` **in filename order** (`0001_...` through the highest-numbered file) against that project — via the Supabase SQL editor, `supabase db push`, or `psql`. They are intentionally append-only and must run in sequence; do not skip or reorder.
3. Run `supabase/seed.sql` for baseline reference data (permissions catalogue, estimator packages, etc.).
4. From the repo root, with `.env.local` populated with the real `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, run:
   ```
   node scripts/seed-users.mjs
   ```
   This creates the demo logins, links `profiles` + `user_roles`, and seeds the sample "Sunil Reddy villa" project data into the real schema (see the script's own header comment).
5. Only after steps 2–4 succeed should you set `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel and redeploy — that's the switch that takes both apps out of Demo Mode.
6. Before treating this as a real production backend for real customer data, read `docs/SECURITY-CHECKLIST.md` in full, and in particular add RLS coverage/anon grants for the public quotation flow (`quotations`, `quotation_versions`, `leads`, `material_catalogue`) — as of this writing, `supabase/migrations/0014_quotation_public_tokens.sql` intentionally does not extend those tables' existing owner-only policies, so `apps/website/src/app/quotation/[token]/*` and `apps/website/src/app/cost-estimator/actions.ts` will not work end-to-end against a real Supabase project until that's addressed.

---

## 5. DNS

Point both domains at Vercel (exact records depend on your registrar; these are Vercel's standard patterns as of writing — confirm current values in each Vercel project's **Settings → Domains** screen, which shows the exact records to add once you type in the domain):

- **`buildhaus.in`** (apex/root domain, apps/website): Vercel generally wants an `A` record to `76.76.21.21`, or (if your registrar supports it) `ALIAS`/`ANAME` to `cname.vercel-dns.com`. Add this in the **apps/website** Vercel project.
- **`app.buildhaus.in`** (subdomain, apps/portal): `CNAME` record to `cname.vercel-dns.com`. Add this in the **apps/portal** Vercel project.
- Optionally add `www.buildhaus.in` as a `CNAME` to `cname.vercel-dns.com` in the apps/website project and set up a redirect to the apex, if you want `www.` to work.

After adding domains in each Vercel project's dashboard and the corresponding DNS records at your registrar, Vercel auto-provisions and renews TLS certificates — no manual certificate step.

---

## 6. What this doc does not do

Per the scope of the change that introduced it: no `vercel login`, `vercel link`, `vercel deploy`, or any other command that touches a real Vercel account was run. No `.env.local` file was created, read, or modified, and no real secrets were generated or handled. Creating the two Vercel projects, entering the environment variable values, and pointing DNS at Vercel are manual steps for whoever owns the `buildhaus.in` domain and the target Vercel/Supabase accounts.
