"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, MessagesSquare, Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/documents": "Documents",
  "/chat": "Chat",
  "/search": "Semantic Search",
  "/settings": "Settings",
};

const MOBILE_NAV = [
  { href: "/", icon: LayoutDashboard },
  { href: "/documents", icon: FileText },
  { href: "/chat", icon: MessagesSquare },
  { href: "/search", icon: Search },
  { href: "/settings", icon: Settings },
];

export function Topbar() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Smart Document Assistant";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <h1 className="text-sm font-semibold text-foreground">{title}</h1>

      <nav className="flex items-center gap-1 md:hidden">
        {MOBILE_NAV.map(({ href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md",
              pathname === href ? "bg-primary/15 text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </Link>
        ))}
      </nav>
    </header>
  );
}
