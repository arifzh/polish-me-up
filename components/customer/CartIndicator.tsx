"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ShoppingBag } from "lucide-react";

import { useCartStore } from "@/store/cartStore";

function getCartCount() {
  return useCartStore
    .getState()
    .items.reduce((sum, line) => sum + line.quantity, 0);
}

function getServerCartCount() {
  return 0;
}

export function CartIndicator() {
  const count = useSyncExternalStore(
    useCartStore.subscribe,
    getCartCount,
    getServerCartCount,
  );

  return (
    <Link
      href="/order"
      className="relative inline-flex items-center justify-center rounded-md p-2 text-[#3D1A2A] hover:bg-[#FFF5F8]"
      aria-label={count > 0 ? `Cart with ${count} items` : "Cart"}
    >
      <ShoppingBag className="size-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EC4899] px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
