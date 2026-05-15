"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarOff,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/manicurist/PageHeader";
import { createClient } from "@/lib/supabase/client";

type WeeklyWindow = {
  id?: string;
  start_time: string;
  end_time: string;
};

type OverrideRow = {
  id: string;
  date: string;
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
};

type OverrideMode = "closed" | "custom";

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DEFAULT_START = "09:00";
const DEFAULT_END = "19:00";

function emptyWeek(): Record<number, WeeklyWindow[]> {
  const out: Record<number, WeeklyWindow[]> = {};
  for (let i = 0; i < 7; i++) out[i] = [];
  return out;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTimeRange(start: string | null, end: string | null): string {
  if (!start || !end) return "-";
  return `${start.slice(0, 5)}-${end.slice(0, 5)}`;
}

function rangesOverlap(a: WeeklyWindow, b: WeeklyWindow): boolean {
  return a.start_time < b.end_time && b.start_time < a.end_time;
}

export default function AvailabilityPage() {
  const supabase = useMemo(() => createClient(), []);
  const [manicuristId, setManicuristId] = useState<string | null>(null);
  const [week, setWeek] = useState<Record<number, WeeklyWindow[]>>(emptyWeek());
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideMode, setOverrideMode] = useState<OverrideMode>("closed");
  const [newDate, setNewDate] = useState<string>(todayISO());
  const [newStart, setNewStart] = useState<string>(DEFAULT_START);
  const [newEnd, setNewEnd] = useState<string>(DEFAULT_END);
  const [newNote, setNewNote] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setBootError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setBootError("You need to be signed in.");
        return;
      }

      const { data: existing, error: mErr } = await supabase
        .from("manicurists")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (mErr) {
        setBootError(mErr.message);
        setLoading(false);
        return;
      }

      let manicuristRowId = existing?.id ?? null;
      if (!manicuristRowId) {
        const { data: created, error: createErr } = await supabase
          .from("manicurists")
          .insert({ profile_id: user.id, is_active: true })
          .select("id")
          .single();
        if (cancelled) return;
        if (createErr || !created) {
          setBootError(
            createErr?.message ??
              "Could not set up your manicurist record. Please try again.",
          );
          setLoading(false);
          return;
        }
        manicuristRowId = created.id;
      }
      setManicuristId(manicuristRowId);

      const [scheduleRes, overridesRes] = await Promise.all([
        supabase
          .from("manicurist_weekly_schedule")
          .select("id, weekday, start_time, end_time, is_closed")
          .eq("manicurist_id", manicuristRowId)
          .order("weekday", { ascending: true })
          .order("start_time", { ascending: true }),
        supabase
          .from("manicurist_date_overrides")
          .select("id, date, is_closed, start_time, end_time, note")
          .eq("manicurist_id", manicuristRowId)
          .gte("date", todayISO())
          .order("date", { ascending: true }),
      ]);

      if (cancelled) return;

      const grouped = emptyWeek();
      for (const row of scheduleRes.data ?? []) {
        // is_closed weekly rows from the old single-window schema are skipped -
        // an absence of windows now means "closed".
        if (row.is_closed) continue;
        grouped[row.weekday].push({
          id: row.id,
          start_time: row.start_time.slice(0, 5),
          end_time: row.end_time.slice(0, 5),
        });
      }
      setWeek(grouped);
      setOverrides((overridesRes.data ?? []) as OverrideRow[]);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function setDayWindows(weekday: number, windows: WeeklyWindow[]) {
    setWeek((prev) => ({ ...prev, [weekday]: windows }));
  }

  function addWindow(weekday: number) {
    setDayWindows(weekday, [
      ...week[weekday],
      { start_time: DEFAULT_START, end_time: DEFAULT_END },
    ]);
  }

  function updateWindow(weekday: number, idx: number, patch: Partial<WeeklyWindow>) {
    setDayWindows(
      weekday,
      week[weekday].map((w, i) => (i === idx ? { ...w, ...patch } : w)),
    );
  }

  function removeWindow(weekday: number, idx: number) {
    setDayWindows(
      weekday,
      week[weekday].filter((_, i) => i !== idx),
    );
  }

  async function saveDay(weekday: number) {
    if (!manicuristId) return;
    setActionError(null);

    const windows = week[weekday];

    // Validate
    for (const w of windows) {
      if (w.start_time >= w.end_time) {
        setActionError(
          `${WEEKDAY_LABELS[weekday]}: start time must be before end time.`,
        );
        return;
      }
    }
    for (let i = 0; i < windows.length; i++) {
      for (let j = i + 1; j < windows.length; j++) {
        if (rangesOverlap(windows[i], windows[j])) {
          setActionError(
            `${WEEKDAY_LABELS[weekday]}: time windows overlap.`,
          );
          return;
        }
      }
    }

    setSavingDay(weekday);

    // Replace all rows for this weekday: delete then insert.
    const { error: delErr } = await supabase
      .from("manicurist_weekly_schedule")
      .delete()
      .eq("manicurist_id", manicuristId)
      .eq("weekday", weekday);

    if (delErr) {
      setActionError(delErr.message);
      setSavingDay(null);
      return;
    }

    if (windows.length === 0) {
      setSavingDay(null);
      return;
    }

    const rows = windows.map((w) => ({
      manicurist_id: manicuristId,
      weekday,
      start_time: w.start_time,
      end_time: w.end_time,
      is_closed: false,
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("manicurist_weekly_schedule")
      .insert(rows)
      .select("id, start_time, end_time");

    if (insErr) {
      setActionError(insErr.message);
      setSavingDay(null);
      return;
    }

    // Re-sync local state with returned ids
    if (inserted) {
      const fresh = inserted
        .map((r) => ({
          id: r.id,
          start_time: r.start_time.slice(0, 5),
          end_time: r.end_time.slice(0, 5),
        }))
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      setDayWindows(weekday, fresh);
    }
    setSavingDay(null);
  }

  async function addOverride() {
    if (!manicuristId || !newDate) return;
    setActionError(null);

    if (overrideMode === "custom" && newStart >= newEnd) {
      setActionError("Start time must be before end time.");
      return;
    }

    setSavingOverride(true);
    const payload: {
      manicurist_id: string;
      date: string;
      is_closed: boolean;
      start_time: string | null;
      end_time: string | null;
      note: string | null;
    } =
      overrideMode === "closed"
        ? {
            manicurist_id: manicuristId,
            date: newDate,
            is_closed: true,
            start_time: null,
            end_time: null,
            note: newNote.trim() || null,
          }
        : {
            manicurist_id: manicuristId,
            date: newDate,
            is_closed: false,
            start_time: newStart,
            end_time: newEnd,
            note: newNote.trim() || null,
          };

    const { data, error } = await supabase
      .from("manicurist_date_overrides")
      .upsert(payload, { onConflict: "manicurist_id,date" })
      .select("id, date, is_closed, start_time, end_time, note")
      .single();

    if (error) {
      setActionError(error.message);
    } else if (data) {
      setOverrides((prev) => {
        const filtered = prev.filter((o) => o.date !== data.date);
        return [...filtered, data as OverrideRow].sort((a, b) =>
          a.date.localeCompare(b.date),
        );
      });
      setNewNote("");
    }
    setSavingOverride(false);
  }

  async function removeOverride(id: string) {
    setActionError(null);
    const prev = overrides;
    setOverrides((p) => p.filter((o) => o.id !== id));
    const { error } = await supabase
      .from("manicurist_date_overrides")
      .delete()
      .eq("id", id);
    if (error) {
      setActionError(error.message);
      setOverrides(prev);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading availability…
      </div>
    );
  }

  if (bootError) {
    return <p className="text-sm text-destructive">{bootError}</p>;
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Availability"
        subtitle="Set multiple working windows per weekday, then add date-specific overrides."
      />

      {actionError && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {actionError}
        </p>
      )}

      <section className="space-y-4 rounded-2xl border border-[#F8BBD0] bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-6">
        <header className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-[0_4px_12px_-2px_rgba(236,72,153,0.45)]">
            <CalendarClock className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[#3D1A2A] sm:text-xl">
              Weekly schedule
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Add one or more working windows per weekday. Leave a day empty
              and customers see no slots.
            </p>
          </div>
        </header>

        <div className="divide-y divide-[#F8BBD0]/50">
          {WEEKDAY_LABELS.map((label, weekday) => {
            const windows = week[weekday];
            return (
              <div key={weekday} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="shrink-0 font-medium text-[#3D1A2A] sm:w-24">
                      {label}
                    </p>
                    {windows.length === 0 && (
                      <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200">
                        Closed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addWindow(weekday)}
                    >
                      <Plus className="size-3.5" />
                      <span className="hidden sm:inline">Add window</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveDay(weekday)}
                      disabled={savingDay === weekday}
                      className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white shadow-md hover:from-[#DB2777] hover:to-[#BE185D]"
                    >
                      {savingDay === weekday ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>

                {windows.length > 0 && (
                  <div className="mt-3 space-y-2 sm:pl-24">
                    {windows.map((w, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-lg bg-[#FFF5F8]/60 px-3 py-2"
                      >
                        <Input
                          type="time"
                          value={w.start_time}
                          onChange={(e) =>
                            updateWindow(weekday, idx, {
                              start_time: e.target.value,
                            })
                          }
                          className="w-28 px-2 sm:w-32"
                        />
                        <span className="text-sm text-[#5C2D48]">to</span>
                        <Input
                          type="time"
                          value={w.end_time}
                          onChange={(e) =>
                            updateWindow(weekday, idx, {
                              end_time: e.target.value,
                            })
                          }
                          className="w-28 px-2 sm:w-32"
                        />
                        <button
                          type="button"
                          onClick={() => removeWindow(weekday, idx)}
                          aria-label="Remove window"
                          className="ml-auto inline-flex size-7 items-center justify-center rounded-md text-[#BE185D] hover:bg-rose-50"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[#F8BBD0] bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-6">
        <header className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-[0_4px_12px_-2px_rgba(236,72,153,0.45)]">
            <CalendarOff className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[#3D1A2A] sm:text-xl">
              Date-specific overrides
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Block a date entirely, or set a one-off custom window that
              replaces the weekly schedule for that day.
            </p>
          </div>
        </header>

        <div className="rounded-xl border border-[#F8BBD0]/60 bg-[#FFF5F8]/50 p-3 sm:p-4">
          <div className="mb-3 inline-flex rounded-full bg-white p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setOverrideMode("closed")}
              className={
                overrideMode === "closed"
                  ? "rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] px-4 py-1.5 text-xs font-medium text-white shadow-sm"
                  : "rounded-full px-4 py-1.5 text-xs font-medium text-[#5C2D48] hover:text-[#3D1A2A]"
              }
            >
              Block date
            </button>
            <button
              type="button"
              onClick={() => setOverrideMode("custom")}
              className={
                overrideMode === "custom"
                  ? "rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] px-4 py-1.5 text-xs font-medium text-white shadow-sm"
                  : "rounded-full px-4 py-1.5 text-xs font-medium text-[#5C2D48] hover:text-[#3D1A2A]"
              }
            >
              Custom hours
            </button>
          </div>

          <div className="grid items-end gap-3 sm:grid-cols-2 md:grid-cols-[180px_repeat(2,140px)_1fr_auto]">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium tracking-wide text-[#5C2D48]">
                Date
              </label>
              <Input
                type="date"
                value={newDate}
                min={todayISO()}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>

            {overrideMode === "custom" && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium tracking-wide text-[#5C2D48]">
                    From
                  </label>
                  <Input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium tracking-wide text-[#5C2D48]">
                    To
                  </label>
                  <Input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                  />
                </div>
              </>
            )}

            <div
              className={`space-y-1.5 ${overrideMode === "closed" ? "md:col-span-3" : ""}`}
            >
              <label className="block text-xs font-medium tracking-wide text-[#5C2D48]">
                Note (optional)
              </label>
              <Input
                type="text"
                placeholder={
                  overrideMode === "closed"
                    ? "Public holiday, training day…"
                    : "Early close, special event…"
                }
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
            </div>

            <Button
              type="button"
              onClick={addOverride}
              disabled={savingOverride || !newDate}
              className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white shadow-md hover:from-[#DB2777] hover:to-[#BE185D] sm:col-span-2 md:col-span-1"
            >
              <Plus className="size-4" />
              {overrideMode === "closed" ? "Block date" : "Add hours"}
            </Button>
          </div>
        </div>

        {overrides.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#F8BBD0] bg-[#FFF5F8]/40 p-4 text-center text-sm text-[#5C2D48]/70">
            No date overrides ahead.
          </p>
        ) : (
          <ul className="space-y-2">
            {overrides.map((o) => (
              <li
                key={o.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-[#F8BBD0] bg-[#FFF5F8]/40 px-3 py-2.5 sm:items-center sm:px-4"
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-[#3D1A2A]">
                    {new Date(`${o.date}T00:00:00`).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {o.is_closed ? (
                    <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200">
                      Blocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200">
                      Custom · {fmtTimeRange(o.start_time, o.end_time)}
                    </span>
                  )}
                  {o.note && (
                    <span className="w-full text-xs text-muted-foreground sm:w-auto">
                      {o.note}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeOverride(o.id)}
                  aria-label="Remove override"
                  className="inline-flex size-7 items-center justify-center rounded-md text-[#BE185D] hover:bg-rose-50"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
