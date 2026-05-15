"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  Home,
  MapPin,
  ShoppingBag,
  Sparkle,
  Store,
  Trash2,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCartStore } from "@/store/cartStore";
import { createClient } from "@/lib/supabase/client";
import { calculateDiscount } from "@/lib/utils/calculateDiscount";
import { formatMYR } from "@/lib/utils/formatPrice";
import {
  bookingSystemSchema,
  type BookingSystemInput,
} from "@/lib/validations/booking.schema";
import {
  isEducationalEmail,
  STUDENT_EMAIL_HINT,
} from "@/lib/validations/auth.schema";
import type { Tables } from "@/types/database.types";

type CartItem = Pick<
  Tables<"items">,
  "id" | "name" | "price" | "category" | "duration_min" | "service_mode"
>;

type ManicuristOption = {
  id: string;
  rating: number | null;
  full_name: string;
};

type WeeklyScheduleRow = {
  weekday: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
};

const ALL_TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 9; h <= 19; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 19 && m > 0) break;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
})();

function isoFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function defaultDate(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

function makeBookingNumber(): string {
  const year = new Date().getFullYear();
  const suffix = String(Date.now()).slice(-4);
  return `PMU-${year}-${suffix}`;
}

function compareHHMM(a: string, b: string): number {
  return a.localeCompare(b);
}

function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

// Smallest slot a customer can occupy if their cart has zero duration info.
const DEFAULT_SERVICE_MIN = 30;
// Default to a typical mani+pedi window if an existing booking is missing
// duration metadata (e.g. an old manual entry). Conservative so we don't
// double-book by accident.
const DEFAULT_EXISTING_MIN = 60;

export default function OrderPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const cartLines = useCartStore((s) => s.items);
  const serviceMode = useCartStore((s) => s.serviceMode);
  const cartAddress = useCartStore((s) => s.address);
  const cartAddressNote = useCartStore((s) => s.addressNote);
  const removeItem = useCartStore((s) => s.removeItem);
  const reset = useCartStore((s) => s.reset);

  const hydrated = useSyncExternalStore(
    useCartStore.persist.onFinishHydration,
    () => useCartStore.persist.hasHydrated(),
    () => false,
  );

  const [items, setItems] = useState<Map<string, CartItem>>(new Map());
  const [manicurists, setManicurists] = useState<ManicuristOption[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [profileIsStudent, setProfileIsStudent] = useState(false);
  const [studentEligible, setStudentEligible] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mobileCartExpanded, setMobileCartExpanded] = useState(false);

  // Empty until both a manicurist and a date are picked - that way the
  // dropdown can't show times the manicurist hasn't published.
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // After a successful submit we navigate to /confirm and clear the cart;
  // this flag prevents the "no mode in cart → /order/start" redirect from
  // firing during that brief gap.
  const submittedRef = useRef(false);

  const form = useForm<BookingSystemInput>({
    resolver: zodResolver(bookingSystemSchema),
    defaultValues: {
      customer_id: "",
      manicurist_id: "",
      booking_date: isoFromDate(defaultDate()),
      booking_time: "10:00",
      service_mode: serviceMode ?? "walkin",
      address: cartAddress?.text ?? "",
      address_lat: cartAddress?.lat ?? null,
      address_lng: cartAddress?.lng ?? null,
      notes: "",
      is_student: false,
      items: [],
    },
  });

  // Redirect if cart is missing the service mode (user skipped /order/start).
  // Skipped while we're navigating to /confirm - the cart reset would
  // otherwise bounce the user back here.
  useEffect(() => {
    if (!hydrated) return;
    if (submittedRef.current) return;
    if (!serviceMode) {
      router.replace("/order/start");
      return;
    }
    if (serviceMode === "mobile" && !cartAddress) {
      router.replace("/order/address");
      return;
    }
    form.setValue("service_mode", serviceMode);
    form.setValue("address", cartAddress?.text ?? "");
    form.setValue("address_lat", cartAddress?.lat ?? null);
    form.setValue("address_lng", cartAddress?.lng ?? null);
  }, [hydrated, serviceMode, cartAddress, router, form]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setBootstrapping(true);
      setBootstrapError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setBootstrapError("You need to be signed in.");
        return;
      }

      const [itemsRes, manicuristsRes, profileRes, customerRes] =
        await Promise.all([
          supabase
            .from("items")
            .select("id, name, price, category, duration_min, service_mode")
            .eq("is_active", true),
          supabase
            .from("manicurists")
            .select("id, rating, profiles!inner(full_name)")
            .eq("is_active", true),
          supabase
            .from("profiles")
            .select("full_name, email, phone, is_student")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("customers")
            .select("id")
            .eq("profile_id", user.id)
            .maybeSingle(),
        ]);

      if (cancelled) return;

      if (itemsRes.error) {
        setBootstrapError(itemsRes.error.message);
        return;
      }
      if (manicuristsRes.error) {
        setBootstrapError(manicuristsRes.error.message);
        return;
      }

      const itemMap = new Map<string, CartItem>();
      for (const item of itemsRes.data ?? []) {
        itemMap.set(item.id, item as CartItem);
      }
      setItems(itemMap);

      type ManicuristRow = {
        id: string;
        rating: number | null;
        profiles: { full_name: string | null } | { full_name: string | null }[];
      };
      const manicuristRows = (manicuristsRes.data ?? []) as ManicuristRow[];
      const opts: ManicuristOption[] = manicuristRows.map((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          rating: row.rating,
          full_name: profile?.full_name ?? "Unnamed manicurist",
        };
      });
      setManicurists(opts);

      const profile = profileRes.data;
      const eligible = isEducationalEmail(profile?.email ?? user.email ?? "");
      setStudentEligible(eligible);
      setProfileIsStudent(profile?.is_student ?? false);
      form.setValue(
        "is_student",
        eligible ? profile?.is_student ?? false : false,
      );

      let resolvedCustomerId = customerRes.data?.id ?? null;
      if (!resolvedCustomerId) {
        const { data: inserted, error: insertErr } = await supabase
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
        if (insertErr) {
          setBootstrapError(`Could not create customer record: ${insertErr.message}`);
          return;
        }
        resolvedCustomerId = inserted.id;
      }
      setCustomerId(resolvedCustomerId);
      form.setValue("customer_id", resolvedCustomerId);
      setBootstrapping(false);
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [supabase, form]);

  const isStudent = useWatch({ control: form.control, name: "is_student" });
  const dateValueWatched = useWatch({ control: form.control, name: "booking_date" });
  const manicuristIdWatched = useWatch({
    control: form.control,
    name: "manicurist_id",
  });

  // Compute available time slots: manicurist's schedule (weekly + per-date)
  // minus existing bookings (duration-aware) and minus slots whose
  // [start, start+myDuration) won't fit inside any window.
  useEffect(() => {
    if (!manicuristIdWatched || !dateValueWatched) {
      setAvailableSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);

    async function loadSlots() {
      const dayOfWeek = new Date(`${dateValueWatched}T00:00:00`).getDay();

      const [scheduleRes, overrideRes, bookingsRes] = await Promise.all([
        supabase
          .from("manicurist_weekly_schedule")
          .select("weekday, start_time, end_time, is_closed")
          .eq("manicurist_id", manicuristIdWatched)
          .eq("weekday", dayOfWeek)
          .order("start_time", { ascending: true }),
        supabase
          .from("manicurist_date_overrides")
          .select("is_closed, start_time, end_time")
          .eq("manicurist_id", manicuristIdWatched)
          .eq("date", dateValueWatched)
          .maybeSingle(),
        supabase
          .from("bookings")
          .select(
            "booking_time, status, booking_items(quantity, items(duration_min))",
          )
          .eq("manicurist_id", manicuristIdWatched)
          .eq("booking_date", dateValueWatched)
          .neq("status", "cancelled"),
      ]);

      if (cancelled) return;

      const override = overrideRes.data as
        | { is_closed: boolean; start_time: string | null; end_time: string | null }
        | null;

      // Date override fully closes the day
      if (override?.is_closed) {
        setAvailableSlots([]);
        setSlotsLoading(false);
        return;
      }

      type ScheduleRow = WeeklyScheduleRow;
      const scheduleRows = (scheduleRes.data ?? []) as ScheduleRow[];
      const activeWindows = scheduleRows
        .filter((r) => !r.is_closed)
        .map((r) => ({
          start: r.start_time.slice(0, 5),
          end: r.end_time.slice(0, 5),
        }));

      // How long is the *current customer's* appointment? Sum each cart item's
      // duration_min × qty so we can ensure the slot fits inside the
      // manicurist's window and doesn't overlap any existing booking.
      const myDuration = Math.max(
        cartLines.reduce((sum, line) => {
          const item = items.get(line.itemId);
          return sum + (item?.duration_min ?? 0) * line.quantity;
        }, 0),
        DEFAULT_SERVICE_MIN,
      );

      // Build blocked intervals from existing bookings using their own
      // duration data (sum of booking_items × items.duration_min).
      type BookingRow = {
        booking_time: string | null;
        status: string | null;
        booking_items:
          | Array<{
              quantity: number | null;
              items: { duration_min: number | null } | { duration_min: number | null }[] | null;
            }>
          | null;
      };
      const blocked = ((bookingsRes.data ?? []) as BookingRow[])
        .map((b) => {
          if (!b.booking_time) return null;
          const start = hhmmToMin(b.booking_time);
          const dur = (b.booking_items ?? []).reduce((sum, line) => {
            const itemRel = Array.isArray(line.items) ? line.items[0] : line.items;
            return sum + (itemRel?.duration_min ?? 0) * (line.quantity ?? 1);
          }, 0);
          return { start, end: start + (dur > 0 ? dur : DEFAULT_EXISTING_MIN) };
        })
        .filter((b): b is { start: number; end: number } => b !== null);

      // Decide which windows to honour: a custom-hours override beats the weekly schedule.
      let windows: Array<{ start: string; end: string }> = [];
      if (override && !override.is_closed && override.start_time && override.end_time) {
        windows = [
          {
            start: override.start_time.slice(0, 5),
            end: override.end_time.slice(0, 5),
          },
        ];
      } else if (activeWindows.length > 0) {
        windows = activeWindows;
      }

      if (windows.length === 0) {
        // No schedule set up → the manicurist hasn't opted in for this weekday.
        setAvailableSlots([]);
        setSlotsLoading(false);
        return;
      }

      const numericWindows = windows.map((w) => ({
        start: hhmmToMin(w.start),
        end: hhmmToMin(w.end),
      }));

      const slots = ALL_TIME_SLOTS.filter((s) => {
        const slotStart = hhmmToMin(s);
        const slotEnd = slotStart + myDuration;

        // Slot + my full duration must fit entirely inside one window.
        const fits = numericWindows.some(
          (w) => slotStart >= w.start && slotEnd <= w.end,
        );
        if (!fits) return false;

        // Slot must not overlap any existing booking.
        const overlaps = blocked.some(
          (b) => slotStart < b.end && b.start < slotEnd,
        );
        return !overlaps;
      });

      setAvailableSlots(slots);
      setSlotsLoading(false);
    }

    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [supabase, manicuristIdWatched, dateValueWatched, cartLines, items]);

  // If current time is no longer in available slots, clear it
  useEffect(() => {
    const current = form.getValues("booking_time");
    if (current && availableSlots.length > 0 && !availableSlots.includes(current)) {
      form.setValue("booking_time", availableSlots[0]);
    }
  }, [availableSlots, form]);

  const pricingLines = useMemo(() => {
    return cartLines
      .map((line) => {
        const item = items.get(line.itemId);
        if (!item) return null;
        return {
          item: { id: item.id, price: Number(item.price) },
          quantity: line.quantity,
        };
      })
      .filter((x): x is { item: { id: string; price: number }; quantity: number } => x !== null);
  }, [cartLines, items]);

  const pricing = useMemo(
    () => calculateDiscount({ lines: pricingLines, isStudent }),
    [pricingLines, isStudent],
  );

  useEffect(() => {
    form.setValue(
      "items",
      cartLines
        .filter((l) => items.has(l.itemId))
        .map((l) => ({ item_id: l.itemId, quantity: l.quantity })),
      { shouldValidate: false },
    );
  }, [cartLines, items, form]);

  async function onSubmit(values: BookingSystemInput) {
    setSubmitError(null);

    const serverPricing = calculateDiscount({
      lines: pricingLines,
      isStudent: values.is_student,
    });

    if (!customerId) {
      setSubmitError("Customer record is not ready yet. Try again.");
      return;
    }

    // Re-check the chosen slot is still open - duration-aware, not just an
    // exact booking_time match. Block if any existing booking's
    // [start, start+duration) overlaps [my_start, my_start+my_duration).
    const myDuration = Math.max(
      pricingLines.reduce((sum, line) => {
        const item = items.get(line.item.id);
        return sum + (item?.duration_min ?? 0) * line.quantity;
      }, 0),
      DEFAULT_SERVICE_MIN,
    );
    const myStart = hhmmToMin(values.booking_time);
    const myEnd = myStart + myDuration;

    const { data: sameDayBookings } = await supabase
      .from("bookings")
      .select(
        "id, booking_time, booking_items(quantity, items(duration_min))",
      )
      .eq("manicurist_id", values.manicurist_id)
      .eq("booking_date", values.booking_date)
      .neq("status", "cancelled");

    type BookingRow = {
      id: string;
      booking_time: string | null;
      booking_items:
        | Array<{
            quantity: number | null;
            items:
              | { duration_min: number | null }
              | { duration_min: number | null }[]
              | null;
          }>
        | null;
    };
    const collision = (sameDayBookings ?? []).find((b) => {
      const row = b as BookingRow;
      if (!row.booking_time) return false;
      const bStart = hhmmToMin(row.booking_time);
      const dur = (row.booking_items ?? []).reduce((sum, line) => {
        const itemRel = Array.isArray(line.items) ? line.items[0] : line.items;
        return sum + (itemRel?.duration_min ?? 0) * (line.quantity ?? 1);
      }, 0);
      const bEnd = bStart + (dur > 0 ? dur : DEFAULT_EXISTING_MIN);
      return myStart < bEnd && bStart < myEnd;
    });

    if (collision) {
      setSubmitError("That slot was just taken - please pick another time.");
      return;
    }

    const bookingNumber = makeBookingNumber();
    const locationType = values.service_mode === "walkin" ? "booth" : "home";

    // Combine address-specific notes (from /order/address) with the
    // general booking notes the customer typed on this screen.
    const userNotes = values.notes?.trim() ?? "";
    const trimmedAddressNote =
      values.service_mode === "mobile" ? cartAddressNote.trim() : "";
    const mergedNotes =
      [
        trimmedAddressNote ? `Address info: ${trimmedAddressNote}` : "",
        userNotes,
      ]
        .filter(Boolean)
        .join("\n\n") || null;

    const { data: bookingInsert, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        booking_number: bookingNumber,
        customer_id: customerId,
        manicurist_id: values.manicurist_id,
        booking_date: values.booking_date,
        booking_time: values.booking_time,
        service_mode: values.service_mode,
        location_type: locationType,
        address: values.service_mode === "mobile" ? values.address?.trim() || null : null,
        address_lat: values.service_mode === "mobile" ? values.address_lat ?? null : null,
        address_lng: values.service_mode === "mobile" ? values.address_lng ?? null : null,
        notes: mergedNotes,
        subtotal: serverPricing.subtotal,
        discount_amount: serverPricing.discountAmount,
        discount_type: serverPricing.discountType,
        total: serverPricing.total,
        status: "pending",
        payment_status: "unpaid",
        source: "system",
      })
      .select("id")
      .single();

    if (bookingErr || !bookingInsert) {
      setSubmitError(bookingErr?.message ?? "Could not create booking.");
      return;
    }

    const bookingId = bookingInsert.id;

    const itemRows = values.items.map((line) => {
      const itemRecord = items.get(line.item_id);
      const unitPrice = Number(itemRecord?.price ?? 0);
      return {
        booking_id: bookingId,
        item_id: line.item_id,
        quantity: line.quantity,
        unit_price: unitPrice,
        subtotal: Math.round(unitPrice * line.quantity * 100) / 100,
      };
    });

    const { error: itemsErr } = await supabase
      .from("booking_items")
      .insert(itemRows);

    if (itemsErr) {
      setSubmitError(`Booking saved but items failed: ${itemsErr.message}`);
      return;
    }

    const { data: existing } = await supabase
      .from("customers")
      .select("total_visits, total_spent, first_visit")
      .eq("id", customerId)
      .single();

    const today = isoFromDate(new Date());
    await supabase
      .from("customers")
      .update({
        total_visits: (existing?.total_visits ?? 0) + 1,
        total_spent: Number(existing?.total_spent ?? 0) + serverPricing.total,
        last_visit: today,
        first_visit: existing?.first_visit ?? today,
      })
      .eq("id", customerId);

    submittedRef.current = true;
    router.push(`/confirm/${bookingId}`);
    // Clear the cart after the navigation has been kicked off so the
    // redirect-to-/order/start effect doesn't race with the push.
    setTimeout(() => reset(), 0);
  }

  if (!hydrated) {
    return (
      <p className="text-sm text-muted-foreground">Loading your cart…</p>
    );
  }

  if (cartLines.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-[#F8BBD0] bg-gradient-to-br from-white to-[#FFE4EC]/60 p-10 text-center shadow-[0_10px_30px_-15px_rgba(236,72,153,0.35)]">
        <div className="pmu-float-soft mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-md">
          <ShoppingBag className="size-7" />
        </div>
        <h1 className="text-xl font-bold text-[#3D1A2A]">
          Your cart is empty
        </h1>
        <p className="text-sm text-[#5C2D48]/75">
          Browse our packages and add a treatment to get started.
        </p>
        <Button
          asChild
          size="lg"
          className="rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] px-6 text-white shadow-md hover:from-[#DB2777] hover:to-[#BE185D] hover:shadow-lg"
        >
          <Link href="/order/start">Start an order</Link>
        </Button>
      </div>
    );
  }

  if (bootstrapError) {
    return (
      <p className="text-sm text-destructive">{bootstrapError}</p>
    );
  }

  const noManicurists = !bootstrapping && manicurists.length === 0;
  const dateAsObj = dateValueWatched
    ? new Date(`${dateValueWatched}T00:00:00`)
    : undefined;
  const packagesHref =
    serviceMode === "walkin" ? "/packages?mode=walkin" : "/packages?mode=mobile";

  return (
    <div className="space-y-6 pb-32 lg:pb-0">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href={packagesHref}
          className="inline-flex items-center gap-1 text-sm text-[#5C2D48]/70 transition-colors hover:text-[#BE185D]"
        >
          <ArrowLeft className="size-4" />
          Back to packages
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold tracking-wider text-[#BE185D] uppercase shadow-sm">
              Step 2 of 2
            </span>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Confirm your{" "}
              <span className="pmu-animated-gradient-text">booking</span>
            </h1>
            <p className="text-sm text-[#5C2D48]/75">
              Pick a date, time, and manicurist - we&apos;ll confirm by message.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {/* Service-mode banner */}
            <div className="overflow-hidden rounded-2xl border border-[#F8BBD0] bg-gradient-to-r from-[#FFE4EC] to-white p-5 shadow-sm">
              {serviceMode === "mobile" ? (
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-md">
                    <Home className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold tracking-wider text-[#BE185D] uppercase">
                      Mobile booking
                    </p>
                    <p className="text-sm font-semibold text-[#3D1A2A]">
                      We come to you
                    </p>
                    <p className="mt-1 inline-flex items-start gap-1.5 whitespace-pre-line text-xs text-[#5C2D48]/80">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#EC4899]" />
                      {cartAddress?.text ?? "No address selected"}
                    </p>
                    <Link
                      href="/order/address"
                      className="mt-2 inline-block text-xs font-medium text-[#BE185D] hover:underline"
                    >
                      Change address →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-md">
                    <Store className="size-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold tracking-wider text-[#BE185D] uppercase">
                      Walk-in booking
                    </p>
                    <p className="text-sm font-semibold text-[#3D1A2A]">
                      Visit our booth
                    </p>
                    <p className="text-xs text-[#5C2D48]/80">
                      Drop by during opening hours - we&apos;ll be ready.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Form fields card */}
            <div className="space-y-5 rounded-2xl border border-[#F8BBD0] bg-white p-4 shadow-[0_4px_18px_-12px_rgba(236,72,153,0.25)] sm:p-6">
              <p className="text-[10px] font-semibold tracking-wider text-[#BE185D] uppercase">
                Appointment details
              </p>

            <FormField
              control={form.control}
              name="booking_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="inline-flex items-center gap-2">
                    <CalendarIcon className="size-4 text-[#EC4899]" />
                    Date
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start font-normal"
                      >
                        {dateAsObj
                          ? format(dateAsObj, "EEEE, d MMMM yyyy")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateAsObj}
                        onSelect={(d) => {
                          if (d) field.onChange(isoFromDate(d));
                        }}
                        disabled={{ before: startOfToday() }}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="manicurist_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="inline-flex items-center gap-2">
                    <User className="size-4 text-[#EC4899]" />
                    Manicurist
                  </FormLabel>
                  {noManicurists ? (
                    <p className="rounded-md border border-dashed border-[#F8BBD0] bg-[#FFF5F8] p-3 text-sm text-[#3D1A2A]">
                      No manicurists are available right now. Please ask an
                      admin to add one in the dashboard before booking.
                    </p>
                  ) : (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={bootstrapping}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              bootstrapping
                                ? "Loading…"
                                : "Pick a manicurist"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {manicurists.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.full_name}
                            {m.rating != null
                              ? ` - ★ ${Number(m.rating).toFixed(1)}`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="booking_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="inline-flex items-center gap-2">
                    <Clock className="size-4 text-[#EC4899]" />
                    Time
                  </FormLabel>
                  {availableSlots.length === 0 ? (
                    <p className="rounded-md border border-dashed border-[#F8BBD0] bg-[#FFF5F8] p-3 text-sm text-[#3D1A2A]">
                      {slotsLoading
                        ? "Loading available slots…"
                        : manicuristIdWatched
                          ? "This manicurist isn't available on the selected date."
                          : "Pick a manicurist to see available times."}
                    </p>
                  ) : (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pick a time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-64">
                        {availableSlots.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Allergies, preferences, anything we should know"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_student"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-row items-center gap-2">
                    <FormControl>
                      <Input
                        type="checkbox"
                        checked={!!field.value}
                        disabled={!studentEligible}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="h-5 w-5 rounded border-input accent-[#EC4899] disabled:cursor-not-allowed disabled:opacity-50 md:h-4 md:w-4"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 font-normal">
                      I&apos;m a student (10% off)
                      {profileIsStudent && studentEligible && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          from your profile
                        </span>
                      )}
                    </FormLabel>
                  </div>
                  {!studentEligible && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {STUDENT_EMAIL_HINT}
                    </p>
                  )}
                </FormItem>
              )}
            />

            </div>

            {submitError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {submitError}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="hidden w-full rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-base font-semibold text-white shadow-[0_8px_20px_-6px_rgba(236,72,153,0.55)] transition-all hover:from-[#DB2777] hover:to-[#BE185D] hover:shadow-[0_12px_28px_-6px_rgba(236,72,153,0.65)] lg:flex"
              disabled={
                form.formState.isSubmitting ||
                bootstrapping ||
                noManicurists ||
                pricingLines.length === 0 ||
                availableSlots.length === 0 ||
                !customerId
              }
            >
              {form.formState.isSubmitting
                ? "Booking…"
                : `Confirm booking · ${formatMYR(pricing.total)}`}
            </Button>

            {/* Backdrop when cart drawer is expanded - tap to close */}
            {mobileCartExpanded && (
              <button
                type="button"
                aria-label="Close cart preview"
                onClick={() => setMobileCartExpanded(false)}
                className="fixed inset-0 z-20 bg-[#3D1A2A]/40 backdrop-blur-[2px] lg:hidden"
              />
            )}

            {/* Sticky mobile confirm bar — collapses cart preview into a sheet above */}
            <div
              className="fixed inset-x-0 z-30 border-t border-[#F8BBD0] bg-white/95 shadow-[0_-4px_18px_-8px_rgba(244,143,177,0.45)] backdrop-blur-md lg:hidden"
              style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
            >
              {/* Collapsible cart summary */}
              {mobileCartExpanded && (
                <div className="max-h-[40vh] overflow-y-auto border-b border-[#F8BBD0]/60 bg-white px-3 py-3">
                  <ul className="space-y-2">
                    {cartLines.map((line) => {
                      const item = items.get(line.itemId);
                      if (!item) return null;
                      const lineTotal = Number(item.price) * line.quantity;
                      return (
                        <li
                          key={line.itemId}
                          className="flex items-center justify-between gap-2 rounded-lg bg-[#FFF5F8]/60 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[#3D1A2A]">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-[#5C2D48]/70">
                              {formatMYR(Number(item.price))} × {line.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[#3D1A2A]">
                              {formatMYR(lineTotal)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeItem(line.itemId)}
                              aria-label={`Remove ${item.name}`}
                              className="rounded-md p-1 text-[#5C2D48]/40 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-3 space-y-1.5 rounded-lg bg-gradient-to-br from-[#FFF5F8] to-[#FFE4EC]/60 p-3 text-sm">
                    <div className="flex justify-between text-[#5C2D48]">
                      <span>Subtotal</span>
                      <span>{formatMYR(pricing.subtotal)}</span>
                    </div>
                    {pricing.discountType === "student" && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Student discount (10%)</span>
                        <span>−{formatMYR(pricing.discountAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setMobileCartExpanded((v) => !v)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#FFF5F8] px-3 py-2 text-xs font-semibold text-[#BE185D] active:scale-95"
                  aria-expanded={mobileCartExpanded}
                  aria-label={`${mobileCartExpanded ? "Hide" : "Show"} cart, ${cartLines.length} ${cartLines.length === 1 ? "item" : "items"}`}
                >
                  <ShoppingBag className="size-3.5" />
                  {cartLines.length}
                  {mobileCartExpanded ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronUp className="size-3.5" />
                  )}
                </button>
                <Button
                  type="submit"
                  className="h-11 flex-1 rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-sm font-semibold text-white shadow-md hover:from-[#DB2777] hover:to-[#BE185D] disabled:opacity-50"
                  disabled={
                    form.formState.isSubmitting ||
                    bootstrapping ||
                    noManicurists ||
                    pricingLines.length === 0 ||
                    availableSlots.length === 0 ||
                    !customerId
                  }
                >
                  {form.formState.isSubmitting
                    ? "Booking…"
                    : `Confirm · ${formatMYR(pricing.total)}`}
                </Button>
              </div>
            </div>
          </form>
        </Form>

        <aside className="hidden h-fit space-y-5 rounded-2xl border border-[#F8BBD0] bg-white/95 p-6 shadow-[0_4px_18px_-12px_rgba(236,72,153,0.25)] backdrop-blur-sm lg:sticky lg:top-6 lg:block">
          <header className="flex items-center justify-between gap-2 border-b border-[#F8BBD0]/60 pb-3">
            <h2 className="inline-flex items-center gap-2 text-base font-semibold text-[#3D1A2A]">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-sm">
                <ShoppingBag className="size-3.5" />
              </span>
              Your cart
            </h2>
            <span className="rounded-full bg-[#FFE4EC] px-2.5 py-0.5 text-[11px] font-semibold text-[#BE185D]">
              {cartLines.length} item{cartLines.length === 1 ? "" : "s"}
            </span>
          </header>

          <ul className="space-y-3">
            {cartLines.map((line) => {
              const item = items.get(line.itemId);
              if (!item) {
                return (
                  <li
                    key={line.itemId}
                    className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700"
                  >
                    <span>Unavailable item</span>
                    <button
                      type="button"
                      onClick={() => removeItem(line.itemId)}
                      aria-label="Remove"
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                );
              }
              const lineTotal = Number(item.price) * line.quantity;
              return (
                <li
                  key={line.itemId}
                  className="group flex items-start justify-between gap-3 rounded-xl bg-[#FFF5F8]/60 px-3 py-2.5 text-sm transition-colors hover:bg-[#FFE4EC]/70"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#3D1A2A]">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-[#5C2D48]/70">
                      {formatMYR(Number(item.price))} × {line.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#3D1A2A]">
                      {formatMYR(lineTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(line.itemId)}
                      aria-label={`Remove ${item.name}`}
                      className="rounded-md p-1 text-[#5C2D48]/40 transition-colors hover:bg-rose-50 hover:text-rose-600 group-hover:text-[#5C2D48]/70"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Totals */}
          <div className="space-y-2 rounded-xl bg-gradient-to-br from-[#FFF5F8] to-[#FFE4EC]/60 p-4 text-sm">
            <div className="flex justify-between text-[#5C2D48]">
              <span>Subtotal</span>
              <span>{formatMYR(pricing.subtotal)}</span>
            </div>
            {pricing.discountType === "student" && (
              <div className="flex justify-between text-emerald-700">
                <span className="inline-flex items-center gap-1">
                  <Sparkle className="size-3" />
                  Student discount (10%)
                </span>
                <span>−{formatMYR(pricing.discountAmount)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-[#F8BBD0]/60 pt-2">
              <span className="text-[11px] font-semibold tracking-widest text-[#5C2D48]/70 uppercase">
                Total
              </span>
              <span className="pmu-animated-gradient-text text-2xl font-bold tracking-tight">
                {formatMYR(pricing.total)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
