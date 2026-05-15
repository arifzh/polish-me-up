import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Home,
  Plus as PlusIcon,
  Sparkle,
  Sparkles,
  Store,
  Tag,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/customer/AddToCartButton";
import { CartModeSync } from "@/components/customer/CartModeSync";
import { ImageCarousel } from "@/components/customer/ImageCarousel";
import { PackagesMobileCartBar } from "@/components/customer/PackagesMobileCartBar";
import { createClient } from "@/lib/supabase/server";
import { formatMYR } from "@/lib/utils/formatPrice";
import type { Tables } from "@/types/database.types";

type Item = Pick<
  Tables<"items">,
  | "id"
  | "name"
  | "description"
  | "price"
  | "duration_min"
  | "category"
  | "photo_urls"
>;

function ItemCard({
  item,
  variant,
}: {
  item: Item;
  variant: "package" | "addon";
}) {
  const isPackage = variant === "package";
  const photos = (item.photo_urls ?? []).filter(Boolean);
  const imageHeight = isPackage ? "h-52" : "h-40";

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[#F8BBD0]/70 bg-white shadow-[0_4px_18px_-12px_rgba(236,72,153,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-[#F4A6CD] hover:shadow-[0_18px_38px_-16px_rgba(236,72,153,0.45)]`}
    >
      {/* Hero image / carousel */}
      <div className={`relative ${imageHeight} w-full overflow-hidden`}>
        {photos.length > 0 ? (
          <ImageCarousel
            images={photos}
            alt={item.name}
            className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FFE4EC] to-[#FFD1DC]">
            {isPackage ? (
              <Sparkles className="size-12 text-[#EC4899]/70" />
            ) : (
              <PlusIcon className="size-8 text-[#EC4899]/70" />
            )}
          </div>
        )}

        {/* Bottom gradient for legibility of any badges/overlays */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#3D1A2A]/35 via-transparent to-transparent" />

        {/* Category chip - top-left */}
        <span
          className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-sm backdrop-blur ${
            isPackage
              ? "bg-white/90 text-[#BE185D]"
              : "bg-white/85 text-[#5C2D48]"
          }`}
        >
          {isPackage ? (
            <Sparkle className="size-3" />
          ) : (
            <Tag className="size-3" />
          )}
          {isPackage ? "Package" : "Add-on"}
        </span>

        {/* Duration chip - top-right (only when set) */}
        {item.duration_min != null && item.duration_min > 0 && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#3D1A2A] shadow-sm backdrop-blur">
            <Clock className="size-3 text-[#EC4899]" />
            {item.duration_min} min
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 px-5 pt-4 pb-5">
        <div className="space-y-1">
          <h3
            className={`leading-tight font-semibold text-[#3D1A2A] ${
              isPackage ? "text-lg" : "text-base"
            }`}
          >
            {item.name}
          </h3>
          {item.description && (
            <p className="line-clamp-2 text-sm text-[#5C2D48]/75">
              {item.description}
            </p>
          )}
        </div>

        <div className="mt-auto flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold tracking-widest text-[#5C2D48]/60 uppercase">
            MYR
          </span>
          <span
            className={`pmu-animated-gradient-text font-bold tracking-tight ${
              isPackage ? "text-3xl" : "text-2xl"
            }`}
          >
            {Number(item.price).toFixed(2)}
          </span>
        </div>

        <AddToCartButton itemId={item.id} />
      </div>
    </article>
  );
}

type SearchParams = { mode?: string };

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { mode: rawMode } = await searchParams;
  const mode = rawMode === "walkin" || rawMode === "mobile" ? rawMode : null;

  if (!mode) {
    redirect("/order/start");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("items")
    .select(
      "id, name, description, price, duration_min, category, service_mode, photo_urls",
    )
    .eq("is_active", true)
    .in("service_mode", [mode, "both"])
    .order("price", { ascending: true });

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Failed to load packages: {error.message}
      </p>
    );
  }

  const items = data ?? [];
  const packages = items.filter((item) => item.category === "package");
  const addons = items.filter((item) => item.category === "addon");

  const modeLabel = mode === "walkin" ? "Walk-in" : "Mobile";
  const ModeIcon = mode === "walkin" ? Store : Home;

  return (
    <div className="space-y-8 pb-20 sm:space-y-12 sm:pb-0">
      <CartModeSync mode={mode} />

      <div className="space-y-3">
        <Link
          href="/order/start"
          className="inline-flex items-center gap-1.5 text-sm text-[#EC4899] hover:underline"
        >
          <ArrowLeft className="size-4" />
          Change service mode
        </Link>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#EC4899] sm:text-3xl md:text-4xl">
              Our menu
            </h1>
            <p className="text-sm text-[#3D1A2A]/70 sm:text-base">
              Pick a package, add any extras, then head to checkout.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#EC4899]/10 px-3 py-1 text-sm font-medium text-[#EC4899]">
            <ModeIcon className="size-4" />
            {modeLabel} pricing
          </span>
        </header>
      </div>

      <section className="space-y-5">
        <div className="flex items-baseline justify-between gap-3 border-b border-[#F8BBD0]/60 pb-2">
          <h2 className="text-xl font-semibold tracking-tight text-[#3D1A2A] sm:text-2xl">
            Packages
          </h2>
          <span className="text-xs font-medium text-[#5C2D48]/70">
            {packages.length} option{packages.length === 1 ? "" : "s"}
          </span>
        </div>
        {packages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#F8BBD0] bg-white/60 p-6 text-center text-sm text-[#5C2D48]/70">
            No packages available for {modeLabel.toLowerCase()} right now.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg) => (
              <ItemCard key={pkg.id} item={pkg} variant="package" />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5">
        <div className="flex items-baseline justify-between gap-3 border-b border-[#F8BBD0]/60 pb-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[#3D1A2A] sm:text-2xl">
              Add-ons
            </h2>
            <p className="text-xs text-[#5C2D48]/70">
              Optional extras to pair with your package.
            </p>
          </div>
          <span className="text-xs font-medium text-[#5C2D48]/70">
            {addons.length} option{addons.length === 1 ? "" : "s"}
          </span>
        </div>
        {addons.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#F8BBD0] bg-white/60 p-6 text-center text-sm text-[#5C2D48]/70">
            No add-ons available right now.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {addons.map((addon) => (
              <ItemCard key={addon.id} item={addon} variant="addon" />
            ))}
          </div>
        )}
      </section>

      <div className="hidden rounded-3xl border border-[#F8BBD0] bg-gradient-to-r from-[#FFE4EC] via-white to-[#FFE4EC] p-6 text-center shadow-sm sm:block">
        <p className="text-sm text-[#3D1A2A]/80">
          Done picking? Head to checkout to set a date, time, and confirm.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-4 rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] px-6 text-white shadow-md hover:from-[#DB2777] hover:to-[#BE185D] hover:shadow-lg"
        >
          <Link href="/order">Continue to checkout</Link>
        </Button>
      </div>

      <PackagesMobileCartBar />
    </div>
  );
}
