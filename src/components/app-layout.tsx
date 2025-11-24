import { ReactNode } from "react";
import AppHeader from "@/components/app-header";
import MobileBottomNav from "@/components/mobile-bottom-nav";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="pt-16 md:pt-20 pb-24 md:pb-8 min-h-screen">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}