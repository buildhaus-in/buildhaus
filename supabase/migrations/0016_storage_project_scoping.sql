-- ============================================================================
-- Buildhaus · 0016 · Storage RLS — scope private buckets to project access
-- ----------------------------------------------------------------------------
-- 0011_triggers_functions.sql granted "authed read private" / "authed write
-- private" to ANY authenticated user across the entire project-files,
-- drawings, site-photos and documents buckets — contrary to that same
-- migration's own comment ("Path convention: {bucket}/{project_id}/... —
-- server checks project access before signing"), nothing in the policy
-- itself actually checked it. Table RLS on documents/drawings/etc. does not
-- protect the underlying files (see the repair-plan's Layer 4 note); this
-- migration is what actually enforces the path convention.
--
-- packages/database/src/storage.ts's real-Supabase-Storage branch is still
-- an intentional TODO (throws rather than silently upload) as of this
-- migration, so this can't be exercised against real Storage yet — fixing
-- it now means the policy is correct the moment that branch lands, instead
-- of shipping the same blanket-access bug a second time.
-- ============================================================================

drop policy if exists "authed read private" on storage.objects;
drop policy if exists "authed write private" on storage.objects;

-- Read: same visibility rule as the row tables these files back
-- (documents_read / drawings_read / receipts_read in 0010) — Owner, an
-- assigned project member, or the project's own client. Object keys in
-- these buckets are expected as "{project_id}/{filename}" (Demo Mode's
-- equivalent: apps/portal/src/app/uploads/[...path]/route.ts uses the same
-- convention); storage.foldername(name) splits the key on "/" and its
-- first element is the project id.
--
-- Residual risk, accepted deliberately (same reasoning as the Demo Mode
-- route and docs/SECURITY-CHECKLIST.md #2 on quotation_public_tokens): this
-- is project-level, not per-document — a Client who can view the project at
-- all can fetch any file under it, even one whose owning row has
-- client_visible = false, provided they already have its exact (random,
-- unguessable) generated filename. Closing that fully needs a signed-URL
-- issuer that checks the specific row first, not a bucket-wide storage
-- policy — tracked as a follow-up for whoever implements the real-Storage
-- branch, not done here.
create policy "project read private" on storage.objects for select to authenticated
  using (
    bucket_id in ('project-files','drawings','site-photos','documents')
    and public.can_view_project(((storage.foldername(name))[1])::uuid)
  );

-- Write: Owner or an assigned project member only — matches
-- documents_member_write / drawings_member_write (0010). Clients never
-- upload into these buckets.
create policy "project write private" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('project-files','drawings','site-photos','documents')
    and (
      public.is_owner()
      or public.is_project_member(((storage.foldername(name))[1])::uuid)
    )
  );
