import * as React from "react";

import { cn } from "@/lib/utils";

export type StockBadgeTone = "ok" | "low" | "out";

export function getStockTone(stock: number): StockBadgeTone {
  if (stock <= 0) return "out";
  if (stock <= 5) return "low";
  return "ok";
}

export default function StockBadge({ stock, className }: { stock: number; className?: string }) {
  const tone = getStockTone(stock);
  const config =
    tone === "out"
      ? { label: "Esgotado", className: "bg-destructive text-destructive-foreground" }
      : tone === "low"
        ? { label: `${stock} unidades`, className: "bg-primary text-primary-foreground" }
        : { label: "Em estoque", className: "bg-brand-green text-background" };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
