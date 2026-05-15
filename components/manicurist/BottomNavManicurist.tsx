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
  Calendar,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";

type PrimaryItem = {
  kind: "link";
  href: string;
  label: string;
  Icon: LucideIcon;
  matches: string[];
};

type MoreItem = {
  kind: "more";
  label: string;
  Icon: LucideIcon;
  matches: string[];
};

type Item = PrimaryItem | MoreItem;

type OverflowItem = {
  href: string;
  label: string;
  description: string;
  Icon: LucideIcon;
};

const OVERFLOW: OverflowItem[] = [
  {
    href: "/sales",
    label: "Sales",
    description: "Revenue, profit and CSV export",
    Icon: Receipt,
  },
  {
    href: "/availability",
    label: "Availability",
    description: "Weekly schedule and date overrides",
    Icon: Calendar,
  },
];

const OVERFLOW_HREFS = OVERFLOW.map((o) => o.href);

const ITEMS: Item[] = [
  {
    kind: "link",
    href: "/dashboard",
    label: "Home",
    Icon: LayoutDashboard,
    matches: ["/dashboard"],
  },
  {
    kind: "link",
    href: "/bookings",
    label: "Bookings",
    Icon: CalendarDays,
    matches: ["/bookings"],
  },
  {
    kind: "link",
    href: "/customers",
    label: "Customers",
    Icon: Users,
    matches: ["/customers"],
  },
  {
    kind: "link",
    href: "/items",
    label: "Items",
    Icon: Package,
    matches: ["/items"],
  },
  {
    kind: "more",
    label: "More",
    Icon: MoreHorizontal,
    matches: OVERFLOW_HREFS,
  },
];

type Pill = { left: number; width: number };

function isPathMatch(pathname: string, matches: string[]): boolean {
  return matches.some(
    (m) => pathname === m || pathname.startsWith(`${m}/`),
  );
}

export function BottomNavManicurist() {
  const pathname = usePathname() ?? "";
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeIndex = ITEMS.findIndex((it) => isPathMatch(pathname, it.matches));
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const targetIndex = clickedIndex ?? activeIndex;

  useEffect(() => {
    if (clickedIndex != null && activeIndex === clickedIndex) {
      setClickedIndex(null);
    }
  }, [activeIndex, clickedIndex]);

  // Close the sheet whenever the route changes (covers nav from inside the
  // sheet AND from anywhere else, e.g. the user typed a URL).
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  // Lock background scroll while the sheet is open.
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
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
    <>
      {/* Backdrop + slide-up sheet (mobile only) */}
      {sheetOpen && (
        <button
          type="button"
          aria-label="Close more menu"
          onClick={() => setSheetOpen(false)}
          className="fixed inset-0 z-30 bg-[#3D1A2A]/45 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label="More navigation"
        aria-hidden={!sheetOpen}
        className={`pointer-events-none fixed inset-x-3 z-40 transform-gpu transition-all duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] lg:hidden ${
          sheetOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
        style={{
          bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="pointer-events-auto rounded-2xl border border-[#F8BBD0] bg-white p-2 shadow-[0_16px_40px_-8px_rgba(61,26,42,0.45),0_6px_16px_-4px_rgba(61,26,42,0.35)]">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#BE185D]">
            More
          </p>
          <ul className="space-y-1">
            {OVERFLOW.map(({ href, label, description, Icon }) => {
              const active = isPathMatch(pathname, [href]);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setSheetOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors active:scale-[0.99] ${
                      active
                        ? "bg-gradient-to-r from-[#FFE4EC] to-[#FFD1DC]"
                        : "hover:bg-[#FFF5F8]"
                    }`}
                  >
                    <span
                      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${
                        active
                          ? "bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-sm"
                          : "bg-[#FFE4EC] text-[#BE185D]"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#3D1A2A]">
                        {label}
                      </p>
                      <p className="truncate text-[11px] text-[#5C2D48]/70">
                        {description}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-[#5C2D48]/50" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Floating pill bottom nav */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3 lg:hidden"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
        }}
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

          {ITEMS.map((item, i) => {
            const isTarget = i === targetIndex;
            const sharedClassName = `relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full px-1.5 py-2 text-xs font-medium transition-colors duration-300 ${
              isTarget ? "text-white" : "text-[#5C2D48]"
            }`;

            if (item.kind === "more") {
              const { Icon, label } = item;
              return (
                <button
                  key="more"
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  onClick={() => {
                    setClickedIndex(i);
                    setSheetOpen((v) => !v);
                  }}
                  aria-expanded={sheetOpen}
                  aria-haspopup="dialog"
                  aria-label={label}
                  className={sharedClassName}
                >
                  <Icon className="size-4 shrink-0" />
                  {isTarget && (
                    <span className="truncate text-[11px] font-semibold">
                      {label}
                    </span>
                  )}
                </button>
              );
            }

            const { href, label, Icon } = item;
            return (
              <Link
                key={href}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                href={href}
                onClick={() => {
                  setClickedIndex(i);
                  setSheetOpen(false);
                }}
                aria-current={isTarget ? "page" : undefined}
                aria-label={label}
                className={sharedClassName}
              >
                <Icon className="size-4 shrink-0" />
                {isTarget && (
                  <span className="truncate text-[11px] font-semibold">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
