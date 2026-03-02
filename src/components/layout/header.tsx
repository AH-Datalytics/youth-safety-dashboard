"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useJurisdiction } from "@/lib/jurisdiction-context";
import { getSections } from "@/lib/jurisdictions";

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const config = useJurisdiction();
  const sections = getSections(config);

  const homeHref = `/${config.id}`;
  const aboutHref = `/${config.id}/about`;

  // Check exact page match first (avoids /cfs-311/requests matching "cfs-311" section instead of "311")
  const activeSection = sections.find(
    (s) => s.pages.some((p) => pathname === p.href),
  ) ?? sections.find(
    (s) => pathname.startsWith(`/${config.id}/${s.id}`),
  );

  return (
    <header className="bg-black text-white relative z-[1100]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14">
        <Link href={homeHref} className="flex items-center gap-3 shrink-0">
          <Image
            src={config.logo}
            alt={config.org}
            width={120}
            height={45}
            className="h-8 w-auto invert"
            priority
          />
          <span className="hidden sm:inline font-serif font-bold text-base md:text-lg">
            {config.shortName} Youth Safety Dashboard
          </span>
        </Link>

        {/* Desktop section nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href={homeHref}
            className={cn(
              "px-3 py-1.5 text-sm rounded transition-colors",
              pathname === homeHref ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/5",
            )}
          >
            Home
          </Link>
          {sections.map((section) => (
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
            href={aboutHref}
            className={cn(
              "px-3 py-1.5 text-sm rounded transition-colors",
              pathname === aboutHref ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/5",
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
        <div className="hidden md:block bg-[#111111] border-t border-white/10">
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
        <nav className="md:hidden border-t border-white/10 pb-3 bg-black">
          <Link
            href={homeHref}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "block px-4 py-2.5 text-sm",
              pathname === homeHref ? "text-white bg-white/10" : "text-white/70",
            )}
          >
            Home
          </Link>
          {sections.map((section) => (
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
            href={aboutHref}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "block px-4 py-2.5 text-sm mt-2 border-t border-white/10",
              pathname === aboutHref ? "text-white bg-white/10" : "text-white/70",
            )}
          >
            About
          </Link>
        </nav>
      )}
    </header>
  );
}
