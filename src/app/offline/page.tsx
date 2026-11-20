"use client";

import { WifiOff, RefreshCw, ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001633] via-[#002D62] to-[#0A4384] flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-5 border border-slate-100">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <WifiOff className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Koneksi Terputus</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Perangkat Anda sedang dalam kondisi offline. Sistem pembukuan BRILink memerlukan koneksi internet untuk
            memvalidasi saldo dan memproses transaksi secara aman.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <span>Keamanan Finansial Terjamin</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Tidak ada transaksi ganda atau data yang hilang. Silakan periksa jaringan Wi-Fi atau paket data seluler
            Anda.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={handleRetry}
            className="w-full py-3 px-4 bg-[#002D62] hover:bg-[#003B7E] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-950/20 transition-all active:scale-98"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Coba Hubungkan Kembali</span>
          </button>

          <Link
            href="/login"
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Masuk</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
