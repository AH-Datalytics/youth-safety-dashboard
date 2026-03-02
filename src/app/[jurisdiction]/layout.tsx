import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  JURISDICTIONS,
  getJurisdiction,
} from "@/lib/jurisdictions";
import { JurisdictionProvider } from "@/lib/jurisdiction-context";
import { AppShell } from "@/components/layout";

interface Props {
  children: React.ReactNode;
  params: Promise<{ jurisdiction: string }>;
}

export async function generateStaticParams() {
  return JURISDICTIONS.map((j) => ({ jurisdiction: j.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ jurisdiction: string }>;
}): Promise<Metadata> {
  const { jurisdiction } = await params;
  const config = getJurisdiction(jurisdiction);
  if (!config) return {};
  return {
    title: `${config.shortName} Youth Safety Dashboard`,
    description: `Public safety data dashboard for ${config.name} — powered by ${config.org} and AH Datalytics`,
  };
}

export default async function JurisdictionLayout({ children, params }: Props) {
  const { jurisdiction } = await params;
  const config = getJurisdiction(jurisdiction);
  if (!config) notFound();

  return (
    <div
      style={
        {
          "--primary": config.colors.primary,
          "--primary-dark": config.colors.primaryDark,
          "--accent": config.colors.accent,
          "--background": config.colors.background,
        } as React.CSSProperties
      }
    >
      <JurisdictionProvider config={config}>
        <AppShell>{children}</AppShell>
      </JurisdictionProvider>
    </div>
  );
}
