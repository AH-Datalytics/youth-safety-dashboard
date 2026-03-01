import { AppShell } from "@/components/layout";

export default function CFS311Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
