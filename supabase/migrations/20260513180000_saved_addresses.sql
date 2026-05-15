-- Migration: 20260513180000 - Customer saved-address book (Home / Work / custom labels).
--
-- Each customer can keep a small set of named addresses for one-click reuse
-- on future mobile bookings. Manicurists can see them for context.

create table if not exists public.saved_addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label       text not null
    check (length(trim(label)) between 1 and 30),
  address     text not null,
  lat         numeric(10, 7) not null,
  lng         numeric(10, 7) not null,
  created_at  timestamptz default now(),
  constraint saved_addresses_unique_label unique (customer_id, label)
);

create index if not exists saved_addresses_customer_idx
  on public.saved_addresses (customer_id, created_at desc);

alter table public.saved_addresses enable row level security;

drop policy if exists "customers manage own saved addresses" on public.saved_addresses;
create policy "customers manage own saved addresses"
  on public.saved_addresses
  for all
  to authenticated
  using (
    exists (
      select 1 from public.customers c
      where c.id = saved_addresses.customer_id
        and c.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.customers c
      where c.id = saved_addresses.customer_id
        and c.profile_id = auth.uid()
    )
  );

drop policy if exists "manicurists read all saved addresses" on public.saved_addresses;
create policy "manicurists read all saved addresses"
  on public.saved_addresses
  for select
  using (public.is_manicurist());
