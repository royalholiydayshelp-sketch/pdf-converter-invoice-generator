"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/app-shell";
import { CommandPalette } from "@/components/layout/command-palette";
import { DbInitializer } from "@/components/layout/db-initializer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <DbInitializer />
      <AppShell>{children}</AppShell>
      <CommandPalette />
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
