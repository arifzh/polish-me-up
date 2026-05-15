import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/manicurist/SidebarNav";
import { BottomNavManicurist } from "@/components/manicurist/BottomNavManicurist";
import { MobileTopBar } from "@/components/manicurist/MobileTopBar";
import { SignOutButton } from "@/components/shared/SignOutButton";

export default async function ManicuristLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "manicurist") {
    redirect("/login");
  }

  const initials =
    (profile.full_name ?? profile.email ?? "?")
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join("") || "M";

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#FFF5F8] via-[#FFE4EC] to-[#FFD1DC]/40 lg:flex-row lg:items-start">
      <MobileTopBar
        initials={initials}
        fullName={profile.full_name ?? profile.email ?? "Manicurist"}
        email={profile.email ?? null}
      />

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[#F8BBD0] bg-gradient-to-b from-white/95 to-[#FFF5F8]/80 backdrop-blur-sm lg:flex">
        <div className="border-b border-[#F8BBD0]/60 px-5 py-5">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02]"
          >
            <span className="pmu-float-soft flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-[0_4px_12px_-2px_rgba(236,72,153,0.5)]">
              <Sparkle className="size-4" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="pmu-animated-gradient-text text-base font-bold tracking-tight">
                Polish Me Up
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#BE3D7E]">
                Manicurist Studio
              </span>
            </span>
          </Link>
        </div>

        <div className="border-b border-[#F8BBD0]/60 px-5 py-4">
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-[#FFE4EC] to-[#FFD1DC] p-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-sm font-semibold text-white shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#3D1A2A]">
                {profile.full_name ?? "Manicurist"}
              </p>
              <p className="truncate text-[11px] text-[#5C2D48]/70">
                {profile.email}
              </p>
            </div>
          </div>
        </div>

        <SidebarNav />

        <div className="border-t border-[#F8BBD0]/60 p-3">
          <SignOutButton />
        </div>
      </aside>

      <main className="pmu-blur-fade is-visible flex-1 px-4 py-5 pb-24 lg:px-8 lg:py-8 lg:pb-8">
        {children}
      </main>

      <BottomNavManicurist />
    </div>
  );
}
