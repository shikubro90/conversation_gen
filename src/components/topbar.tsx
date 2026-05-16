"use client";

import { usePathname } from "next/navigation";
import { Moon, Sun, Bell, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/dashboard": { title: "Dashboard", description: "Overview of your activity" },
  "/generate": { title: "Generate Conversation", description: "Create realistic buyer-seller dialogues" },
  "/preview": { title: "Preview", description: "Review your generated conversation" },
  "/settings": { title: "API Settings", description: "Manage your API keys and preferences" },
};

export function Topbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const page = pageTitles[pathname] ?? { title: "ConvoAI", description: "" };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
      <div>
        <h1 className="text-base font-semibold leading-none">{page.title}</h1>
        {page.description && (
          <p className="text-xs text-muted-foreground mt-1">{page.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
