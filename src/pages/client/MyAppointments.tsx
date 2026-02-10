import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { addMinutes, format, isBefore, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ClipboardList, MapPin, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useBooking } from "@/context/BookingContext";
import { cancelAppointment, getMyAppointments, type Appointment } from "@/services/api/appointmentService";

const PAGE_SIZE = 10;

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatLongDate(iso: string) {
  const d = parseISO(iso);
  return format(d, "EEEE, dd 'de' MMMM 'de' yyyy");
}

function formatTime(iso: string) {
  return format(parseISO(iso), "HH:mm");
}

function endTime(iso: string, durationMinutes: number) {
  return format(addMinutes(parseISO(iso), durationMinutes), "HH:mm");
}

function cancelUntilISO(iso: string) {
  return addMinutes(parseISO(iso), -60).toISOString();
}

function remainingParts(untilISO: string, now: Date) {
  const diff = new Date(untilISO).getTime() - now.getTime();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, diff };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatRemaining(r: { hours: number; minutes: number; seconds: number }) {
  return `${pad2(r.hours)}h ${pad2(r.minutes)}min ${pad2(r.seconds)}s`;
}

function statusUI(status: Appointment["status"]) {
  switch (status) {
    case "pending":
      return { label: "⏳ Pendente", badge: "bg-primary text-primary-foreground" };
    case "confirmed":
      return { label: "✅ Confirmado", badge: "bg-brand-green text-background" };
    case "canceled":
      return { label: "🚫 Cancelado", badge: "bg-muted text-muted-foreground" };
    case "completed":
      return { label: "✅ Concluído", badge: "bg-brand-green text-background" };
    case "no_show":
      return { label: "❌ Falta", badge: "bg-destructive text-destructive-foreground" };
  }
}

