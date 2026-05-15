"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

export function MobileTopBarUserMenu({
  initials,
  fullName,
  email,
}: {
  initials: string;
  fullName: string;
  email: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${fullName}`}
        className="inline-flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-sm font-semibold text-white shadow-[0_4px_12px_-2px_rgba(236,72,153,0.5)] transition-transform active:scale-95"
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-60 rounded-xl border-[#F8BBD0] bg-white p-1.5"
      >
        <DropdownMenuLabel className="px-2 py-2">
          <p className="truncate text-sm font-semibold text-[#3D1A2A]">
            {fullName}
          </p>
          {email && (
            <p className="truncate text-[11px] font-normal text-[#5C2D48]/70">
              {email}
            </p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#F8BBD0]/60" />
        <DropdownMenuItem
          onSelect={() => handleSignOut()}
          className="cursor-pointer rounded-lg px-2 py-2.5 text-sm text-[#3D1A2A] data-[highlighted]:bg-[#FFF5F8] data-[highlighted]:text-[#BE185D]"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
