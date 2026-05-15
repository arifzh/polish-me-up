-- Migration: 20260513000000 - Service mode (walk-in / mobile), geo coords, weekly schedule, item reseed
--
-- Adds:
--   1. enum service_mode ('mobile' | 'walkin' | 'both')
--   2. items.service_mode column (default 'both')
--   3. bookings.service_mode, bookings.address_lat, bookings.address_lng
--   4. manicurist_weekly_schedule table + RLS
--   5. Reseed of items per the new catalog (12 rows)
--
-- Safe to re-run: enums/columns are guarded with IF NOT EXISTS, policies use drop-then-create.
-- Existing bookings keep working - service_mode is backfilled from location_type.

-- ───────────────────────── 1. enum ──────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'service_mode') then
    create type public.service_mode as enum ('mobile', 'walkin', 'both');
  end if;
end $$;

-- ─────────────────────── 2. items column ────────────────────
alter table public.items
  add column if not exists service_mode public.service_mode not null default 'both';

create index if not exists items_service_mode_active_idx
  on public.items (service_mode, is_active);

-- ─────────────────────── 3. bookings columns ────────────────
alter table public.bookings
  add column if not exists service_mode public.service_mode,
  add column if not exists address_lat numeric(10, 7),
  add column if not exists address_lng numeric(10, 7);

-- backfill service_mode from existing location_type
update public.bookings
   set service_mode = case
     when location_type = 'booth' then 'walkin'::public.service_mode
     else 'mobile'::public.service_mode
   end
 where service_mode is null;

alter table public.bookings
  add constraint bookings_service_mode_not_both
  check (service_mode in ('mobile', 'walkin')) not valid;

alter table public.bookings validate constraint bookings_service_mode_not_both;

-- ─────────────────── 4. manicurist_weekly_schedule ──────────
create table if not exists public.manicurist_weekly_schedule (
  id              uuid primary key default gen_random_uuid(),
  manicurist_id   uuid not null references public.manicurists(id) on delete cascade,
  weekday         smallint not null check (weekday between 0 and 6),  -- 0 = Sunday … 6 = Saturday (JS getDay)
  start_time      time not null,
  end_time        time not null,
  is_closed       boolean not null default false,
  created_at      timestamptz default now(),
  constraint weekly_schedule_time_order check (start_time < end_time),
  constraint weekly_schedule_unique_day unique (manicurist_id, weekday)
);

alter table public.manicurist_weekly_schedule enable row level security;

drop policy if exists "anyone can read weekly schedule" on public.manicurist_weekly_schedule;
create policy "anyone can read weekly schedule"
  on public.manicurist_weekly_schedule
  for select
  using (true);

drop policy if exists "manicurists manage own weekly schedule" on public.manicurist_weekly_schedule;
create policy "manicurists manage own weekly schedule"
  on public.manicurist_weekly_schedule
  for all
  to authenticated
  using (
    public.is_manicurist()
    and exists (
      select 1 from public.manicurists m
      where m.id = manicurist_weekly_schedule.manicurist_id
        and m.profile_id = auth.uid()
    )
  )
  with check (
    public.is_manicurist()
    and exists (
      select 1 from public.manicurists m
      where m.id = manicurist_weekly_schedule.manicurist_id
        and m.profile_id = auth.uid()
    )
  );

-- ─────────────────── 5. manicurist_date_overrides ──────────
-- Day-specific overrides on top of the weekly schedule. Used for holidays,
-- sick days, or one-off open days. MVP only supports "closed" overrides
-- (custom start/end_time is allowed by the schema for a future v1.2 feature).
create table if not exists public.manicurist_date_overrides (
  id              uuid primary key default gen_random_uuid(),
  manicurist_id   uuid not null references public.manicurists(id) on delete cascade,
  date            date not null,
  is_closed       boolean not null default true,
  start_time      time,
  end_time        time,
  note            text,
  created_at      timestamptz default now(),
  constraint date_override_unique unique (manicurist_id, date),
  constraint date_override_times check (
    is_closed or (start_time is not null and end_time is not null and start_time < end_time)
  )
);

alter table public.manicurist_date_overrides enable row level security;

drop policy if exists "anyone can read date overrides" on public.manicurist_date_overrides;
create policy "anyone can read date overrides"
  on public.manicurist_date_overrides
  for select
  using (true);

drop policy if exists "manicurists manage own date overrides" on public.manicurist_date_overrides;
create policy "manicurists manage own date overrides"
  on public.manicurist_date_overrides
  for all
  to authenticated
  using (
    public.is_manicurist()
    and exists (
      select 1 from public.manicurists m
      where m.id = manicurist_date_overrides.manicurist_id
        and m.profile_id = auth.uid()
    )
  )
  with check (
    public.is_manicurist()
    and exists (
      select 1 from public.manicurists m
      where m.id = manicurist_date_overrides.manicurist_id
        and m.profile_id = auth.uid()
    )
  );

-- ─────────────────────── 6. item reseed ─────────────────────
-- Deactivate all existing items so the catalog reflects the new pricing
-- without orphaning historical booking_items.item_id FKs.
update public.items set is_active = false;

insert into public.items (name, description, category, service_mode, price, duration_min, is_active)
values
  -- Mobile packages (manicurist comes to customer)
  ('Manicure',           'Classic manicure at your location.',                      'package', 'mobile', 30.00, 45,  true),
  ('Pedicure',           'Classic pedicure at your location.',                      'package', 'mobile', 35.00, 50,  true),
  ('Mani + Pedi',        'Hands and feet combo.',                                   'package', 'mobile', 55.00, 90,  true),
  ('Mani + Hand Spa',    'Manicure with a relaxing hand spa.',                      'package', 'mobile', 60.00, 75,  true),
  ('Pedi + Foot Spa',    'Pedicure with a relaxing foot spa.',                      'package', 'mobile', 70.00, 90,  true),
  -- Walk-in package (at the booth)
  ('Manicure (Walk-in)', 'Classic manicure at our booth.',                          'package', 'walkin', 25.00, 40,  true),
  -- Add-ons (apply to both modes)
  ('Press-on Nails (Short)',  'Short press-on nail set.',                            'addon',   'both',   15.00, 15,  true),
  ('Press-on Nails (Medium)', 'Medium press-on nail set.',                           'addon',   'both',   30.00, 20,  true),
  ('Press-on Nails (Long)',   'Long press-on nail set.',                             'addon',   'both',   45.00, 25,  true),
  ('Gel',                     'Gel polish application.',                             'addon',   'both',   45.00, 30,  true),
  ('Nail Kit (Small)',        'Take-home nail care kit, small.',                     'addon',   'both',   35.00, 0,   true),
  ('Nail Kit (Large)',        'Take-home nail care kit, large.',                     'addon',   'both',   45.00, 0,   true);
