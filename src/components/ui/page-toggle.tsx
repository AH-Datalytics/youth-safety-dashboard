"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface PageToggleProps {
  pages: { label: string; href: string }[];
}

export function PageToggle({ pages }: PageToggleProps) {
  const pathname = usePathname();

  if (pages.length < 2) return null;

  return (
    <div className="flex items-center gap-2">
      {pages.map((page) => (
        <Link
          key={page.href}
          href={page.href}
          className={cn(
            "px-3 py-1.5 text-xs rounded border transition-colors",
            pathname === page.href
              ? "bg-primary text-white border-primary"
              : "bg-white text-foreground border-border hover:bg-muted",
          )}
        >
          {page.label}
        </Link>
      ))}
    </div>
  );
}
