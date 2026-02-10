import * as React from "react";

import { cn } from "@/lib/utils";
import type { PlanStatus } from "@/services/api/planService";

const META: Record<PlanStatus, { label: string; classes: string; leftBorder: string }> = {
  pending: {
    label: "PENDENTE",
    classes: "bg-primary text-primary-foreground",
    leftBorder: "border-l-primary",
  },
  approved: {
    label: "ATIVO",
    classes: "bg-brand-green text-background",
    leftBorder: "border-l-brand-green",
  },
  rejected: {
    label: "REPROVADO",
    classes: "bg-destructive text-destructive-foreground",
    leftBorder: "border-l-destructive",
  },
  deactivated: {
    label: "DESATIVADO",
    classes: "bg-muted text-muted-foreground",
    leftBorder: "border-l-muted",
  },
};

export function planStatusMeta(status: PlanStatus) {
  return META[status] ?? META.pending;
}

export default function PlanStatusBadge({ status, className }: { status: PlanStatus; className?: string }) {
  const meta = planStatusMeta(status);
  return (
    <span className={cn("inline-flex items-center rounded-full px-4 py-1 text-xs font-extrabold tracking-wide", meta.classes, className)}>
      {meta.label}
    </span>
  );
}
