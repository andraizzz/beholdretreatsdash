"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BeholdMark } from "@/components/behold-mark";

const links = [
  { href: "/", label: "Overview" },
  { href: "/channels/social", label: "Social" },
  { href: "/channels/seo", label: "SEO" },
  { href: "/channels/referrals", label: "Referrals" },
  { href: "/channels/direct", label: "Direct" },
  { href: "/applications", label: "Applications" },
  { href: "/competitors", label: "Competitors" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <BeholdMark className="h-4 w-auto text-[#d3a95c]" />
            <span className="font-heading text-xl tracking-tight">
              Behold <span className="text-muted-foreground">Analytics</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md transition-colors",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="text-xs text-muted-foreground">
          Weekly review
        </div>
      </div>
    </header>
  );
}
