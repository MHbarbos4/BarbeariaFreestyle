import * as React from "react";

import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export default function LoadingSpinner({ text = "Carregando...", size = "md", className }: LoadingSpinnerProps) {
  const sizes = {
    sm: "h-6 w-6 border-[3px]",
    md: "h-12 w-12 border-4",
    lg: "h-16 w-16 border-[5px]",
  } as const;

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div
        className={cn(
          "rounded-full border-border border-t-primary animate-spin",
          sizes[size],
        )}
        aria-label="Carregando"
        role="status"
      />
      {text ? <p className="text-sm font-medium text-foreground">{text}</p> : null}
    </div>
  );
}
