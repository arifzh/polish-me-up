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
  LayoutDashboard,
  Package,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", Icon: CalendarDays },
  { href: "/customers", label: "Customers", Icon: Users },
  { href: "/items", label: "Items", Icon: Package },
  { href: "/sales", label: "Sales", Icon: Receipt },
  { href: "/availability", label: "Availability", Icon: Calendar },
];

export function SidebarNav() {
  const pathname = usePathname() ?? "";
  const activeIndex = navItems.findIndex(
    (it) => pathname === it.href || pathname.startsWith(`${it.href}/`),
  );

  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const targetIndex = clickedIndex ?? activeIndex;

  useEffect(() => {
    if (clickedIndex != null && activeIndex === clickedIndex) {
      setClickedIndex(null);
    }
  }, [activeIndex, clickedIndex]);

  const navRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null);
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
      top: elRect.top - navRect.top,
      height: elRect.height,
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
      className="relative flex-1 space-y-1 overflow-y-auto px-3 py-4"
    >
      {pill && (
        <span
          aria-hidden
          className={`pointer-events-none absolute top-0 left-3 right-3 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#DB2777] shadow-[0_6px_18px_-6px_rgba(236,72,153,0.55)] transition-[transform,height,opacity] duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] ${
            pillVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{
            transform: `translateY(${pill.top}px)`,
            height: pill.height,
          }}
        />
      )}

      {navItems.map(({ href, label, Icon }, i) => {
        const isTarget = i === targetIndex;
        return (
          <Link
            key={href}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            href={href}
            onClick={() => setClickedIndex(i)}
            aria-current={isTarget ? "page" : undefined}
            className={`relative z-10 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-300 ${
              isTarget
                ? "text-white"
                : "text-[#5C2D48] hover:bg-[#FFF5F8] hover:text-[#3D1A2A]"
            }`}
          >
            <Icon className="size-4" />
            <span className="flex-1">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
