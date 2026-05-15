import { SiteHeader } from "@/components/shared/SiteHeader";
import { BottomNavCustomer } from "@/components/shared/BottomNavCustomer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#FFF5F8] via-[#FFE4EC] to-[#FFD1DC]/40">
      <SiteHeader showCart />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-24 md:py-8 md:pb-8 pmu-blur-fade is-visible">
        {children}
      </main>
      <BottomNavCustomer />
    </div>
  );
}
