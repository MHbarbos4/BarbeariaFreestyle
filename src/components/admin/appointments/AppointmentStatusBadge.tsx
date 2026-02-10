import * as React from "react";

import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/services/api/appointmentService";

const STATUS_META: Record<AppointmentStatus, { label: string; classes: string; leftBorder: string }> = {
  pending: {
    label: "⏳ Pendente",
    classes: "bg-primary text-primary-foreground",
    leftBorder: "border-l-primary",
  },
  confirmed: {
    label: "⏳ Confirmado",
    classes: "bg-primary text-primary-foreground",
    leftBorder: "border-l-primary",
  },
  completed: {
    label: "✅ Concluído",
    classes: "bg-brand-green text-background",
    leftBorder: "border-l-brand-green",
  },
  canceled: {
    label: "🚫 Cancelado",
    classes: "bg-muted text-muted-foreground",
    leftBorder: "border-l-muted",
  },
  no_show: {
    label: "❌ Falta",
    classes: "bg-destructive text-destructive-foreground",
    leftBorder: "border-l-destructive",
  },
};

export function appointmentStatusMeta(status: AppointmentStatus) {
  return STATUS_META[status] ?? STATUS_META.pending;
}

export default function AppointmentStatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  const meta = appointmentStatusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold",
        meta.classes,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
