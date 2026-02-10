import * as React from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EllipsisVertical, Phone } from "lucide-react";

import type { TshirtOrder } from "@/services/api/orderService";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import type { OrderAction } from "@/components/admin/orders/OrderCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function OrderTable({
  items,
  onAction,
}: {
  items: TshirtOrder[];
  onAction: (action: OrderAction, order: TshirtOrder) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="rounded-lg border border-border bg-card shadow-card min-w-[900px]">
        <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/30">
          <tr>
            <th className="px-4 py-3 text-xs font-extrabold tracking-[0.16em] text-muted-foreground">PEDIDO</th>
            <th className="px-4 py-3 text-xs font-extrabold tracking-[0.16em] text-muted-foreground">DATA</th>
            <th className="px-4 py-3 text-xs font-extrabold tracking-[0.16em] text-muted-foreground">CLIENTE</th>
            <th className="px-4 py-3 text-xs font-extrabold tracking-[0.16em] text-muted-foreground">PRODUTO</th>
            <th className="px-4 py-3 text-xs font-extrabold tracking-[0.16em] text-muted-foreground">TAMANHO</th>
            <th className="px-4 py-3 text-xs font-extrabold tracking-[0.16em] text-muted-foreground">STATUS</th>
            <th className="px-4 py-3 text-xs font-extrabold tracking-[0.16em] text-muted-foreground">PRAZO</th>
            <th className="px-4 py-3 text-xs font-extrabold tracking-[0.16em] text-muted-foreground">AÇÕES</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((order) => {
            const createdAt = parseISO(order.createdAt);
            return (
              <tr key={order.id} className="transition-colors hover:bg-accent/50">
                <td className="px-4 py-4">
                  <span className="font-mono text-xs font-bold text-primary">#{order.id.slice(-6).toUpperCase()}</span>
                </td>
                <td className="px-4 py-4 text-sm text-foreground">
                  {format(createdAt, "dd/MM/yyyy", { locale: ptBR })}
                  <span className="ml-1 text-muted-foreground">{format(createdAt, "HH:mm")}</span>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-foreground">{order.userName || "Cliente"}</p>
                  {order.userPhone && (
                    <a
                      href={`tel:${order.userPhone}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                    >
                      <Phone className="h-3 w-3" /> {order.userPhone}
                    </a>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <img
                      src={order.productImage}
                      alt={order.productName}
                      className="h-10 w-10 rounded object-cover"
                    />
                    <span className="text-sm font-medium text-foreground">{order.productName}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="rounded bg-muted px-2 py-1 text-xs font-bold">{order.size}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{order.color}</span>
                </td>
                <td className="px-4 py-4">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {order.deliveryTime || "—"}
                </td>
                <td className="px-4 py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Ações"
                      >
                        <EllipsisVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-48">
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
