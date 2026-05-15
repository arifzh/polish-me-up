import Link from "next/link";
import Image from "next/image";
import { LogIn, Sparkle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CartIndicator } from "@/components/customer/CartIndicator";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { SiteHeaderNav } from "@/components/shared/SiteHeaderNav";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader({ showCart = false }: { showCart?: boolean }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isManicurist = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isManicurist = profile?.role === "manicurist";
  }

  const confirmHref = isManicurist ? "/bookings" : "/my-bookings";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#F8BBD0]/60 bg-gradient-to-r from-[#FFF5F8]/95 via-white/90 to-[#FFE4EC]/95 backdrop-blur-md shadow-[0_2px_12px_-8px_rgba(244,143,177,0.35)]">
      <div className="grid h-14 w-full grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-6 md:h-20 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2 justify-self-start transition-transform hover:scale-[1.02] md:gap-3"
        >
          <div className="pmu-float-soft relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[0_4px_12px_-2px_rgba(244,143,177,0.5)] md:size-12">
            <Image
              src="/logo.png"
              alt="Polish Me Up Logo"
              fill
              className="object-cover"
            />
          </div>
          <span className="flex flex-col leading-tight">
            <span className="pmu-animated-gradient-text text-base font-bold tracking-tight md:text-xl">
              Polish Me Up!
            </span>
            <span className="hidden text-xs font-medium text-[#BE3D7E] sm:block">
              Shine Anywhere
            </span>
          </span>
        </Link>

        <div className="justify-self-center">
          <SiteHeaderNav confirmHref={confirmHref} />
        </div>

        <div className="flex items-center gap-1.5 justify-self-end md:gap-2">
          {showCart && (
            <div className="hidden md:inline-flex">
              <CartIndicator />
            </div>
          )}
          {user ? (
            <SignOutButton />
          ) : (
            <Button
              asChild
              size="sm"
              className="h-8 rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] px-3 text-white shadow-md transition-all hover:from-[#DB2777] hover:to-[#BE185D] hover:shadow-lg md:h-9 md:px-4"
            >
              <Link href="/login">
                <LogIn className="size-4" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
