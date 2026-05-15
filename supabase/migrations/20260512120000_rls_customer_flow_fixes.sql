-- Migration: 20260512120000 - Customer flow RLS fixes (patched from production after Phase 7B testing)
--
-- Phase 7B browser testing surfaced five RLS gaps in the original schema migration.
-- They were patched by hand via the Supabase SQL Editor; this file captures them in
-- source control so a fresh project (local dev, new environment) gets them automatically.
--
-- Every policy is wrapped in `drop policy if exists ... ; create policy ...` so the
-- file is safe to re-run. Do NOT execute this against the live database - the
-- policies already exist there.

-- 1. customers create own record
-- Fix: the customer-facing /order page auto-creates a `customers` row on first
-- visit (profile_id -> auth.uid()). Without an INSERT policy that insert was
-- rejected by RLS and the booking flow stopped before it began.
drop policy if exists "customers create own record" on public.customers;
create policy "customers create own record"
  on public.customers
  for insert
  to authenticated
  with check (profile_id = auth.uid());

-- 2. customers update own record
-- Fix: after a successful booking the order page bumps total_visits, total_spent
-- and last_visit on the customer's own row. Without an UPDATE policy these
-- writes were silently dropped and customer aggregates never moved.
drop policy if exists "customers update own record" on public.customers;
create policy "customers update own record"
  on public.customers
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- 3. anyone can read manicurist profiles
-- Fix: the order form lists manicurists by joining manicurists -> profiles for
-- full_name. The default profile SELECT policy only exposed the caller's own
-- profile row, so the manicurist dropdown rendered empty for every customer.
drop policy if exists "anyone can read manicurist profiles" on public.profiles;
create policy "anyone can read manicurist profiles"
  on public.profiles
  for select
  using (role = 'manicurist');

-- 4. customers insert own booking items
-- Fix: the original migration shipped a SELECT policy ("see own booking items")
-- but no INSERT policy, so booking line items could never be persisted by a
-- customer. The WITH CHECK joins through bookings -> customers to confirm the
-- parent booking belongs to the caller. Mirrors the existing SELECT pattern.
drop policy if exists "customers insert own booking items" on public.booking_items;
create policy "customers insert own booking items"
  on public.booking_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.bookings b
      join public.customers c on c.id = b.customer_id
      where b.id = booking_items.booking_id
        and c.profile_id = auth.uid()
    )
  );

-- 5. customers cancel own pending bookings (replacement)
-- Fix: the original policy had USING but no WITH CHECK. Postgres treats a
-- missing WITH CHECK on an UPDATE policy as "no rows may be produced", so
-- every cancel attempt failed silently. Recreate with both clauses:
--   USING       - the existing row must be pending and owned by the caller
--   WITH CHECK  - the new row must still be owned by the caller, and may be
--                 either pending (unchanged) or cancelled
drop policy if exists "customers cancel own pending bookings" on public.bookings;
create policy "customers cancel own pending bookings"
  on public.bookings
  for update
  to authenticated
  using (
    status = 'pending'
    and exists (
      select 1 from public.customers c
      where c.id = bookings.customer_id
        and c.profile_id = auth.uid()
    )
  )
  with check (
    status in ('pending', 'cancelled')
    and exists (
      select 1 from public.customers c
      where c.id = bookings.customer_id
        and c.profile_id = auth.uid()
    )
  );
