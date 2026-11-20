import Link from "next/link";
import { 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  Layers, 
  BarChart3, 
  CheckCircle2, 
  Sparkles,
  UserCheck,
  Smartphone,
  Download,
  Wifi,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between bg-slate-50">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#001D40] flex items-center justify-center p-1 shadow-md shadow-blue-900/20">
              <img src="/icons/icon-192x192.png" alt="Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-lg block leading-none">BRILink</span>
              <span className="text-xs text-blue-700 font-bold tracking-wide">MANAGEMENT PWA</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/install"
              className="hidden sm:inline-flex items-center justify-center px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
            >
              <Smartphone className="w-4 h-4 mr-1.5 text-emerald-600" />
              <span>Install di HP</span>
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#002D62] hover:bg-[#003B7E] rounded-xl shadow transition-colors"
            >
              <UserCheck className="w-4 h-4 mr-1.5" />
              <span>Masuk Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 flex-1 flex flex-col justify-center items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#002D62] text-xs font-bold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Progressive Web App (PWA) Multi-Cabang & Multi-User</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight max-w-4xl leading-tight">
          Sistem Pembukuan & Monitoring Keuangan BRILink <span className="text-[#002D62] underline decoration-emerald-500 decoration-4">Multi-Cabang</span>
        </h1>

        <p className="mt-5 text-sm sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
          Dirancang untuk HP Android, tablet, dan laptop. Pisahkan mutasi uang kas fisik (laci), saldo rekening bank (EDC), dan hitung laba bersih riil secara otomatis tanpa salah omzet.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-3 justify-center w-full max-w-md">
          <Link
            href="/login"
            className="flex-1 min-w-[160px] inline-flex items-center justify-center px-6 py-3.5 text-sm font-bold text-white bg-[#002D62] hover:bg-[#003B7E] active:scale-98 rounded-2xl shadow-xl shadow-blue-950/20 transition-all"
          >
            <span>Buka Dashboard</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>

          <Link
            href="/install"
            className="flex-1 min-w-[160px] inline-flex items-center justify-center px-6 py-3.5 text-sm font-bold text-slate-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 active:scale-98 rounded-2xl transition-all"
          >
            <Download className="w-4 h-4 mr-2 text-emerald-700" />
            <span>Install Aplikasi</span>
          </Link>
        </div>

        {/* Feature Grid Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-14 w-full text-left">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#002D62] flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">PWA Siap Install di HP</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dapat dipasang ke Home Screen Android/iOS tanpa PlayStore. Berjalan layar penuh (standalone) tanpa address bar browser.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Presisi Keuntungan Riil</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Laba = Biaya Admin Customer − Potongan Bank. Nominal transfer nasabah tidak dihitung sebagai keuntungan palsu.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">Dua Cabang Terintegrasi</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Monitoring Cabang 1 dan Cabang 2 secara real-time. Kasir hanya mengakses cabangnya, sedangkan Owner memantau keseluruhan.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>© 2026 BRILink Management System • Progressive Web App (PWA)</p>
      </footer>
    </main>
  );
}
