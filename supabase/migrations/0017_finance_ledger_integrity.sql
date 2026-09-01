-- ============================================================================
-- Buildhaus · 0017 · Finance ledger integrity
-- ----------------------------------------------------------------------------
-- Repair-plan gate ("Data model decisions to settle before Phase 3", #1 —
-- Payments must be a ledger, not status flags): client_payment_schedules and
-- client_invoices each carry their own independently-settable `status` text
-- column, and nothing links a client_receipts row back to the specific
-- schedule it paid. owner/finance/actions.ts's recordReceipt() writes three
-- separate rows (a receipt, a payments ledger entry, and an update flipping
-- the schedule's status to 'paid') with nothing stopping it from running
-- twice against the same milestone — each call would insert a second
-- receipt and a second payments entry, inflating cash figures, with the
-- schedule's status silently staying "paid" throughout.
--
-- This migration is deliberately additive, not the full re-architecture the
-- plan describes (deriving status entirely from the ledger) — that's a
-- bigger, higher-risk schema change affecting every consumer of these
-- tables (owner/finance, client/payments, client/payments/receipts/[id],
-- the Command Centre's cash figures). What ships here is the two concrete,
-- narrow guarantees the plan names explicitly: "a unique constraint
-- preventing the same milestone being paid twice and the same receipt
-- number being issued twice." The full ledger-as-source-of-truth migration
-- remains a real follow-up, tracked separately.
-- ============================================================================

-- Which schedule (if any) this receipt paid — previously unrecorded even at
-- the application level; recordReceipt() flipped client_payment_schedules
-- .status directly with no row linking the two. Nullable: a receipt can be
-- a general/unscheduled payment not tied to a specific milestone.
alter table client_receipts
  add column if not exists schedule_id uuid references client_payment_schedules(id) on delete set null;

-- "The same receipt number being issued twice" — receipt_no was
-- app-generated (`BH-RCPT-${Date.now().toString().slice(-6)}`, 6 digits, no
-- randomness) with nothing in the schema stopping a collision.
create unique index if not exists client_receipts_receipt_no_key on client_receipts(receipt_no) where receipt_no is not null;

-- "The same milestone being paid twice" — a partial unique index (not a
-- plain column constraint) so it only fires for receipts that actually
-- target a schedule; general receipts (schedule_id null) are unrestricted.
create unique index if not exists client_receipts_one_per_schedule on client_receipts(schedule_id) where schedule_id is not null;
