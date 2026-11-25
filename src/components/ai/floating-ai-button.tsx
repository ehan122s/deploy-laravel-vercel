"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot } from "lucide-react";

interface FloatingAIButtonProps {
  role: "OWNER" | "CASHIER";
  unreadAlertCount?: number;
}

export function FloatingAIButton({ role, unreadAlertCount = 0 }: FloatingAIButtonProps) {
  const pathname = usePathname();
  const targetHref = role === "OWNER" ? "/owner/ai" : "/cashier/ai";

  // Hide when already inside the AI Assistant screen
  if (pathname === "/owner/ai" || pathname === "/cashier/ai") {
    return null;
  }

  return (
    <Link
      href={targetHref}
      aria-label="Buka BRILink AI Assistant"
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 group flex items-center gap-2 px-3.5 py-3 rounded-full bg-gradient-to-r from-[#002D62] to-[#0A4384] hover:from-[#003B7E] hover:to-[#0C52A0] text-white shadow-xl shadow-blue-950/30 border border-blue-400/30 active:scale-95 transition-all"
    >
      <div className="relative flex items-center justify-center">
        <Bot className="w-5 h-5 text-emerald-400" />
        {unreadAlertCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black flex items-center justify-center">
            {unreadAlertCount > 9 ? "9+" : unreadAlertCount}
          </span>
        )}
      </div>
      <span className="text-xs font-extrabold tracking-tight pr-0.5">AI Assistant</span>
    </Link>
  );
}
