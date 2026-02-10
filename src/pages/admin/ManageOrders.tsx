import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import OrderCard, { type OrderAction } from "@/components/admin/orders/OrderCard";
import OrderTable from "@/components/admin/orders/OrderTable";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  getAllTshirtOrders,
  confirmTshirtOrder,
  markTshirtOrderReady,
  markTshirtOrderDelivered,
  type TshirtOrder,
  type OrderStatus,
} from "@/services/api/orderService";
import { cn } from "@/lib/utils";

type StatusFilter = "todos" | "pending" | "confirmed" | "ready" | "delivered";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function ManageOrders() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [status, setStatus] = React.useState<StatusFilter>("todos");
  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [orders, setOrders] = React.useState<TshirtOrder[]>([]);

  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  // Modais
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [readyOpen, setReadyOpen] = React.useState(false);
  const [deliverOpen, setDeliverOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<TshirtOrder | null>(null);

  // Campos do form
  const [deliveryTime, setDeliveryTime] = React.useState<"7-10 dias úteis" | "10-15 dias úteis" | "15-20 dias úteis">("7-10 dias úteis");
  const [observation, setObservation] = React.useState("");
  const [deliveryDate, setDeliveryDate] = React.useState<Date>(new Date());
  const [mutating, setMutating] = React.useState(false);

  React.useEffect(() => {
    if (!isAdmin) navigate("/dashboard", { replace: true });
  }, [isAdmin, navigate]);

  React.useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadOrders = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllTshirtOrders();
      setOrders(list);
      setPage(1);
    } catch {
      toast({ title: "Erro ao carregar encomendas", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Refresh a cada 60s
  React.useEffect(() => {
    const i = setInterval(loadOrders, 60000);
    return () => clearInterval(i);
  }, [loadOrders]);

  const filtered = React.useMemo(() => {
    let list = [...orders];

    if (status !== "todos") {
      list = list.filter((o) => o.status === status);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((o) => {
        const name = (o.userName ?? "").toLowerCase();
        const phone = (o.userPhone ?? "").replace(/\s/g, "");
        const productName = o.productName.toLowerCase();
        const orderId = o.id.toLowerCase();
        return name.includes(q) || phone.includes(q.replace(/\s/g, "")) || productName.includes(q) || orderId.includes(q);
      });
    }

    return list;
  }, [orders, searchQuery, status]);

  const totalPages = React.useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length]);
  const paged = React.useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const counts = React.useMemo(() => {
    return {
      todos: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      confirmed: orders.filter((o) => o.status === "confirmed").length,
      ready: orders.filter((o) => o.status === "ready").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
    };
  }, [orders]);

  const openAction = (action: OrderAction, order: TshirtOrder) => {
    setSelected(order);
    if (action === "details") setDetailsOpen(true);
    if (action === "confirm") {
      setDeliveryTime("7-10 dias úteis");
      setObservation("");
      setConfirmOpen(true);
    }
    if (action === "ready") setReadyOpen(true);
    if (action === "deliver") {
      setDeliveryDate(new Date());
      setDeliverOpen(true);
    }
  };

  const clearFilters = () => {
    setStatus("todos");
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  const onConfirmOrder = async () => {
    if (!selected) return;
    setMutating(true);
    try {
      await confirmTshirtOrder({
        id: selected.id,
        deliveryTime,
        observation: observation.trim() || undefined,
      });
      toast({ title: "Pedido confirmado!", description: `Prazo: ${deliveryTime}` });
      setConfirmOpen(false);
      setSelected(null);
      await loadOrders();
    } catch {
      toast({ title: "Erro ao confirmar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setMutating(false);
    }
  };

  const onMarkReady = async () => {
    if (!selected) return;
    setMutating(true);
    try {
      await markTshirtOrderReady({ id: selected.id });
      toast({ title: "Pedido pronto!", description: "Aguardando retirada do cliente." });
      setReadyOpen(false);
      setSelected(null);
      await loadOrders();
    } catch {
      toast({ title: "Erro ao atualizar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setMutating(false);
    }
  };

  const onMarkDelivered = async () => {
    if (!selected) return;
    setMutating(true);
    try {
      await markTshirtOrderDelivered({
        id: selected.id,
        deliveryDate: format(deliveryDate, "yyyy-MM-dd"),
      });
      toast({ title: "Pedido entregue!", description: "Encomenda finalizada com sucesso." });
      setDeliverOpen(false);
      setSelected(null);
      await loadOrders();
    } catch {
      toast({ title: "Erro ao finalizar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8">
      {/* HERO */}
      <section className="bg-background px-4 py-12 sm:py-16 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl md:text-5xl"
          >
            🛒 ENCOMENDAS
          </motion.h1>
          <p className="mt-3 text-sm text-foreground sm:text-base md:text-lg">Controle todos os pedidos de camisetas</p>
        </div>
      </section>

      {/* FILTROS */}
      <section className="bg-background px-4 py-6 sm:py-10 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Status */}
            <div>
              <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">STATUS</p>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="mt-2 h-11 w-full rounded-md border border-border bg-card px-3 text-sm font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Filtrar por status"
              >
                <option value="todos">Todos ({counts.todos})</option>
                <option value="pending">⏳ Pendente ({counts.pending})</option>
                <option value="confirmed">✅ Confirmado ({counts.confirmed})</option>
                <option value="ready">📦 Pronto ({counts.ready})</option>
                <option value="delivered">🎉 Entregue ({counts.delivered})</option>
              </select>
            </div>

            {/* Busca */}
            <div className="xl:col-span-2">
              <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">BUSCA</p>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar por nome, telefone, produto ou ID do pedido"
                  className="h-11 pl-9"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="bg-background px-4 py-16 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center shadow-card">
              <p className="text-base font-extrabold text-foreground">🛒 Nenhuma encomenda encontrada</p>
              <p className="mt-2 text-sm text-muted-foreground">Ajuste os filtros ou aguarde novos pedidos</p>
              <Button className="mt-6" variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <OrderTable items={paged} onAction={openAction} />
              </div>

              {/* Mobile cards */}
              <div className="space-y-5 md:hidden">
                {paged.map((order) => (
                  <OrderCard key={order.id} order={order} onAction={openAction} />
                ))}
              </div>

              {/* Paginação */}
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} de {filtered.length} encomendas
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    ← Anterior
                  </Button>
                  <span className="rounded-md border border-border bg-card px-4 py-2 text-sm font-extrabold text-foreground">
                    {page}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Próxima →
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* MODAL DETALHES */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xl border border-border bg-card p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary">
              📋 DETALHES DO PEDIDO {selected ? `#${selected.id.slice(-6).toUpperCase()}` : ""}
            </DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="space-y-5 text-sm text-foreground">
              <div className="flex items-center justify-between gap-3">
                <OrderStatusBadge status={selected.status} />
                <p className="text-xs text-muted-foreground">
                  Criado em: {format(parseISO(selected.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">CLIENTE</p>
                <p className="mt-2 text-base font-extrabold">{selected.userName || "Cliente"}</p>
                {selected.userPhone ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <a
                      className="text-sm text-primary underline-offset-4 hover:underline"
                      href={`tel:${selected.userPhone}`}
                    >
                      📞 Ligar
                    </a>
                    <a
                      className="text-sm text-primary underline-offset-4 hover:underline"
                      href={`https://wa.me/${String(selected.userPhone).replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">PRODUTO</p>
                <div className="mt-3 flex gap-4">
                  <img
                    src={selected.productImage}
                    alt={selected.productName}
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                  <div>
                    <p className="text-base font-extrabold">👕 {selected.productName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Tamanho: <span className="font-bold text-foreground">{selected.size}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Cor: <span className="font-bold text-foreground">{selected.color}</span>
                    </p>
                  </div>
                </div>
              </div>

              {selected.deliveryTime && (
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">PRAZO DE ENTREGA</p>
                  <p className="mt-2 text-sm">📅 {selected.deliveryTime}</p>
                </div>
              )}

              {selected.observation && (
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">OBSERVAÇÃO</p>
                  <p className="mt-2 text-sm">{selected.observation}</p>
                </div>
              )}

              {selected.deliveredAt && (
                <div className="rounded-lg border border-brand-green bg-brand-green/10 p-4">
                  <p className="text-xs font-extrabold tracking-[0.18em] text-brand-green">DATA DE ENTREGA</p>
                  <p className="mt-2 text-sm text-foreground">🎉 {format(parseISO(selected.deliveredAt), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              FECHAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMAR PEDIDO */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-lg border-2 border-brand-green bg-card p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-brand-green">✅ CONFIRMAR PEDIDO</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-sm text-foreground">
              <div className="rounded-lg border border-border bg-background p-4">
                <p><span className="font-extrabold">Cliente:</span> {selected.userName || "Cliente"}</p>
                <p className="mt-1"><span className="font-extrabold">Produto:</span> {selected.productName}</p>
                <p className="mt-1"><span className="font-extrabold">Tamanho:</span> {selected.size} • <span className="font-extrabold">Cor:</span> {selected.color}</p>
              </div>

              <div>
                <Label className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">PRAZO DE ENTREGA</Label>
                <select
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value as typeof deliveryTime)}
                  className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="7-10 dias úteis">7-10 dias úteis</option>
                  <option value="10-15 dias úteis">10-15 dias úteis</option>
                  <option value="15-20 dias úteis">15-20 dias úteis</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">OBSERVAÇÃO (OPCIONAL)</Label>
                <textarea
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={3}
                  placeholder="Ex: Pedido especial, atenção ao acabamento"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={mutating}>CANCELAR</Button>
            <Button variant="success" onClick={onConfirmOrder} disabled={mutating}>
              {mutating ? "SALVANDO..." : "CONFIRMAR PEDIDO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL MARCAR COMO PRONTO */}
      <Dialog open={readyOpen} onOpenChange={setReadyOpen}>
        <DialogContent className="max-w-lg border-2 border-blue-500 bg-card p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-blue-500">📦 MARCAR COMO PRONTO</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-sm text-foreground">
              <div className="rounded-lg border border-border bg-background p-4">
                <p><span className="font-extrabold">Cliente:</span> {selected.userName || "Cliente"}</p>
                <p className="mt-1"><span className="font-extrabold">Produto:</span> {selected.productName}</p>
                <p className="mt-1"><span className="font-extrabold">Tamanho:</span> {selected.size} • <span className="font-extrabold">Cor:</span> {selected.color}</p>
              </div>

              <div className="rounded-lg border border-blue-500 bg-blue-500/10 p-4">
                <p className="text-sm">
                  ℹ️ O cliente será notificado que a encomenda está pronta para retirada.
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReadyOpen(false)} disabled={mutating}>CANCELAR</Button>
            <Button className="bg-blue-500 text-white hover:bg-blue-600" onClick={onMarkReady} disabled={mutating}>
              {mutating ? "SALVANDO..." : "MARCAR COMO PRONTO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL MARCAR COMO ENTREGUE */}
      <Dialog open={deliverOpen} onOpenChange={setDeliverOpen}>
        <DialogContent className="max-w-lg border-2 border-brand-green bg-card p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-brand-green">🎉 MARCAR COMO ENTREGUE</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-sm text-foreground">
              <div className="rounded-lg border border-border bg-background p-4">
                <p><span className="font-extrabold">Cliente:</span> {selected.userName || "Cliente"}</p>
                <p className="mt-1"><span className="font-extrabold">Produto:</span> {selected.productName}</p>
                <p className="mt-1"><span className="font-extrabold">Tamanho:</span> {selected.size} • <span className="font-extrabold">Cor:</span> {selected.color}</p>
              </div>

              <div>
                <Label className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">DATA DE ENTREGA</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="mt-2 flex w-full items-center justify-between rounded-md border border-border bg-background px-4 py-3 text-left text-sm font-extrabold text-foreground hover:bg-accent"
                    >
                      <span className="inline-flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        {format(deliveryDate, "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deliveryDate}
                      onSelect={(d) => d && setDeliveryDate(d)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="rounded-lg border border-brand-green bg-brand-green/10 p-4">
                <p className="text-sm">
                  ✅ O pedido será finalizado e marcado como entregue.
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliverOpen(false)} disabled={mutating}>CANCELAR</Button>
            <Button variant="success" onClick={onMarkDelivered} disabled={mutating}>
              {mutating ? "SALVANDO..." : "CONFIRMAR ENTREGA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
