"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePWA } from "@/components/pwa/pwa-provider";
import { AIConversationSummary, AIMessageItem } from "@/lib/ai/ai-types";
import { AIReportCard } from "./ai-report-card";
import { AITransactionDraftCard } from "./ai-transaction-draft-card";
import { AIAlertsPanel } from "./ai-alerts-panel";
import {
  Bot,
  Send,
  Trash2,
  Plus,
  History,
  ArrowLeft,
  Sparkles,
  WifiOff,
  ShieldCheck,
  X,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

interface AIChatWorkspaceProps {
  role: "OWNER" | "CASHIER";
  userName: string;
  branchName?: string | null;
  initialConversations: AIConversationSummary[];
  initialConversationId: string | null;
  initialMessages: AIMessageItem[];
  initialPrompt?: string;
  unreadAlertCount?: number;
}

const OWNER_QUICK_PROMPTS = [
  "Ringkasan keuangan hari ini",
  "Berapa saldo Hani BRILink & Rahmat Berkah sekarang?",
  "Bandingkan kedua cabang bulan ini",
  "Keuntungan bersih bulan ini",
  "Periksa selisih saldo & anomali",
  "Buatkan laporan keuangan bulan ini",
];

const CASHIER_QUICK_PROMPTS = [
  "Ringkasan transaksi hari ini",
  "Berapa keuntungan saya hari ini?",
  "Berapa saldo kas & rekening cabang sekarang?",
  "Riwayat transaksi terbaru",
  "Saya mau input transfer 1 juta, admin 10 ribu dan potongan bank 5 ribu",
];

function renderFormattedLine(line: string, lineIdx: number) {
  const tokens = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <span key={lineIdx} className="block min-h-[1.25em]">
      {tokens.map((tok, i) => {
        if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4) {
          return (
            <strong key={i} className="font-bold">
              {tok.slice(2, -2)}
            </strong>
          );
        }
        if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2) {
          return (
            <em key={i} className="italic opacity-90">
              {tok.slice(1, -1)}
            </em>
          );
        }
        return <span key={i}>{tok}</span>;
      })}
    </span>
  );
}

