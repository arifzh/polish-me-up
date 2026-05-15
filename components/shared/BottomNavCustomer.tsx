"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  CalendarCheck,
  ClipboardList,
  Home,
  Package,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

import { useCartStore } from "@/store/cartStore";

type Item = {
  href: string;
  label: string;
  Icon: LucideIcon;
  match: (p: string) => boolean;
  withBadge?: boolean;
};

const ITEMS: Item[] = [
  { href: "/", label: "Home", Icon: Home, match: (p) => p === "/" },
  {
    href: "/order/start",
    label: "Order",
    Icon: ClipboardList,
    match: (p) => p === "/order/start" || p.startsWith("/order/address"),
  },
  {
    href: "/packages",
    label: "Packages",
    Icon: Package,
    match: (p) => p.startsWith("/packages"),
  },
  {
    href: "/my-bookings",
    label: "Bookings",
    Icon: CalendarCheck,
    match: (p) => p.startsWith("/my-bookings") || p.startsWith("/confirm"),
  },
  {
    href: "/order",
    label: "Cart",
    Icon: ShoppingBag,
    match: (p) => p === "/order",
    withBadge: true,
  },
];

type Pill = { left: number; width: number };

function getCartCount() {
  return useCartStore
    .getState()
    .items.reduce((sum, line) => sum + line.quantity, 0);
}

function getServerCartCount() {
  return 0;
}

export function BottomNavCustomer() {
  const pathname = usePathname() ?? "/";
  const count = useSyncExternalStore(
    useCartStore.subscribe,
    getCartCount,
    getServerCartCount,
  );

  const activeIndex = ITEMS.findIndex((it) => it.match(pathname));
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const targetIndex = clickedIndex ?? activeIndex;

  useEffect(() => {
    if (clickedIndex != null && activeIndex === clickedIndex) {
      setClickedIndex(null);
    }
  }, [activeIndex, clickedIndex]);

  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [pill, setPill] = useState<Pill | null>(null);
  const [pillVisible, setPillVisible] = useState(false);

  const measure = useCallback(() => {
    if (targetIndex < 0) {
      setPillVisible(false);
      return;
    }
    const el = itemRefs.current[targetIndex];
    const nav = navRef.current;
    if (!el || !nav) return;
    const elRect = el.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    setPill({
      left: elRect.left - navRect.left,
      width: elRect.width,
    });
    setPillVisible(true);
  }, [targetIndex]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => measure();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [measure]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3 md:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      <nav
        ref={navRef}
        aria-label="Primary"
        className="pointer-events-auto relative flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FFE4EC] to-[#FFD1DC] p-1.5 shadow-[0_16px_40px_-8px_rgba(61,26,42,0.45),0_6px_16px_-4px_rgba(61,26,42,0.35)] ring-1 ring-white/60 backdrop-blur"
      >
        {pill && (
          <span
            aria-hidden
            className={`pointer-events-none absolute top-1.5 bottom-1.5 left-0 rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] shadow-md transition-[transform,width,opacity] duration-700 ease-[cubic-bezier(0.34,1.4,0.64,1)] ${
              pillVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{
              transform: `translateX(${pill.left}px)`,
              width: pill.width,
            }}
          />
        )}

        {ITEMS.map(({ href, label, Icon, withBadge }, i) => {
          const isTarget = i === targetIndex;
          return (
            <Link
              key={label}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              href={href}
              onClick={() => setClickedIndex(i)}
              aria-current={isTarget ? "page" : undefined}
              aria-label={label}
              className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-medium transition-colors duration-300 ${
                isTarget ? "text-white" : "text-[#5C2D48]"
              }`}
            >
              <span className="relative inline-flex">
                <Icon className="size-4 shrink-0" />
                {withBadge && count > 0 && !isTarget && (
                  <span className="absolute -top-1.5 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EC4899] px-1 text-[9px] font-bold text-white shadow-sm">
                    {count}
                  </span>
                )}
              </span>
              {isTarget && (
                <span className="truncate text-[11px] font-semibold">
                  {label}
                  {withBadge && count > 0 ? ` · ${count}` : ""}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
