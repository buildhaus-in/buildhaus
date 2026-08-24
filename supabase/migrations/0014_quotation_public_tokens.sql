-- ============================================================================
-- Buildhaus · 0014 · Public quotation share tokens
-- ----------------------------------------------------------------------------
-- Backs the unguessable-link quotation flow: a customer running the public
-- Cost Estimator gets redirected to /quotation/[token] (apps/website), which
-- resolves the token instead of ever exposing quotations.id. Consumers, all
-- already shipped as of this migration:
--   - apps/website/src/app/cost-estimator/actions.ts  (generateQuotation — INSERT)
--   - apps/website/src/app/quotation/[token]/page.tsx  (SELECT by token, anon)
--   - apps/website/src/app/quotation/[token]/pdf/route.ts (SELECT by token, anon)
--
-- No prior migration created this table even though the Demo Mode fixtures
-- (packages/database/src/demo/seed.ts key `quotation_public_tokens`) and the
-- consumers above already assume it exists — defined here to match exactly,
-- same rationale as 0012's header comment.
-- ============================================================================

create table quotation_public_tokens (
  id           uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotations(id) on delete cascade,
  token        text not null unique,
  expires_at   timestamptz,
  revoked      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index idx_qpt_quotation on quotation_public_tokens(quotation_id);
-- token already has a unique index from the `unique` constraint above, which
-- is exactly what the anon lookup below needs (equality lookup on a single
-- unguessable value, never a scan).

alter table quotation_public_tokens enable row level security;
alter table quotation_public_tokens force row level security;

-- Owner reads/manages tokens directly (future: a "revoke this link" action in
-- the portal). No Engineer/Architect/Client access — this table has nothing
-- to do with their assigned-project scope.
create policy qpt_owner on quotation_public_tokens for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Anonymous SELECT, scoped to non-revoked / non-expired rows only. The public
-- quotation page and PDF route originally resolved tokens through the
-- anon-bound client and depended on this grant; they now resolve through the
-- service context (see the consumer files above), so nothing currently
-- exercises it. Kept anyway: it documents the intended anon-visible slice of
-- this table, and it is what a future anon-bound consumer should rely on.
--
-- Honest limitation, not fixed by this policy: Postgres RLS predicates are
-- evaluated per row and cannot tell "the caller supplied an .eq(token, X)
-- filter" apart from "the caller ran a bare SELECT *". A `using (true)`-style
-- policy — which is what a plain "is this row visible" grant amounts to —
-- technically permits listing every live token in one request just as much as
-- it permits a single exact-token lookup; RLS alone cannot distinguish them.
-- The token's 192 bits of randomness (packages/database is generated via
-- `randomBytes(24)` in cost-estimator/actions.ts) makes *guessing* a token
-- infeasible, but that's a property of the token, not of this policy — an
-- attacker who can already run arbitrary PostgREST queries against this table
-- (e.g. a leaked service key, or a future admin UI that forgets to filter)
-- could still page through every row. Two mitigations belong on the app side,
-- not here: (1) never build an admin/API surface that does a bare
-- `.from("quotation_public_tokens").select()` without a `.eq("token", ...)`
-- filter; (2) prefer a SECURITY DEFINER RPC (`resolve_token(text)` style) over
-- a direct table grant for any *future* unguessable-token table, since a function
-- only ever returns a row for the exact token it's called with. Documented in
-- docs/SECURITY-CHECKLIST.md.
create policy qpt_public_read on quotation_public_tokens for select to anon
  using (revoked = false and (expires_at is null or expires_at > now()));

-- Deliberately NO anon INSERT policy. A permissive anon INSERT here
-- (`with check (true)`) would let anyone mint a share-token for ANY existing
-- quotation_id, not just ones they generated — self-issuing access to someone
-- else's quotation. cost-estimator/actions.ts:generateQuotation() instead
-- writes tokens (and the leads/quotations/quotation_versions rows before
-- them, all `is_owner()`-only under 0010) via `createAdminClient()` — the
-- service role bypasses RLS by design, matching the precedent 0010 set for
-- public access ("handled server-side with the service context for anonymous
-- website visitors"). See docs/SECURITY-CHECKLIST.md.
