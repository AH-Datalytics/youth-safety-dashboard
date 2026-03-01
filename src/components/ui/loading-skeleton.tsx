import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse bg-muted rounded", className)} />;
}

export function ChartSkeleton() {
  return (
    <div className="border border-border rounded-lg p-4 bg-white">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function KPIBannerSkeleton() {
  return (
    <div className="bg-primary rounded-lg grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 animate-pulse">
          <div className="h-3 bg-white/20 rounded w-20 mb-2" />
          <div className="h-8 bg-white/20 rounded w-24 mb-1" />
          <div className="h-3 bg-white/20 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      <div className="p-4">
        <Skeleton className="h-4 w-40 mb-4" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full mb-2" />
        ))}
      </div>
    </div>
  );
}
