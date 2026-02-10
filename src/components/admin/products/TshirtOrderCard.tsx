import * as React from "react";
import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

import type { TshirtOrder } from "@/services/api/orderService";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function statusConfig(status: TshirtOrder["status"]) {
  switch (status) {
    case "pending":
      return { label: "PENDENTE", className: "bg-primary text-primary-foreground" };
    case "confirmed":
      return { label: "CONFIRMADA", className: "bg-accent text-accent-foreground" };
    case "ready":
      return { label: "PRONTA", className: "bg-brand-green text-background" };
    case "delivered":
      return { label: "ENTREGUE", className: "bg-muted text-muted-foreground" };
  }
}

export default function TshirtOrderCard({
  order,
  onConfirm,
  onCancel,
  onReady,
  onDelivered,
}: {
  order: TshirtOrder;
  onConfirm: (o: TshirtOrder) => void;
  onCancel: (o: TshirtOrder) => void;
  onReady: (o: TshirtOrder) => void;
  onDelivered: (o: TshirtOrder) => void;
}) {
  const badge = statusConfig(order.status);
  const canAct = order.status === "pending" || order.status === "confirmed";

  const phoneHref = order.userPhone ? `tel:${order.userPhone.replace(/\D/g, "")}` : undefined;
  const waHref = order.userPhone ? `https://wa.me/55${order.userPhone.replace(/\D/g, "")}` : undefined;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("relative rounded-lg border border-border bg-card p-6 shadow-card", badge.className.includes("bg-") ? "" : "")}
      style={{ borderLeftWidth: 4 }}
    >
      <div className="absolute right-4 top-4">
        <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold", badge.className)}>
          {badge.label}
        </span>
      </div>

      <div className="flex gap-4">
        <img
          src={order.productImage}
          alt={order.productName}
          className="h-20 w-20 rounded-md object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold text-foreground">{order.productName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tamanho: {order.size} | Cor: {order.color}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-5">
        <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">👤 CLIENTE</p>
        <p className="mt-2 text-base font-bold text-foreground">{order.userName || "Cliente"}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">{order.userPhone || "(sem telefone)"}</span>
          {phoneHref ? (
            <a className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline" href={phoneHref}>
              <Phone className="size-4" />
              Ligar
            </a>
          ) : null}
          {waHref ? (
            <a className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline" href={waHref} target="_blank" rel="noreferrer">
              <FaWhatsapp className="size-4" />
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-5">
        <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📅 ENCOMENDADO EM</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {new Date(order.createdAt).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}
        </p>
      </div>

      <div className="mt-6">
        {order.status === "pending" ? (
          <div className="flex flex-wrap gap-3">
            <Button variant="success" onClick={() => onConfirm(order)}>
              ✅ Confirmar
            </Button>
            <Button variant="danger" onClick={() => onCancel(order)}>
              ❌ Cancelar
            </Button>
          </div>
        ) : order.status === "confirmed" ? (
          <Button variant="success" onClick={() => onReady(order)}>
            📦 Marcar como pronta
          </Button>
        ) : order.status === "ready" ? (
          <Button variant="success" onClick={() => onDelivered(order)}>
            ✓ Marcar como entregue
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma ação disponível.</p>
        )}

        {!canAct && order.status !== "delivered" ? null : null}
      </div>
    </motion.article>
  );
}
