import { Sidebar } from "@/components/app/sidebar";
import { DemoBanner } from "@/components/shared/demo-banner";
import { TopBar } from "@/components/app/topbar";
import { BottomNav } from "@/components/app/bottom-nav";
import { MobileNavProvider } from "@/contexts/mobile-nav-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileNavProvider>
      <div className="flex flex-col h-screen">
        <DemoBanner />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-auto pb-16 lg:pb-0">{children}</main>
          </div>
        </div>
        <BottomNav />
      </div>
    </MobileNavProvider>
  );
}
