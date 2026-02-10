import * as React from "react";

import { cn } from "@/lib/utils";

type SkeletonCardProps = {
  type?: "default";
  className?: string;
};

export default function SkeletonCard({ type = "default", className }: SkeletonCardProps) {
  if (type !== "default") {
    // fallback (mantemos simples e reutilizável)
    return <div className={cn("h-40 w-full animate-pulse rounded-lg bg-border", className)} />;
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card p-8 shadow-card", className)}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="h-8 w-2/3 animate-pulse rounded bg-border" />
          <div className="mt-4 h-4 w-full animate-pulse rounded bg-border" />
          <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-border" />
          <div className="mt-2 h-4 w-4/6 animate-pulse rounded bg-border" />
          <div className="mt-8 h-10 w-72 animate-pulse rounded bg-border" />
        </div>
        <div className="h-7 w-24 animate-pulse rounded-full bg-border" />
      </div>
    </div>
  );
}
