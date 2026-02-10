import * as React from "react";

import { cn } from "@/lib/utils";

export default function AnnouncementStatusBadge({ isActive, className }: { isActive: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-4 py-1 text-xs font-extrabold uppercase tracking-wide",
        isActive ? "bg-brand-green text-foreground" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {isActive ? "ATIVO" : "INATIVO"}
    </span>
  );
}
