import type { LucideIcon } from "lucide-react";

type StatsCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  accent?: "rose" | "amber" | "emerald" | "violet";
};

const ACCENT_STYLES: Record<NonNullable<StatsCardProps["accent"]>, string> = {
  rose: "from-[#EC4899] to-[#DB2777] shadow-[0_8px_20px_-8px_rgba(236,72,153,0.55)]",
  amber: "from-[#F59E0B] to-[#D97706] shadow-[0_8px_20px_-8px_rgba(217,119,6,0.55)]",
  emerald:
    "from-[#10B981] to-[#059669] shadow-[0_8px_20px_-8px_rgba(16,185,129,0.55)]",
  violet:
    "from-[#A855F7] to-[#7C3AED] shadow-[0_8px_20px_-8px_rgba(168,85,247,0.55)]",
};

export function StatsCard({
  label,
  value,
  icon: Icon,
  subtext,
  accent = "rose",
}: StatsCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[#F8BBD0] bg-white/90 p-3 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_-12px_rgba(236,72,153,0.3)] sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#5C2D48]/70 sm:text-[11px]">
            {label}
          </p>
          <p className="truncate text-lg font-bold tracking-tight text-[#3D1A2A] sm:text-2xl md:text-3xl">
            {value}
          </p>
          {subtext && (
            <p className="text-[10px] text-[#5C2D48]/70 sm:text-xs">{subtext}</p>
          )}
        </div>
        <span
          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br sm:size-11 ${ACCENT_STYLES[accent]} text-white transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className="size-4 sm:size-5" />
        </span>
      </div>
      <div className="pointer-events-none absolute -right-12 -bottom-12 size-32 rounded-full bg-gradient-to-br from-[#FFE4EC] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </div>
  );
}
