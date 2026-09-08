"use client";

import { Info } from "lucide-react";
import { useJurisdiction } from "@/lib/jurisdiction-context";
import type { DomainId } from "@/lib/jurisdictions";

interface DataNoticeProps {
  /** Domain whose notice to render, if the jurisdiction defines one. */
  domain: DomainId;
}

/**
 * Renders the jurisdiction's notice for a domain whose source data isn't
 * available yet. A page can be routed and laid out before its data exists;
 * this states why it's empty so the page doesn't read as broken.
 *
 * Renders nothing when the jurisdiction has no notice for the domain.
 */
export function DataNotice({ domain }: DataNoticeProps) {
  const config = useJurisdiction();
  const message = config.dataNotices?.[domain];
  if (!message) return null;

  return (
    <div className="flex gap-3 rounded-lg border border-[#e0d9f5] bg-[#f5f3ff] p-4">
      <Info
        className="h-4 w-4 shrink-0 mt-0.5 text-primary"
        aria-hidden="true"
      />
      <div className="text-sm leading-relaxed text-[#4b4361]">
        <span className="font-semibold text-primary">
          No source data for {config.shortName} yet.
        </span>{" "}
        {message}
      </div>
    </div>
  );
}
