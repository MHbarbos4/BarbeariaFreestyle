import * as React from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EllipsisVertical, Phone } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TshirtOrder } from "@/services/api/orderService";
import OrderStatusBadge, { orderStatusMeta } from "@/components/admin/orders/OrderStatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type OrderAction = "details" | "confirm" | "ready" | "deliver";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function OrderCard({
  order,
  onAction,
}: {
  order: TshirtOrder;
  onAction: (action: OrderAction, order: TshirtOrder) => void;
}) {
  const statusMeta = orderStatusMeta(order.status);
  const createdAt = parseISO(order.createdAt);

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        "border-l-4",
        statusMeta.leftBorder,
      )}
    >
      <div className="absolute right-4 top-4">
        <OrderStatusBadge status={order.status} />
      </div>

      <p className="text-sm font-semibold text-muted-foreground">
        {format(createdAt, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
      </p>

      <p className="mt-3 text-xl font-extrabold tracking-tight text-primary">
        🛒 Pedido #{order.id.slice(-6).toUpperCase()}
      </p>

      <div className="mt-6 border-t border-border pt-6">
        <p className="text-sm font-extrabold tracking-[0.16em] text-muted-foreground">CLIENTE</p>
        <p className="mt-2 text-base font-semibold text-foreground">{order.userName || "Cliente"}</p>
        {order.userPhone ? (
          <a
            className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
            href={`tel:${order.userPhone}`}
          >
            <Phone className="h-4 w-4" aria-hidden /> {order.userPhone}
          </a>
        ) : null}
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <p className="text-sm font-extrabold tracking-[0.16em] text-muted-foreground">PRODUTO</p>
        <div className="mt-2 flex gap-3">
          <img
            src={order.productImage}
            alt={order.productName}
            className="h-16 w-16 rounded-lg object-cover"
          />
          <div>
            <p className="text-base font-semibold text-foreground">👕 {order.productName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tamanho: <span className="font-bold">{order.size}</span> • Cor: <span className="font-bold">{order.color}</span>
            </p>
          </div>
        </div>
      </div>

      {order.deliveryTime && (
        <div className="mt-6 border-t border-border pt-6">
          <p className="text-sm font-extrabold tracking-[0.16em] text-muted-foreground">PRAZO</p>
          <p className="mt-2 text-sm text-foreground">📅 {order.deliveryTime}</p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-bold text-foreground hover:bg-accent"
              aria-label="Abrir ações"
            >
              <EllipsisVertical className="h-4 w-4" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuItem onSelect={() => onAction("details", order)}>👁️ Ver Detalhes</DropdownMenuItem>
            <DropdownMenuItem
              disabled={order.status !== "pending"}
              onSelect={() => onAction("confirm", order)}
            >
              ✅ Confirmar Pedido
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={order.status !== "confirmed"}
              onSelect={() => onAction("ready", order)}
            >
              📦 Marcar como Pronto
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={order.status !== "ready"}
              onSelect={() => onAction("deliver", order)}
            >
              🎉 Marcar como Entregue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