export function AIChatWorkspace({
  role,
  userName,
  branchName,
  initialConversations,
  initialConversationId,
  initialMessages,
  initialPrompt,
  unreadAlertCount = 0,
}: AIChatWorkspaceProps) {
  const { isOnline } = usePWA();
  const [conversations, setConversations] = useState<AIConversationSummary[]>(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<AIMessageItem[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const autoTriggeredRef = useRef(false);

  const dashboardHref = role === "OWNER" ? "/owner" : "/cashier";
  const quickPrompts = role === "OWNER" ? OWNER_QUICK_PROMPTS : CASHIER_QUICK_PROMPTS;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const refreshConversations = async (selectId?: string | null) => {
    try {
      const url = selectId
        ? `/api/ai/conversations?conversationId=${encodeURIComponent(selectId)}`
        : "/api/ai/conversations";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations || []);
      if (selectId !== undefined) {
        setActiveConvId(data.activeConversationId || null);
        setMessages(data.messages || []);
      }
    } catch {
      // Ignore refresh failure
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isSending) return;
    if (!isOnline) {
      setErrorMsg("Koneksi terputus. BRILink AI membutuhkan internet untuk membaca database aktual.");
      return;
    }

    setErrorMsg(null);
    if (!overrideText) setInput("");
    setIsSending(true);

    // Optimistic local user bubble
    const tempUserId = `temp-user-${Date.now()}`;
    const optimisticMsg: AIMessageItem = {
      id: tempUserId,
      conversationId: activeConvId || "pending",
      role: "user",
      content: text,
      tokensUsed: 0,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: activeConvId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempUserId));
        setErrorMsg(data.error || "Gagal menghubungi BRILink AI Assistant.");
        setIsSending(false);
        return;
      }

      setActiveConvId(data.conversationId);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserId),
        data.userMessage,
        data.assistantMessage,
      ]);
      refreshConversations(undefined);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserId));
      setErrorMsg("Terjadi gangguan jaringan saat mengirim pertanyaan.");
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (initialPrompt && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      setActiveConvId(null);
      setMessages([]);
      handleSend(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setErrorMsg(null);
    setShowHistoryDrawer(false);
  };

  const handleSelectConversation = async (convId: string) => {
    setShowHistoryDrawer(false);
    setErrorMsg(null);
    await refreshConversations(convId);
  };

  const handleDeleteHistory = async (convId?: string) => {
    try {
      const url = convId
        ? `/api/ai/conversations?conversationId=${encodeURIComponent(convId)}`
        : "/api/ai/conversations";
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        setConfirmClearAll(false);
        if (!convId || convId === activeConvId) {
          setActiveConvId(null);
          setMessages([]);
        }
        await refreshConversations(undefined);
      }
    } catch {
      setErrorMsg("Gagal menghapus riwayat percakapan.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-138px)] md:h-[calc(100vh-145px)] bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden relative">
      {/* Top Chat Toolbar */}
      <div className="bg-gradient-to-r from-[#001D40] to-[#002D62] text-white px-3.5 sm:px-5 py-3 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href={dashboardHref}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow">
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-extrabold truncate">BRILink AI Assistant</h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                <ShieldCheck className="w-3 h-3" />
                Data Aktual DB
              </span>
            </div>
            <p className="text-[11px] text-blue-200 truncate">
              {role === "OWNER" ? "Akses Owner (Hani BRILink & Rahmat Berkah)" : `Kasir • ${branchName || "Cabang"}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {role === "OWNER" && unreadAlertCount > 0 && (
            <button
              type="button"
              onClick={() => handleSend("Periksa selisih saldo dan anomali terbaru")}
              className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-extrabold flex items-center gap-1 shadow transition-colors"
              title="Peringatan Sistem"
            >
              <span>{unreadAlertCount} Alert</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowHistoryDrawer((prev) => !prev)}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Riwayat Percakapan"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Riwayat ({conversations.length})</span>
          </button>

          <button
            type="button"
            onClick={handleNewChat}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-colors"
            title="Percakapan Baru"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Baru</span>
          </button>
        </div>
      </div>

      {/* Main Content Area + Slide History Drawer */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Conversation History Drawer */}
        {showHistoryDrawer && (
          <div className="absolute inset-y-0 left-0 z-20 w-72 sm:w-80 bg-slate-50 border-r border-slate-200 flex flex-col shadow-xl">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Riwayat Percakapan
              </span>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {conversations.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  Belum ada riwayat percakapan.
                </p>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      c.id === activeConvId
                        ? "bg-blue-50 border-blue-200 text-[#002D62]"
                        : "bg-white border-slate-200 hover:border-blue-200 text-slate-700"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectConversation(c.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-xs font-bold truncate flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                        <span className="truncate">{c.title}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(c.updatedAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHistory(c.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      title="Hapus percakapan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {conversations.length > 0 && (
              <div className="p-3 border-t border-slate-200 bg-white">
                {!confirmClearAll ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(true)}
                    className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Semua Riwayat</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-red-700 text-center">
                      Yakin hapus seluruh riwayat chat Anda?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmClearAll(false)}
                        className="flex-1 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHistory()}
                        className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold"
                      >
                        Ya, Hapus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/70">
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
            {messages.length === 0 ? (
              <div className="max-w-2xl mx-auto py-4 sm:py-8 space-y-5">
                <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 text-center space-y-2 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#002D62] flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Halo, {userName}!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                    {role === "OWNER"
                      ? "Tanyakan saldo Hani BRILink & Rahmat Berkah, analisis laba bersih, pemeriksaan selisih saldo, atau buat laporan keuangan siap cetak."
                      : `Tanyakan saldo ${branchName || "cabang Anda"}, ringkasan keuntungan hari ini, riwayat transaksi, atau bantu siapkan draft input transaksi.`}
                  </p>
                </div>

                {/* Quick Prompts */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
                    Pertanyaan Cepat:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        className="text-left p-3 rounded-2xl bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 text-xs font-semibold text-slate-700 hover:text-[#002D62] transition-all shadow-xs active:scale-[0.99]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[92%] sm:max-w-[82%] rounded-3xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                        isUser
                          ? "bg-[#002D62] text-white rounded-br-md"
                          : "bg-white text-slate-800 border border-slate-200 rounded-bl-md"
                      }`}
                    >
                      {!isUser && (
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider mb-1">
                          <Bot className="w-3.5 h-3.5" />
                          <span>BRILink AI Assistant</span>
                        </div>
                      )}

                      <div className="space-y-0.5 break-words">
                        {msg.content.split("\n").map((line, idx) => renderFormattedLine(line, idx))}
                      </div>

                      {/* Embedded Structured Cards */}
                      {!isUser && msg.structuredData?.kind === "report" && (
                        <AIReportCard report={msg.structuredData} />
                      )}
                      {!isUser && msg.structuredData?.kind === "transaction_draft" && (
                        <AITransactionDraftCard draft={msg.structuredData} userRole={role} />
                      )}
                      {!isUser && msg.structuredData?.kind === "alerts" && (
                        <AIAlertsPanel payload={msg.structuredData} userRole={role} />
                      )}

                      <p
                        className={`text-[10px] mt-1.5 ${
                          isUser ? "text-blue-200 text-right" : "text-slate-400"
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-3xl rounded-bl-md px-4 py-3 shadow-xs flex items-center gap-2 text-xs text-slate-600">
                  <div className="w-4 h-4 border-2 border-[#002D62]/20 border-t-[#002D62] rounded-full animate-spin" />
                  <span>BRILink AI sedang membaca data aktual database...</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 max-w-xl mx-auto">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Horizontal Chips when conversation has messages */}
          {messages.length > 0 && (
            <div className="px-3.5 py-2 border-t border-slate-200/70 bg-white flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {quickPrompts.slice(0, 4).map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={isSending}
                  onClick={() => handleSend(q)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 text-[11px] font-semibold text-slate-700 hover:text-[#002D62] whitespace-nowrap transition-colors flex-shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2 flex-shrink-0"
          >
            {!isOnline && (
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 flex items-center gap-1 text-[11px] font-bold flex-shrink-0">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending || !isOnline}
              placeholder={
                isOnline
                  ? "Ketik pertanyaan keuangan BRILink Anda..."
                  : "Sambungkan internet untuk bertanya ke AI..."
              }
              className="flex-1 min-w-0 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#002D62] focus:bg-white transition-all disabled:opacity-60"
            />

            <button
              type="submit"
              disabled={!input.trim() || isSending || !isOnline}
              className="p-3 sm:px-5 sm:py-3 rounded-2xl bg-[#002D62] hover:bg-[#003B7E] active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Kirim</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
