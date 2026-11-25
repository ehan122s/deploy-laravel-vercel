import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { BottomNav } from "./bottom-nav";
import { PWAProvider } from "@/components/pwa/pwa-provider";
import { InactivityTimer } from "@/components/auth/inactivity-timer";
import { OfflineNoticeBanner } from "@/components/pwa/offline-indicator";
import { InstallBanner } from "@/components/pwa/install-banner";
import { FloatingAIButton } from "@/components/ai/floating-ai-button";
import { getAIUserContext } from "@/lib/session-context";
import { getUnreadAlertCount } from "@/lib/ai/anomaly-detector";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: "OWNER" | "CASHIER";
  userName: string;
  branchName?: string | null;
  title: string;
  subtitle?: string;
  branches?: { id: string; name: string; code: string }[];
}

export async function DashboardShell({
  children,
  role,
  userName,
  branchName,
  title,
  subtitle,
  branches = [],
}: DashboardLayoutProps) {
  let unreadAlertCount = 0;
  if (role === "OWNER") {
    const ctx = await getAIUserContext();
    if (ctx) {
      unreadAlertCount = await getUnreadAlertCount(ctx);
    }
  }

  return (
    <PWAProvider>
      <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-800 antialiased select-none">
        {/* Security Auto-Logout on Inactivity */}
        <InactivityTimer />

        {/* Desktop Sidebar (hidden on mobile) */}
        <Sidebar role={role} userName={userName} branchName={branchName} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
          {/* Offline alert banner if internet disconnects */}
          <OfflineNoticeBanner />

          {/* Topbar */}
          <Topbar
            title={title}
            subtitle={subtitle}
            role={role}
            branchName={branchName}
            branches={branches}
          />

          {/* Body Content */}
          <main className="flex-1 p-3.5 sm:p-5 lg:p-6 overflow-y-auto">
            {/* Install PWA Banner (only shown if not yet installed in standalone) */}
            <InstallBanner />
            {children}
          </main>
        </div>

        {/* Floating BRILink AI Assistant Button */}
        <FloatingAIButton role={role} unreadAlertCount={unreadAlertCount} />

        {/* Mobile Bottom Navigation (shown on screens < md) */}
        <BottomNav role={role} />
      </div>
    </PWAProvider>
  );
}
