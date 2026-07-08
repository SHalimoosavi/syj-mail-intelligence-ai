import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "SYJ Mail Intelligence AI",
  description: "Signal console for the SYJ Mail Intelligence AI assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Loaded at runtime in the browser, not at build time — keeps `next
            build` working offline (Termux, CI, air-gapped VPS). Falls back
            to the system stacks in tailwind.config.ts if this can't reach
            Google Fonts. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body bg-base text-text antialiased">
        <div className="flex">
          <Sidebar />
          <main className="min-h-screen flex-1 bg-base">{children}</main>
        </div>
      </body>
    </html>
  );
}
