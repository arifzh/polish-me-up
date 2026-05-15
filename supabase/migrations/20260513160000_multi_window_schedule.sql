-- Migration: 20260513160000 - Allow multiple time windows per weekday.
--
-- Drops the UNIQUE(manicurist_id, weekday) on manicurist_weekly_schedule so a
-- manicurist can split a day into multiple ranges (e.g. 09:00-12:00 and
-- 14:00-18:00). manicurist_date_overrides already supports per-date custom
-- hours via its (is_closed, start_time, end_time) columns - the UI just
-- exposes that now.

alter table public.manicurist_weekly_schedule
  drop constraint if exists weekly_schedule_unique_day;
