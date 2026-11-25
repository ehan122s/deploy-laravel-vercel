"use client";

import { useState } from "react";
import { AIAlertsPayload } from "@/lib/ai/ai-types";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";

interface AIAlertsPanelProps {
  payload: AIAlertsPayload;
  userRole: "OWNER" | "CASHIER";
}

export function AIAlertsPanel({ payload, userRole }: AIAlertsPanelProps) {
  const [resolvedIds, setResolvedIds] = useState<Record<string, boolean>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleMark = async (alertId: string, action: "READ" | "RESOLVE") => {
    setLoadingId(alertId);
    try {
      const res = await fetch("/api/ai/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, action }),
      });
      if (res.ok && action === "RESOLVE") {
        setResolvedIds((prev) => ({ ...prev, [alertId]: true }));
      }
    } catch {
      // Ignore transient UI error
    } finally {
      setLoadingId(null);
    }
  };

  if (payload.alerts.length === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <span>Semua mutasi, saldo kas, dan saldo rekening berada dalam kondisi wajar.</span>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {payload.alerts.map((alert) => {
        if (resolvedIds[alert.id]) return null;

        const isCritical = alert.severity === "CRITICAL";
        const isWarning = alert.severity === "WARNING";

        return (
          <div
            key={alert.id}
            className={`rounded-2xl border p-3 text-xs space-y-1.5 ${
              isCritical
                ? "bg-red-50/80 border-red-200 text-red-900"
                : isWarning
                  ? "bg-amber-50/80 border-amber-200 text-amber-900"
                  : "bg-blue-50/80 border-blue-200 text-slate-800"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold">
                {isCritical ? (
                  <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                ) : isWarning ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
                <span>{alert.title}</span>
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/80 border border-current/20">
                {alert.severity}
              </span>
            </div>

            <p className="text-[11px] leading-relaxed opacity-90">{alert.description}</p>

            {userRole === "OWNER" && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={loadingId === alert.id}
                  onClick={() => handleMark(alert.id, "RESOLVE")}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-[10px] font-bold border border-slate-300 text-slate-700 transition-colors disabled:opacity-50"
                >
                  {loadingId === alert.id ? "Menyimpan..." : "Tandai Sudah Diperiksa"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
