import * as React from "react";

import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/services/api/orderService";

const STATUS_META: Record<OrderStatus, { label: string; classes: string; leftBorder: string }> = {
  pending: {
    label: "⏳ Pendente",
    classes: "bg-primary text-primary-foreground",
    leftBorder: "border-l-primary",
  },
  confirmed: {
    label: "✅ Confirmado",
    classes: "bg-brand-green text-background",
    leftBorder: "border-l-brand-green",
  },
  ready: {
    label: "📦 Pronto",
    classes: "bg-blue-500 text-white",
    leftBorder: "border-l-blue-500",
  },
  delivered: {
    label: "🎉 Entregue",
    classes: "bg-muted text-muted-foreground",
    leftBorder: "border-l-muted",
  },
};

export function orderStatusMeta(status: OrderStatus) {
  return STATUS_META[status] ?? STATUS_META.pending;
}

export default function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const meta = orderStatusMeta(status);
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
