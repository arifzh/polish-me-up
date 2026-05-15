"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Briefcase,
  Home,
  Plus,
  Star,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AddressPicker } from "@/components/customer/AddressPicker";
import { createClient } from "@/lib/supabase/client";
import { useCartStore, type CartAddress } from "@/store/cartStore";

const NOTE_MAX = 280;

type SavedAddress = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
};

const PRESET_LABELS = ["Home", "Work"];

function iconForLabel(label: string) {
  const lower = label.toLowerCase();
  if (lower === "home") return Home;
  if (lower === "work") return Briefcase;
  return Star;
}

export default function OrderAddressPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const serviceMode = useCartStore((s) => s.serviceMode);
  const savedAddress = useCartStore((s) => s.address);
  const setAddress = useCartStore((s) => s.setAddress);
  const addressNote = useCartStore((s) => s.addressNote);
  const setAddressNote = useCartStore((s) => s.setAddressNote);

  const [draft, setDraft] = useState<CartAddress | null>(savedAddress);
  const [mounted, setMounted] = useState(false);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [newLabel, setNewLabel] = useState<string>("");
  const [savingLabel, setSavingLabel] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && serviceMode !== "mobile") {
      router.replace("/order/start");
    }
  }, [mounted, serviceMode, router]);

  // Bootstrap: identify (and lazily create) the customer row, then load
  // their saved addresses so the chip recall works on first visit.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setSignedIn(false);
        return;
      }
      setSignedIn(true);

      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();
      if (cancelled) return;

      let cid = existing?.id ?? null;
      if (!cid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, phone, is_student")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        const { data: inserted } = await supabase
          .from("customers")
          .insert({
            profile_id: user.id,
            full_name: profile?.full_name ?? user.email ?? "Customer",
            email: profile?.email ?? user.email ?? null,
            phone: profile?.phone ?? null,
            is_student: profile?.is_student ?? false,
            source: "system",
          })
          .select("id")
          .single();
        if (cancelled) return;
        cid = inserted?.id ?? null;
      }
      if (!cid) return;
      setCustomerId(cid);

      const { data: rows } = await supabase
        .from("saved_addresses")
        .select("id, label, address, lat, lng")
        .eq("customer_id", cid)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setSaved(
        (rows ?? []).map((r) => ({
          id: r.id,
          label: r.label,
          address: r.address,
          lat: Number(r.lat),
          lng: Number(r.lng),
        })),
      );
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  function handleSelectSaved(s: SavedAddress) {
    setDraft({ text: s.address, lat: s.lat, lng: s.lng });
  }

  async function handleSaveCurrent() {
    if (!draft) {
      setSaveError("Pick an address first.");
      return;
    }
    if (!customerId) {
      setSaveError("You need to be signed in to save addresses.");
      return;
    }
    const label = newLabel.trim();
    if (label.length < 1 || label.length > 30) {
      setSaveError("Label must be 1-30 characters.");
      return;
    }

    setSaveError(null);
    setSavingLabel(true);
    const { data, error } = await supabase
      .from("saved_addresses")
      .upsert(
        {
          customer_id: customerId,
          label,
          address: draft.text,
          lat: draft.lat,
          lng: draft.lng,
        },
        { onConflict: "customer_id,label" },
      )
      .select("id, label, address, lat, lng")
      .single();
    setSavingLabel(false);

    if (error) {
      setSaveError(error.message);
      return;
    }
    if (data) {
      setSaved((prev) => {
        const without = prev.filter((p) => p.label !== data.label);
        return [
          {
            id: data.id,
            label: data.label,
            address: data.address,
            lat: Number(data.lat),
            lng: Number(data.lng),
          },
          ...without,
        ];
      });
      setNewLabel("");
    }
  }

  async function handleDelete(id: string) {
    const prev = saved;
    setSaved((p) => p.filter((s) => s.id !== id));
    const { error } = await supabase
      .from("saved_addresses")
      .delete()
      .eq("id", id);
    if (error) {
      setSaved(prev);
      setSaveError(error.message);
    }
  }

  function handleContinue() {
    if (!draft) return;
    setAddress(draft);
    router.push("/packages?mode=mobile");
  }

  const usedLabels = new Set(saved.map((s) => s.label.toLowerCase()));
  const presetSuggestions = PRESET_LABELS.filter(
    (p) => !usedLabels.has(p.toLowerCase()),
  );

  return (
    <div className="space-y-6 pb-20 sm:pb-0">
      <Link
        href="/order/start"
        className="inline-flex items-center gap-1.5 text-sm text-[#EC4899] hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to mode select
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[#EC4899] sm:text-3xl md:text-4xl">
          Where should we come?
        </h1>
        <p className="text-sm text-[#3D1A2A]/70 sm:text-base">
          Pin your exact location - your manicurist will use this to find you.
        </p>
      </header>

      {/* Saved address quick-recall */}
      {signedIn && saved.length > 0 && (
        <div className="rounded-2xl border border-[#F8BBD0] bg-white/90 p-3 shadow-sm backdrop-blur-sm sm:p-4">
          <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#BE185D]">
            <Bookmark className="size-3.5" />
            Saved addresses
          </p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {saved.map((s) => {
              const Icon = iconForLabel(s.label);
              const active =
                draft?.lat === s.lat && draft?.lng === s.lng;
              return (
                <div
                  key={s.id}
                  className={`group flex shrink-0 items-center gap-1 rounded-full border px-1 transition-colors ${
                    active
                      ? "border-[#EC4899] bg-[#FFE4EC]"
                      : "border-[#F8BBD0] bg-white hover:bg-[#FFF5F8]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectSaved(s)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#3D1A2A]"
                    title={s.address}
                  >
                    <Icon className="size-3.5 text-[#EC4899]" />
                    {s.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    aria-label={`Remove ${s.label}`}
                    className="inline-flex size-6 items-center justify-center rounded-full text-[#5C2D48]/60 transition-opacity hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!token ? (
        <div className="rounded-2xl border border-dashed border-[#F8BBD0] bg-white p-6 text-sm text-[#3D1A2A]/70">
          <p className="font-medium text-[#3D1A2A]">Mapbox token missing.</p>
          <p className="mt-1">
            Set{" "}
            <code className="rounded bg-[#FFF5F8] px-1 py-0.5">
              NEXT_PUBLIC_MAPBOX_TOKEN
            </code>{" "}
            in your <code className="rounded bg-[#FFF5F8] px-1 py-0.5">.env</code>{" "}
            file and restart the dev server.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#F8BBD0] bg-white p-3 sm:p-6">
          <AddressPicker
            token={token}
            value={draft}
            onChange={setDraft}
          />
        </div>
      )}

      {/* Save the currently-pinned address for next time */}
      {signedIn && customerId && draft && (
        <div className="rounded-2xl border border-[#F8BBD0] bg-white/90 p-3 shadow-sm backdrop-blur-sm sm:p-4">
          <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#BE185D]">
            <Bookmark className="size-3.5" />
            Save this address for next time
          </p>
          <div className="space-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:space-y-0">
            <div className="flex flex-wrap gap-2">
              {presetSuggestions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNewLabel(p)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#F8BBD0] bg-[#FFF5F8] px-3 py-1 text-xs font-medium text-[#3D1A2A] hover:bg-[#FFE4EC]"
                >
                  {(() => {
                    const Icon = iconForLabel(p);
                    return <Icon className="size-3.5 text-[#EC4899]" />;
                  })()}
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Custom name (e.g. Mom's place)"
                maxLength={30}
                className="h-9 flex-1 sm:w-64 sm:flex-initial"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSaveCurrent}
                disabled={savingLabel || !newLabel.trim()}
                className="shrink-0 bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white shadow-md hover:from-[#DB2777] hover:to-[#BE185D]"
              >
                <Plus className="size-3.5" />
                {savingLabel ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
          {saveError && (
            <p className="mt-2 text-xs text-rose-700">{saveError}</p>
          )}
        </div>
      )}

      {/* Additional info - independent of the map / address text */}
      <div className="rounded-2xl border border-[#F8BBD0] bg-white/90 p-4 shadow-sm backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label
            htmlFor="address-note"
            className="text-[11px] font-semibold uppercase tracking-wider text-[#BE185D]"
          >
            Additional info (optional)
          </label>
          <span className="text-[11px] text-[#5C2D48]/70">
            {addressNote.length}/{NOTE_MAX}
          </span>
        </div>
        <Textarea
          id="address-note"
          rows={3}
          maxLength={NOTE_MAX}
          placeholder="Gate code, unit colour, landmark, parking, who to ask for…"
          value={addressNote}
          onChange={(e) =>
            setAddressNote(e.target.value.slice(0, NOTE_MAX))
          }
        />
        <p className="mt-1 text-[11px] text-[#5C2D48]/70">
          This note is sent to the manicurist alongside your address - it
          doesn&apos;t change the pinned location.
        </p>
      </div>

      <div className="hidden flex-wrap items-center justify-between gap-3 sm:flex">
        <p className="text-xs text-[#3D1A2A]/60">
          {draft ? (
            <span className="whitespace-pre-line">
              <span className="font-medium text-[#3D1A2A]">Selected:</span>{" "}
              {draft.text}
            </span>
          ) : (
            "No address selected yet."
          )}
        </p>
        <Button
          onClick={handleContinue}
          disabled={!draft || !token}
          className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white shadow-md hover:from-[#DB2777] hover:to-[#BE185D] disabled:opacity-50"
        >
          Continue to packages
          <ArrowRight className="size-4" />
        </Button>
      </div>

      {/* Sticky mobile continue bar (sits just above the bottom nav) */}
      <div
        className="fixed inset-x-0 z-30 border-t border-[#F8BBD0] bg-white/95 px-3 py-3 shadow-[0_-4px_18px_-8px_rgba(244,143,177,0.45)] backdrop-blur-md sm:hidden"
        style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Button
          onClick={handleContinue}
          disabled={!draft || !token}
          className="h-11 w-full rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-base font-semibold text-white shadow-md hover:from-[#DB2777] hover:to-[#BE185D] disabled:opacity-50"
        >
          {draft ? "Continue to packages" : "Pick an address first"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
