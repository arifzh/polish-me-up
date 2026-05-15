"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cartStore";

export function AddToCartButton({
  itemId,
  label = "Add to booking",
}: {
  itemId: string;
  label?: string;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    addItem(itemId);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <Button
      type="button"
      onClick={handleAdd}
      aria-live="polite"
      className={`group/cta w-full rounded-full font-semibold text-white shadow-[0_4px_14px_-4px_rgba(236,72,153,0.6)] transition-all duration-200 ${
        justAdded
          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
          : "bg-gradient-to-r from-[#EC4899] to-[#DB2777] hover:from-[#DB2777] hover:to-[#BE185D] hover:shadow-[0_8px_20px_-4px_rgba(236,72,153,0.7)]"
      }`}
    >
      {justAdded ? (
        <Check className="size-4" />
      ) : (
        <Plus className="size-4 transition-transform group-hover/cta:rotate-90" />
      )}
      {justAdded ? "Added to cart" : label}
    </Button>
  );
}
