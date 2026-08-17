import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

// Using the system font stack (defined in tailwind via `font-sans`/`font-mono`
// utility classes below) instead of next/font/google, so the app builds and
// renders correctly in fully offline / restricted-network environments too.

export const metadata: Metadata = {
  title: "Smart Document Assistant",
  description: "AI-powered document intelligence: chat, semantic search, and auto-visualization for PDFs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto scrollbar-thin">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
