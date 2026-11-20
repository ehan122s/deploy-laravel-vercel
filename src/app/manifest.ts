import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BRILink Management",
    short_name: "BRILink",
    description: "Sistem Pembukuan, Pencatatan Transaksi & Monitoring Keuangan Agen BRILink Multi-Cabang",
    start_url: "/",
    id: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "window-controls-overlay"],
    orientation: "any",
    background_color: "#001D40",
    theme_color: "#002D62",
    lang: "id",
    categories: ["finance", "business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Input Transaksi Baru",
        short_name: "Input Trx",
        description: "Buka form input transaksi kasir",
        url: "/cashier/transaction",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Dashboard Owner",
        short_name: "Dashboard",
        description: "Pantau saldo dan keuntungan cabang",
        url: "/owner",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Laporan Keuangan",
        short_name: "Laporan",
        description: "Lihat dan ekspor laporan keuangan",
        url: "/owner/reports",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
