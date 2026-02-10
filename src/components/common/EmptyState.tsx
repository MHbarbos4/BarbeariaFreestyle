import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("rounded-lg border border-dashed border-border bg-card p-20 text-center shadow-card", className)}>
      <div className="text-5xl text-muted-foreground" aria-hidden>
        {icon}
      </div>
      <p className="mt-6 text-2xl font-extrabold text-foreground">{title}</p>
      {description ? <p className="mt-3 text-sm text-muted-foreground">{description}</p> : null}
      {actionLabel && onAction ? (
        <div className="mt-8">
          <Button variant="hero" size="lg" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
