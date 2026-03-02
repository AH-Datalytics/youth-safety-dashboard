"use client";

import { useJurisdiction } from "@/lib/jurisdiction-context";

export function Footer() {
  const config = useJurisdiction();

  return (
    <footer className="border-t border-[#d4d4d4] bg-white py-4 px-4 text-center">
      <p className="text-xs text-[#666]">
        Built for the{" "}
        <span className="font-semibold text-primary">{config.org}</span>
        {" "}&middot;{" "}
        Powered by{" "}
        <a
          href="https://ahdatalytics.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary hover:underline"
        >
          AH Datalytics
        </a>
      </p>
    </footer>
  );
}
