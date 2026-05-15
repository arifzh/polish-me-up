"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  CheckCircle2,
  ClipboardList,
  Home,
  Package,
} from "lucide-react";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (p: string) => boolean;
};

type Pill = { left: number; width: number };

export function SiteHeaderNav({ confirmHref }: { confirmHref: string }) {
  const pathname = usePathname() ?? "/";

  const items: Item[] = [
    { href: "/", label: "Home", icon: Home, match: (p) => p === "/" },
    {
      href: "/order/start",
      label: "Order",
      icon: ClipboardList,
      match: (p) => p.startsWith("/order"),
    },
    {
      href: "/packages",
      label: "Packages",
      icon: Package,
      match: (p) => p.startsWith("/packages"),
    },
    {
      href: confirmHref,
      label: "My bookings",
      icon: CheckCircle2,
      match: (p) =>
        p.startsWith("/my-bookings") ||
        p.startsWith("/bookings") ||
        p.startsWith("/confirm"),
    },
  ];

  const activeIndex = items.findIndex((it) => it.match(pathname));
  // Optimistic index: as soon as the user clicks, the pill moves -
  // we don't wait for the route transition to complete.
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const targetIndex = clickedIndex ?? activeIndex;

  // Once the URL catches up to the clicked item, clear the optimistic state.
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
    <nav
      ref={navRef}
      className="relative hidden items-center gap-1 rounded-full bg-gradient-to-r from-[#FFE4EC] to-[#FFD1DC] p-1.5 shadow-inner md:flex"
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

      {items.map(({ href, label, icon: Icon }, i) => {
        const isTarget = i === targetIndex;
        return (
          <Link
            key={label}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            href={href}
            onClick={() => setClickedIndex(i)}
            className={`relative z-10 flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors duration-300 ${
              isTarget
                ? "text-white"
                : "text-[#5C2D48] hover:text-[#3D1A2A]"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
