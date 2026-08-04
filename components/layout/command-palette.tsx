"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  ArrowLeftRight,
  FileText,
  Receipt,
  Settings,
  Search,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useUIStore } from "@/store";

const pages = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Upload CSV", href: "/upload", icon: Upload },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Statements", href: "/statements", icon: FileText },
  { label: "Invoices", href: "/invoices", icon: Receipt },
  { label: "Create Invoice", href: "/invoices/create", icon: Receipt },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function CommandPalette() {
  const router = useRouter();
  const { commandOpen, setCommandOpen } = useUIStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        router.push("/transactions");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, setCommandOpen]);

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {pages.map(({ label, href, icon: Icon }) => (
            <CommandItem
              key={href}
              onSelect={() => {
                setCommandOpen(false);
                router.push(href);
              }}
            >
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Shortcuts">
          <CommandItem disabled>
            <Search className="mr-2 h-4 w-4" />
            Press / to focus transactions
          </CommandItem>
          <CommandItem disabled>
            Ctrl+K — Open command palette
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
