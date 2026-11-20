import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#002D62",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents accidental zooming on input taps on mobile
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "BRILink Management - Aplikasi Pembukuan Keuangan Agen",
  description: "Sistem Pembukuan, Pencatatan Transaksi & Monitoring Keuangan Agen BRILink Multi-Cabang",
  applicationName: "BRILink Management",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BRILink",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900 selection:bg-[#002D62] selection:text-white">
        {children}
      </body>
    </html>
  );
}
