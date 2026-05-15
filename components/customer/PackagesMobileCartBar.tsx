"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";

import { useCartStore } from "@/store/cartStore";

function getCartCount() {
  return useCartStore
    .getState()
    .items.reduce((sum, line) => sum + line.quantity, 0);
}

function getServerCartCount() {
  return 0;
}

export function PackagesMobileCartBar() {
  const count = useSyncExternalStore(
    useCartStore.subscribe,
    getCartCount,
    getServerCartCount,
  );

  if (count === 0) return null;

  return (
    <div
      className="fixed inset-x-0 z-30 border-t border-[#F8BBD0] bg-white/95 px-3 py-3 shadow-[0_-4px_18px_-8px_rgba(244,143,177,0.45)] backdrop-blur-md sm:hidden"
      style={{ bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <Link
        href="/order"
        className="flex h-12 items-center justify-between gap-2 rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] px-5 text-sm font-semibold text-white shadow-md transition-all active:scale-[0.98]"
      >
        <span className="inline-flex items-center gap-2">
          <ShoppingBag className="size-4" />
          {count} {count === 1 ? "item" : "items"} in cart
        </span>
        <span className="inline-flex items-center gap-1">
          Checkout
          <ArrowRight className="size-4" />
        </span>
      </Link>
    </div>
  );
}