export default function MyAppointments() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateBooking, resetBooking } = useBooking();

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  const [tab, setTab] = React.useState<"ativos" | "historico">("ativos");
  const [historyFilter, setHistoryFilter] = React.useState<"todos" | "concluidos" | "cancelados" | "faltas">("todos");
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<Appointment[]>([]);
  const [now, setNow] = React.useState(() => new Date());

  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Appointment | null>(null);
  const [canceling, setCanceling] = React.useState(false);

  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [reduce]);

  React.useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const load = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await getMyAppointments(userId);
      setItems(res);
    } catch {
      toast({ title: "Erro ao carregar agendamentos", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, userId]);

  React.useEffect(() => {
    if (!userId) {
      navigate("/login", { state: { from: "/meus-agendamentos" } });
      return;
    }
    load();
  }, [load, navigate, userId]);

  React.useEffect(() => {
    const i = setInterval(() => {
      load();
    }, 120000);
    return () => clearInterval(i);
  }, [load]);

  const activeAppointments = React.useMemo(
    () => items.filter((a) => a.status === "pending" || a.status === "confirmed"),
    [items],
  );
  const historyAppointments = React.useMemo(
    () => items.filter((a) => a.status === "completed" || a.status === "canceled" || a.status === "no_show"),
    [items],
  );

  const filteredHistory = React.useMemo(() => {
    if (historyFilter === "todos") return historyAppointments;
    if (historyFilter === "concluidos") return historyAppointments.filter((a) => a.status === "completed");
    if (historyFilter === "faltas") return historyAppointments.filter((a) => a.status === "no_show");
    return historyAppointments.filter((a) => a.status === "canceled");
  }, [historyAppointments, historyFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [tab, historyFilter]);

  const pagedHistory = React.useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredHistory.slice(start, start + PAGE_SIZE);
  }, [filteredHistory, page]);
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));

  const openCancel = (apt: Appointment) => {
    setSelected(apt);
    setCancelOpen(true);
  };

  const openDetails = (apt: Appointment) => {
    setSelected(apt);
    setDetailsOpen(true);
  };

  const canCancel = (apt: Appointment) => {
    const until = cancelUntilISO(apt.startsAt);
    return Boolean(remainingParts(until, now));
  };

  const onConfirmCancel = async () => {
    if (!selected || !userId) return;
    setCanceling(true);
    try {
      await cancelAppointment({ id: selected.id, userId });
      toast({ title: "Agendamento cancelado", description: "Cancelado com sucesso." });
      setCancelOpen(false);
      setSelected(null);
      await load();
    } catch {
      toast({ title: "Erro ao cancelar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setCanceling(false);
    }
  };

  const onBookAgain = (apt: Appointment) => {
    if (!apt.serviceId || !apt.serviceType) {
      toast({
        title: "Não foi possível agendar novamente",
        description: "Este agendamento antigo não possui dados do serviço.",
        variant: "destructive",
      });
      return;
    }
    resetBooking();
    updateBooking({
      type: apt.serviceType,
      serviceId: apt.serviceId,
      serviceName: apt.serviceName,
      price: apt.price,
      duration: apt.durationMinutes,
    });
    navigate("/agendar/data-hora");
  };

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8">
      {/* HERO */}
      <section className="bg-background px-4 py-16 text-center md:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-3xl font-extrabold tracking-tight text-primary md:text-5xl"
          >
            MEUS AGENDAMENTOS
          </motion.h1>
          <p className="mt-3 text-base text-foreground md:text-lg">Acompanhe seus horários</p>
        </div>
      </section>

      {/* TABS */}
      <section className="bg-background px-4 py-10 md:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
              <TabsList className="h-auto w-full justify-start bg-transparent p-0">
                <TabsTrigger
                  value="ativos"
                  className="rounded-t-lg border border-border bg-transparent px-10 py-4 text-sm font-extrabold text-foreground data-[state=active]:border-b-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <span className="inline-flex items-center gap-3">
                    ATIVOS
                    <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs font-black">
                      {activeAppointments.length}
                    </span>
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="historico"
                  className="rounded-t-lg border border-border bg-transparent px-10 py-4 text-sm font-extrabold text-foreground data-[state=active]:border-b-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <span className="inline-flex items-center gap-3">
                    HISTÓRICO
                    <span className="rounded-full bg-background/20 px-2 py-0.5 text-xs font-black">
                      {historyAppointments.length}
                    </span>
                  </span>
                </TabsTrigger>
              </TabsList>

              <div className="mt-0 rounded-b-lg border border-border bg-background px-4 py-8 md:px-6">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-muted-foreground">
                    {tab === "ativos" ? "Agendamentos pendentes/confirmados" : "Seus agendamentos passados"}
                  </div>
                  <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" /> Atualizar
                    </span>
                  </Button>
                </div>

                <TabsContent value="ativos" className="mt-0">
                  {loading ? (
                    <div className="space-y-6">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-lg border border-border bg-card p-8 shadow-card">
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="mt-4 h-8 w-1/3" />
                          <Skeleton className="mt-6 h-24 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : activeAppointments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center shadow-card">
                      <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden />
                      <p className="mt-5 text-lg font-extrabold text-foreground">Você não tem agendamentos ativos</p>
                      <p className="mt-2 text-sm text-muted-foreground">Que tal agendar um horário?</p>
                      <div className="mt-6">
                        <Button variant="hero" size="xl" onClick={() => navigate("/agendar")}>AGENDAR AGORA</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {activeAppointments.map((apt, idx) => {
                        const ui = statusUI(apt.status);
                        const until = cancelUntilISO(apt.startsAt);
                        const rem = remainingParts(until, now);
                        const urgent = rem ? rem.diff < 60 * 60 * 1000 : false;
                        const cancelToneBorder = rem ? (urgent ? "border-destructive" : "border-primary") : "border-border";
                        const cancelToneText = rem ? (urgent ? "text-destructive" : "text-primary") : "text-muted-foreground";
                        const can = canCancel(apt);
                        const borderLeft = apt.status === "confirmed" ? "border-brand-green" : "border-primary";

                        return (
                          <motion.div
                            key={apt.id}
                            initial={reduce ? false : { opacity: 0, y: 10 }}
                            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.25 }}
                            transition={{ duration: 0.28, delay: reduce ? 0 : idx * 0.04 }}
                          >
                            <div className={"relative rounded-lg border border-border bg-card p-8 shadow-card transition-shadow hover:shadow-lg "}>
                              <div className={"absolute left-0 top-0 h-full w-1 rounded-l-lg " + borderLeft} aria-hidden />

                              <div className={"absolute right-6 top-6 rounded-full px-3 py-1 text-xs font-extrabold " + ui.badge}>
                                {ui.label}
                              </div>

                              <p className="text-sm text-muted-foreground">📅 {formatLongDate(apt.startsAt)}</p>
                              <p className="mt-2 text-2xl font-extrabold text-primary">
                                🕐 {formatTime(apt.startsAt)} - {endTime(apt.startsAt, apt.durationMinutes)}
                              </p>

                              <div className="my-6 h-px bg-border" aria-hidden />

                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">✂️ SERVIÇO</p>
                                  <p className="mt-1 text-sm font-semibold text-foreground">{apt.serviceName}</p>
                                  {apt.isPlanBooking && (
                                    <span className="mt-1 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                      ⭐ Plano
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">💰 VALOR</p>
                                  {apt.isPlanBooking ? (
                                    <p className="mt-1 text-sm font-extrabold text-brand-green">
                                      R$ 0,00 <span className="text-xs font-normal text-muted-foreground">(plano)</span>
                                    </p>
                                  ) : (
                                    <p className="mt-1 text-sm font-extrabold text-brand-green">{formatBRL(apt.price)}</p>
                                  )}
                                </div>
                              </div>

                              <div className="my-6 h-px bg-border" aria-hidden />

                              <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
                                ⏳ CANCELAMENTO DISPONÍVEL ATÉ
                              </p>

                              {rem ? (
                                <div className={"mt-3 rounded-lg border bg-background p-4 text-center " + cancelToneBorder}>
                                  <p className={"font-mono text-xl font-extrabold " + cancelToneText}>
                                    {formatRemaining(rem)}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Até {format(parseISO(until), "dd/MM 'às' HH:mm")}
                                  </p>
                                </div>
                              ) : (
                                <div className="mt-3 rounded-lg border border-destructive bg-background p-4 text-center">
                                  <p className="text-sm font-extrabold text-destructive">⚠️ CANCELAMENTO NÃO DISPONÍVEL</p>
                                  <p className="mt-1 text-xs text-muted-foreground">O prazo para cancelamento expirou</p>
                                </div>
                              )}

                              <div className="my-6 h-px bg-border" aria-hidden />

                              <div className="flex flex-col gap-3 sm:flex-row">
                                <Button
                                  variant="destructive"
                                  className="w-full sm:w-auto"
                                  disabled={!can}
                                  onClick={() => openCancel(apt)}
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <Trash2 className="h-4 w-4" /> CANCELAR
                                  </span>
                                </Button>
                                <Button
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  onClick={() => openDetails(apt)}
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4" /> VER DETALHES
                                  </span>
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="historico" className="mt-0">
                  <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                    {(
                      [
                        { id: "todos", label: "TODOS" },
                        { id: "concluidos", label: "CONCLUÍDOS" },
                        { id: "cancelados", label: "CANCELADOS" },
                        { id: "faltas", label: "FALTAS" },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setHistoryFilter(f.id)}
                        className={
                          "whitespace-nowrap rounded-lg px-6 py-3 text-xs font-extrabold tracking-[0.12em] transition-colors " +
                          (historyFilter === f.id
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-transparent text-foreground hover:bg-accent")
                        }
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {loading ? (
                    <div className="space-y-6">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-lg border border-border bg-card p-8 shadow-card">
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="mt-4 h-6 w-1/3" />
                          <Skeleton className="mt-6 h-20 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : filteredHistory.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center shadow-card">
                      <p className="text-lg font-extrabold text-foreground">Nenhum item no histórico</p>
                      <p className="mt-2 text-sm text-muted-foreground">Quando você concluir ou cancelar, aparecerá aqui.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {pagedHistory.map((apt, idx) => {
                        const ui = statusUI(apt.status);
                        const leftTone = apt.status === "completed" ? "border-brand-green" : "border-muted";

                        return (
                          <motion.div
                            key={apt.id}
                            initial={reduce ? false : { opacity: 0, y: 10 }}
                            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.25 }}
                            transition={{ duration: 0.28, delay: reduce ? 0 : idx * 0.04 }}
                          >
                            <div className="relative rounded-lg border border-border bg-card p-6 opacity-90 shadow-card">
                              <div className={"absolute left-0 top-0 h-full w-1 rounded-l-lg " + leftTone} aria-hidden />
                              <div className={"absolute right-6 top-6 rounded-full px-3 py-1 text-xs font-extrabold " + ui.badge}>
                                {ui.label}
                              </div>

                              <p className="text-sm text-muted-foreground">📅 {formatLongDate(apt.startsAt)}</p>
                              <p className="mt-2 text-sm font-semibold text-foreground">
                                🕐 {formatTime(apt.startsAt)} - {endTime(apt.startsAt, apt.durationMinutes)}
                              </p>

                              <div className="my-5 h-px bg-border" aria-hidden />

                              <p className="text-sm text-muted-foreground">✂️ {apt.serviceName}</p>
                              <p className="mt-1 text-sm text-muted-foreground">💰 {formatBRL(apt.price)}</p>

                              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                <Button variant="outline" onClick={() => openDetails(apt)}>
                                  <span className="inline-flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4" /> VER DETALHES
                                  </span>
                                </Button>
                                {apt.status === "completed" ? (
                                  <Button variant="hero" onClick={() => onBookAgain(apt)}>
                                    ♻️ AGENDAR NOVAMENTE
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}

                      {/* PAGINAÇÃO */}
                      {totalPages > 1 ? (
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                          <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                            ← Anterior
                          </Button>
                          {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
                            const p = i + 1;
                            const active = p === page;
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setPage(p)}
                                className={
                                  "h-10 w-10 rounded-lg border text-sm font-extrabold transition-colors " +
                                  (active
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-transparent text-foreground hover:bg-accent")
                                }
                                aria-current={active ? "page" : undefined}
                              >
                                {p}
                              </button>
                            );
                          })}
                          <Button
                            variant="outline"
                            disabled={page === totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          >
                            Próxima →
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </section>

      {/* MODAL CANCELAR */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-lg border-2 border-destructive bg-card p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-destructive">⚠️ CANCELAR AGENDAMENTO</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-foreground">
            <p className="text-muted-foreground">Tem certeza que deseja cancelar? Esta ação não pode ser desfeita.</p>
            {selected ? (
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">📅 DATA</p>
                <p className="mt-1 font-semibold">{formatLongDate(selected.startsAt)}</p>
                <p className="mt-3 text-xs font-semibold tracking-[0.18em] text-muted-foreground">🕐 HORÁRIO</p>
                <p className="mt-1 font-semibold">
                  {formatTime(selected.startsAt)} - {endTime(selected.startsAt, selected.durationMinutes)}
                </p>
                <p className="mt-3 text-xs font-semibold tracking-[0.18em] text-muted-foreground">✂️ SERVIÇO</p>
                <p className="mt-1 font-semibold">{selected.serviceName}</p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={canceling}>
              NÃO, MANTER
            </Button>
            <Button variant="destructive" onClick={onConfirmCancel} disabled={canceling}>
              {canceling ? "CANCELANDO..." : "SIM, CANCELAR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALHES */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xl border-2 border-primary bg-card p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary">📋 DETALHES DO AGENDAMENTO</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-5 text-sm text-foreground">
              {/* Badge do plano */}
              {selected.isPlanBooking && (
                <div className="rounded-lg border-2 border-primary bg-primary/10 p-3">
                  <p className="text-center font-extrabold text-primary">
                    ⭐ Agendamento pelo Plano
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">📅 DATA E HORA</p>
                <p className="mt-1 font-semibold">
                  {formatLongDate(selected.startsAt)}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {formatTime(selected.startsAt)} - {endTime(selected.startsAt, selected.durationMinutes)} ({selected.durationMinutes} min)
                </p>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">✂️ SERVIÇO</p>
                <p className="mt-1 font-semibold">{selected.serviceName}</p>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">💰 VALOR</p>
                {selected.isPlanBooking ? (
                  <>
                    <p className="mt-1 font-extrabold text-brand-green">R$ 0,00</p>
                    <p className="mt-1 text-xs text-muted-foreground">Coberto pelo plano</p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 font-extrabold text-brand-green">{formatBRL(selected.price)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Pagamento presencial</p>
                  </>
                )}
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">📍 LOCAL</p>
                <p className="mt-1 font-semibold">Barbearia Freestyle</p>
                <p className="mt-1 text-muted-foreground">Rua Exemplo, 123 • São Paulo - SP</p>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-primary underline-offset-4 hover:underline"
                  onClick={() => window.open("https://maps.google.com/?q=Rua+Exemplo+123+Sao+Paulo", "_blank")}
                >
                  <MapPin className="h-4 w-4" /> VER NO MAPA
                </button>
              </div>

              {(selected.status === "pending" || selected.status === "confirmed") ? (
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">⏳ CANCELAMENTO</p>
                  <p className="mt-1 text-muted-foreground">
                    Disponível até: {format(parseISO(cancelUntilISO(selected.startsAt)), "dd/MM 'às' HH:mm")}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              FECHAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
