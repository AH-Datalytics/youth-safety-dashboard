import { AppShell } from "@/components/layout";

export default function YouthCourtLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
