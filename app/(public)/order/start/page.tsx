"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Home,
  MapPin,
  Sparkle,
  Store,
  Tag,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BlurFade } from "@/components/animations/BlurFade";
import { AnimatedGradientText } from "@/components/animations/AnimatedGradientText";
import { useCartStore, type ServiceMode } from "@/store/cartStore";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const IMG = (file: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/service-images/items/${file}`;

type ModeCard = {
  mode: ServiceMode;
  title: string;
  tagline: string;
  description: string;
  image: string;
  icon: React.ComponentType<{ className?: string }>;
  bullets: Array<{ icon: React.ComponentType<{ className?: string }>; text: string }>;
  priceLabel: string;
  badge?: string;
  ctaLabel: string;
};

const CARDS: ModeCard[] = [
  {
    mode: "walkin",
    title: "Walk-in",
    tagline: "Pop into our booth",
    description:
      "Stop by our booth for a quick, relaxing session. Fixed location, no travel - easiest on the wallet.",
    image: IMG("walkin.png"),
    icon: Store,
    bullets: [
      { icon: Store, text: "You come to us" },
      { icon: Clock, text: "Quick turnaround" },
      { icon: Wallet, text: "Lowest pricing" },
    ],
    priceLabel: "From RM 25",
    badge: "Best value",
    ctaLabel: "Start walk-in order",
  },
  {
    mode: "mobile",
    title: "Mobile",
    tagline: "We come to you",
    description:
      "Get the salon experience without leaving home - perfect for cosy weekends, hotels, or office break rooms.",
    image: IMG("mobile.png"),
    icon: Home,
    bullets: [
      { icon: Home, text: "Service at your address" },
      { icon: MapPin, text: "Pin your exact location" },
      { icon: Sparkle, text: "Premium add-ons available" },
    ],
    priceLabel: "From RM 30",
    badge: "Most popular",
    ctaLabel: "Start mobile order",
  },
];

export default function OrderStartPage() {
  const router = useRouter();
  const currentMode = useCartStore((s) => s.serviceMode);
  const cartItems = useCartStore((s) => s.items);
  const setServiceMode = useCartStore((s) => s.setServiceMode);
  const [confirmingSwitchTo, setConfirmingSwitchTo] =
    useState<ServiceMode | null>(null);

  function navigateForMode(mode: ServiceMode) {
    router.push(mode === "mobile" ? "/order/address" : "/packages?mode=walkin");
  }

  function choose(mode: ServiceMode) {
    if (
      currentMode &&
      currentMode !== mode &&
      cartItems.length > 0 &&
      confirmingSwitchTo !== mode
    ) {
      setConfirmingSwitchTo(mode);
      return;
    }
    setServiceMode(mode);
    navigateForMode(mode);
  }

  return (
    <div className="space-y-6 sm:space-y-10">
      <BlurFade>
        <header className="space-y-2 text-center sm:space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold tracking-wider text-[#BE185D] uppercase shadow-sm">
            <Sparkle className="size-3" />
            Step 1 of 2
          </span>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            How would you like your{" "}
            <AnimatedGradientText>service</AnimatedGradientText>?
          </h1>
          <p className="mx-auto max-w-xl text-sm text-[#5C2D48]/70 sm:text-base">
            Pick a service mode to start your order. You can change it later.
          </p>
        </header>
      </BlurFade>

      {confirmingSwitchTo && (
        <BlurFade>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm text-amber-900">
              Switching to{" "}
              <span className="font-semibold">
                {confirmingSwitchTo === "mobile" ? "Mobile" : "Walk-in"}
              </span>{" "}
              will clear your current cart ({cartItems.length}{" "}
              {cartItems.length === 1 ? "item" : "items"}). Continue?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-gradient-to-r from-[#EC4899] to-[#DB2777] text-white shadow-md hover:from-[#DB2777] hover:to-[#BE185D]"
                onClick={() => {
                  setServiceMode(confirmingSwitchTo);
                  navigateForMode(confirmingSwitchTo);
                  setConfirmingSwitchTo(null);
                }}
              >
                Yes, clear cart
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmingSwitchTo(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </BlurFade>
      )}

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {CARDS.map((card, idx) => {
          const isActive = currentMode === card.mode;
          const Icon = card.icon;
          return (
            <BlurFade key={card.mode} delay={100 + idx * 100}>
              <button
                type="button"
                onClick={() => choose(card.mode)}
                aria-pressed={isActive}
                className={`group relative flex h-full w-full flex-col overflow-hidden rounded-3xl border bg-white text-left shadow-[0_6px_22px_-12px_rgba(236,72,153,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-16px_rgba(236,72,153,0.5)] ${
                  isActive
                    ? "border-[#EC4899] ring-2 ring-[#EC4899]/30"
                    : "border-[#F8BBD0]/70 hover:border-[#F4A6CD]"
                }`}
              >
                {/* Image hero */}
                <div className="relative h-40 w-full overflow-hidden sm:h-52">
                  {card.image && SUPABASE_URL ? (
                    <Image
                      src={card.image}
                      alt={card.title}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                      unoptimized
                      priority={idx === 0}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FFE4EC] to-[#FFD1DC]">
                      <Icon className="size-12 text-[#EC4899]/70" />
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#3D1A2A]/55 via-[#3D1A2A]/10 to-transparent" />

                  {/* Floating icon badge */}
                  <span className="pmu-float-soft absolute top-4 left-4 inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-[0_6px_18px_-4px_rgba(236,72,153,0.6)]">
                    <Icon className="size-6" />
                  </span>

                  {/* Badge - top-right */}
                  {card.badge && (
                    <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[#BE185D] uppercase shadow-sm backdrop-blur">
                      <Tag className="size-3" />
                      {card.badge}
                    </span>
                  )}

                  {/* Title + tagline pinned over the bottom of the image */}
                  <div className="absolute right-5 bottom-4 left-5 text-white">
                    <p className="text-[11px] font-medium tracking-wider uppercase opacity-80">
                      {card.tagline}
                    </p>
                    <h2 className="text-3xl font-bold tracking-tight drop-shadow">
                      {card.title}
                    </h2>
                  </div>

                  {/* Active checkmark */}
                  {isActive && (
                    <span className="absolute right-4 bottom-4 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md">
                      <CheckCircle2 className="size-3" />
                      Selected
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-5 sm:gap-4 sm:px-6 sm:pt-5 sm:pb-6">
                  <p className="text-sm text-[#5C2D48]/80">{card.description}</p>

                  <ul className="space-y-2 text-sm text-[#3D1A2A]">
                    {card.bullets.map((b, i) => {
                      const BIcon = b.icon;
                      return (
                        <li
                          key={i}
                          className="flex items-center gap-2.5 rounded-xl bg-[#FFF5F8]/70 px-3 py-1.5 transition-colors group-hover:bg-[#FFE4EC]"
                        >
                          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-[#EC4899] shadow-sm">
                            <BIcon className="size-3.5" />
                          </span>
                          <span className="text-[13px]">{b.text}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-auto flex items-center justify-between border-t border-[#F8BBD0]/60 pt-4">
                    <div className="leading-tight">
                      <p className="text-[10px] font-medium tracking-widest text-[#5C2D48]/70 uppercase">
                        Starting at
                      </p>
                      <p className="pmu-animated-gradient-text text-xl font-bold">
                        {card.priceLabel}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all group-hover:gap-3 group-hover:from-[#DB2777] group-hover:to-[#BE185D]">
                      {card.ctaLabel}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </button>
            </BlurFade>
          );
        })}
      </div>
    </div>
  );
}
