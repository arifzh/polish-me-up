import Link from "next/link";
import { Sparkle } from "lucide-react";

import { MobileTopBarUserMenu } from "@/components/manicurist/MobileTopBarUserMenu";

export function MobileTopBar({
  initials,
  fullName,
  email,
}: {
  initials: string;
  fullName: string;
  email: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#F8BBD0]/60 bg-gradient-to-r from-[#FFF5F8]/95 via-white/90 to-[#FFE4EC]/95 px-4 py-2.5 backdrop-blur-md shadow-[0_2px_12px_-8px_rgba(244,143,177,0.35)] lg:hidden">
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5"
      >
        <span className="pmu-float-soft inline-flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-[0_4px_12px_-2px_rgba(236,72,153,0.5)]">
          <Sparkle className="size-4" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="pmu-animated-gradient-text text-sm font-bold tracking-tight">
            Polish Me Up
          </span>
          <span className="text-[9px] font-medium uppercase tracking-wider text-[#BE3D7E]">
            Studio
          </span>
        </span>
      </Link>

      <MobileTopBarUserMenu
        initials={initials}
        fullName={fullName}
        email={email}
      />
    </header>
  );
}
