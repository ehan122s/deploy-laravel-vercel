"use client";

import { useState, useEffect } from "react";
import {
  Download,
  CheckCircle2,
  Smartphone,
  Share2,
  MoreVertical,
  PlusSquare,
  ArrowLeft,
  Building2,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">("android");

  useEffect(() => {
    // Detect standalone mode
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Detect user agent
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform("ios");
    } else if (/android/.test(ua)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }

    // Capture install prompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-[#001D40] text-white px-4 py-4 sticky top-0 z-20 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-blue-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
            Panduan Instalasi PWA
          </span>
          <div className="w-12" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* App Showcase Card */}
        <div className="bg-gradient-to-br from-[#001D40] via-[#002D62] to-[#0A4384] text-white rounded-3xl p-6 shadow-xl text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-white p-2 mx-auto shadow-xl shadow-blue-950/40 flex items-center justify-center">
            <img
              src="/icons/icon-192x192.png"
              alt="BRILink Management Logo"
              className="w-16 h-16 rounded-xl object-contain"
            />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight">BRILink Management</h1>
            <p className="text-xs text-blue-200 mt-1 max-w-xs mx-auto">
              Aplikasi Pembukuan & Monitoring Keuangan Kasir Multi-Cabang untuk HP Android
            </p>
          </div>

          {/* If already installed */}
          {isStandalone || isInstalled ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center gap-2 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Aplikasi Sudah Terpasang di Perangkat Ini</span>
            </div>
          ) : deferredPrompt ? (
            /* Direct 1-Click Install Button if supported */
            <button
              onClick={handleInstallClick}
              className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-900 font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5 text-slate-900" />
              <span>INSTALL KE LAYAR UTAMA SEKARANG</span>
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-blue-900/50 border border-blue-400/20 text-blue-200 text-xs">
              Ikuti panduan di bawah untuk memasang ke Layar Utama HP Anda
            </div>
          )}
        </div>

        {/* Keunggulan PWA */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <Zap className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
            <p className="text-[11px] font-bold text-slate-800">Cepat & Ringan</p>
            <p className="text-[9px] text-slate-400 mt-0.5">&lt; 2 MB tanpa PlayStore</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <Smartphone className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
            <p className="text-[11px] font-bold text-slate-800">Layar Penuh</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Tanpa address bar browser</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
            <p className="text-[11px] font-bold text-slate-800">Aman & Terenkripsi</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Sesi privat per cabang</p>
          </div>
        </div>

        {/* Step-by-Step Installation Guides */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Smartphone className="w-5 h-5 text-[#002D62]" />
            <h2 className="text-sm font-bold text-slate-800">
              Cara Install di HP Android (Google Chrome & Samsung Browser)
            </h2>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-[#002D62] font-black flex items-center justify-center flex-shrink-0 text-xs">
                1
              </span>
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800">Buka Menu Browser</p>
                <p className="text-slate-500">
                  Tekan ikon <strong>Titik Tiga (⋮)</strong> di sudut kanan atas Google Chrome HP Anda.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-[#002D62] font-black flex items-center justify-center flex-shrink-0 text-xs">
                2
              </span>
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800">Pilih &quot;Install aplikasi&quot; atau &quot;Tambahkan ke Layar Utama&quot;</p>
                <p className="text-slate-500">
                  Cari menu bertuliskan <strong>&quot;Install aplikasi&quot;</strong> atau <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> (Add to Home screen).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-[#002D62] font-black flex items-center justify-center flex-shrink-0 text-xs">
                3
              </span>
              <div className="space-y-0.5">
                <p className="font-bold text-slate-800">Konfirmasi Pemasangan</p>
                <p className="text-slate-500">
                  Tekan tombol <strong>&quot;Install&quot;</strong> pada jendela pop-up konfirmasi yang muncul.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center flex-shrink-0 text-xs">
                4
              </span>
              <div className="space-y-0.5">
                <p className="font-bold text-emerald-800">Selesai! Ikon Muncul di HP Anda</p>
                <p className="text-slate-500">
                  Aplikasi <strong>BRILink Management</strong> sekarang dapat dibuka langsung dari layar beranda HP Anda layaknya aplikasi PlayStore.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Guide for iOS Safari */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Share2 className="w-4 h-4 text-slate-600" />
            <h2 className="text-xs font-bold text-slate-800">Panduan untuk iPhone / iPad (Safari)</h2>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600">
            <li>
              Buka aplikasi di <strong>Safari</strong>.
            </li>
            <li>
              Tekan tombol <strong>Share</strong> (ikon kotak dengan panah ke atas di bagian bawah layar).
            </li>
            <li>
              Gulir ke bawah dan pilih <strong>&quot;Add to Home Screen&quot; (Tambah ke Layar Utama)</strong>.
            </li>
            <li>
              Tekan <strong>&quot;Add&quot;</strong> di pojok kanan atas.
            </li>
          </ol>
        </div>

        {/* Back Link */}
        <div className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-[#002D62] text-white text-xs font-bold rounded-xl shadow transition-colors"
          >
            Masuk ke Akun Anda
          </Link>
        </div>
      </main>
    </div>
  );
}
