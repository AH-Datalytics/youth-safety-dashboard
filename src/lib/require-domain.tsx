import { notFound } from "next/navigation";
import { getJurisdiction, hasDomain, type DomainId } from "@/lib/jurisdictions";

/**
 * Server-side layout guard: 404s a page whose domain this jurisdiction doesn't
 * carry. It has to run on the server — notFound() from a client page renders
 * the not-found UI but still serves a prerendered 200.
 */
export function requireDomain(domain: DomainId) {
  return async function DomainLayout({
    children,
    params,
  }: {
    children: React.ReactNode;
    params: Promise<{ jurisdiction: string }>;
  }) {
    const { jurisdiction } = await params;
    const config = getJurisdiction(jurisdiction);
    if (!config || !hasDomain(config, domain)) notFound();
    return <>{children}</>;
  };
}
