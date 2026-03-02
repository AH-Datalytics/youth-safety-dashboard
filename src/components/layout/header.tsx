"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTIONS } from "@/lib/constants";

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Check exact page match first (avoids /cfs-311/requests matching "cfs-311" section instead of "311")
  const activeSection = SECTIONS.find(
    (s) => s.pages.some((p) => pathname === p.href),
  ) ?? SECTIONS.find(
    (s) => pathname.startsWith(`/${s.id}`),
  );

  return (
    <header className="bg-primary text-white relative z-[1100]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="/lsja-logo.png"
            alt="Lone Star Justice Alliance"
            width={120}
            height={45}
            className="h-8 w-auto brightness-0 invert"
            priority
          />
          <span className="hidden sm:inline font-serif font-bold text-base md:text-lg">
            Dallas Youth Safety Dashboard
          </span>
        </Link>

        {/* Desktop section nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              "px-3 py-1.5 text-sm rounded transition-colors",
              pathname === "/" ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/5",
            )}
          >
            Home
          </Link>
          {SECTIONS.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className={cn(
                "px-3 py-1.5 text-sm rounded transition-colors",
                activeSection?.id === section.id
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/5",
              )}
            >
              {section.label}
            </Link>
          ))}
          <Link
            href="/about"
            className={cn(
              "px-3 py-1.5 text-sm rounded transition-colors",
              pathname === "/about" ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/5",
            )}
          >
            About
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-1"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Page tabs for active section (desktop) */}
      {activeSection && (
        <div className="hidden md:block bg-[#1A0F40] border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 flex gap-1">
            {activeSection.pages.map((page) => (
              <Link
                key={page.id}
                href={page.href}
                className={cn(
                  "px-4 py-2 text-sm transition-colors border-b-2",
                  pathname === page.href
                    ? "border-white text-white"
                    : "border-transparent text-white/60 hover:text-white hover:border-white/30",
                )}
              >
                {page.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-white/10 pb-3 bg-primary">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "block px-4 py-2.5 text-sm",
              pathname === "/" ? "text-white bg-white/10" : "text-white/70",
            )}
          >
            Home
          </Link>
          {SECTIONS.map((section) => (
            <div key={section.id}>
              <div className="px-4 pt-3 pb-1 text-xs font-bold text-white/40 uppercase tracking-wider">
                {section.label}
              </div>
              {section.pages.map((page) => (
                <Link
                  key={page.id}
                  href={page.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block px-6 py-2 text-sm",
                    pathname === page.href
                      ? "text-white bg-white/10"
                      : "text-white/70 hover:text-white",
                  )}
                >
                  {page.label}
                </Link>
              ))}
            </div>
          ))}
          <Link
            href="/about"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "block px-4 py-2.5 text-sm mt-2 border-t border-white/10",
              pathname === "/about" ? "text-white bg-white/10" : "text-white/70",
            )}
          >
            About
          </Link>
        </nav>
      )}
    </header>
  );
}
