"use client";

import { useEffect } from "react";

import { useCartStore, type ServiceMode } from "@/store/cartStore";

export function CartModeSync({ mode }: { mode: ServiceMode }) {
  const setServiceMode = useCartStore((s) => s.setServiceMode);
  const currentMode = useCartStore((s) => s.serviceMode);

  useEffect(() => {
    if (currentMode !== mode) setServiceMode(mode);
  }, [mode, currentMode, setServiceMode]);

  return null;
}
