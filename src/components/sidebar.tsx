"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Eye,
  Settings,
  MessageSquareText,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/generate", label: "Generate", icon: Sparkles, badge: "New" },
  { href: "/preview", label: "Preview", icon: Eye },
  { href: "/settings", label: "API Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <MessageSquareText className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">ConvoAI</p>
          <p className="text-xs text-muted-foreground mt-0.5">Generator</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
            Menu
          </p>
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-all",
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  {label}
                </span>
                <span className="flex items-center gap-1">
                  {badge && (
                    <Badge
                      variant={active ? "secondary" : "outline"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {badge}
                    </Badge>
                  )}
                  <ChevronRight
                    className={cn(
                      "w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity",
                      active && "opacity-70"
                    )}
                  />
                </span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            U
          </div>
          <div>
            <p className="text-xs font-medium leading-none">Pro Plan</p>
            <p className="text-xs text-muted-foreground mt-0.5">500 credits left</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
