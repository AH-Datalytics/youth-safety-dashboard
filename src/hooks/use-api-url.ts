"use client";

import { useJurisdiction } from "@/lib/jurisdiction-context";

/** Build a jurisdiction-scoped API URL: /api/{jurisdiction}/{domain} */
export function useApiUrl(domain: string): string {
  const { id } = useJurisdiction();
  return `/api/${id}/${domain}`;
}
