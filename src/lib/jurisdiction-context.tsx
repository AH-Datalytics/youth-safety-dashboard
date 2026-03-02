"use client";

import { createContext, useContext } from "react";
import type { JurisdictionConfig } from "./jurisdictions";

const JurisdictionContext = createContext<JurisdictionConfig | null>(null);

export function JurisdictionProvider({
  config,
  children,
}: {
  config: JurisdictionConfig;
  children: React.ReactNode;
}) {
  return (
    <JurisdictionContext.Provider value={config}>
      {children}
    </JurisdictionContext.Provider>
  );
}

export function useJurisdiction(): JurisdictionConfig {
  const ctx = useContext(JurisdictionContext);
  if (!ctx) {
    throw new Error("useJurisdiction must be used within a JurisdictionProvider");
  }
  return ctx;
}

/** Build an absolute href prefixed with the current jurisdiction slug */
export function useJurisdictionHref(path: string): string {
  const { id } = useJurisdiction();
  return `/${id}${path}`;
}
