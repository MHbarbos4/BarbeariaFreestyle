import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  addDays,
  addHours,
  addMinutes,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { CalendarIcon, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import AppointmentCard, { type AppointmentAction } from "@/components/admin/appointments/AppointmentCard";
import AppointmentTable from "@/components/admin/appointments/AppointmentTable";
import AppointmentStatusBadge from "@/components/admin/appointments/AppointmentStatusBadge";
import WeekCalendar from "@/components/admin/appointments/WeekCalendar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { getUserById } from "@/services/api/authService";
import {
  cancelAppointment,
  getAllAppointmentsByDate,
  markAsAbsent,
  markAsCompleted,
  type Appointment,
  type AppointmentStatus,
} from "@/services/api/appointmentService";
import { cn } from "@/lib/utils";

type StatusFilter = "todos" | "confirmed" | "completed" | "canceled" | "no_show";
type ViewMode = "list" | "calendar";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function ymd(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function canMutate(status: AppointmentStatus) {
  // Permite marcar como falta em agendamentos pendentes, confirmados ou já completados
  // (admin pode corrigir se o cliente não compareceu após auto-conclusão)
  return status === "pending" || status === "confirmed" || status === "completed";
}

export default function ManageAppointments() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [status, setStatus] = React.useState<StatusFilter>("todos");

  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [weekAppointments, setWeekAppointments] = React.useState<Appointment[]>([]);

  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [completeOpen, setCompleteOpen] = React.useState(false);
  const [absentOpen, setAbsentOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Appointment | null>(null);
  const [observation, setObservation] = React.useState("");
  const [cancelReason, setCancelReason] = React.useState("");
  const [mutating, setMutating] = React.useState(false);

  React.useEffect(() => {
    if (!isAdmin) navigate("/dashboard", { replace: true });
  }, [isAdmin, navigate]);

  React.useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  const resolveClient = React.useCallback((userId: string) => {
    const u = getUserById(userId);
    return { name: u?.name ?? `Cliente (${userId.slice(0, 6)})`, phone: u?.phoneNumber };
  }, []);

  const loadDay = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllAppointmentsByDate({ date: ymd(selectedDate) });
      setAppointments(list);
      setPage(1);
    } catch {
      toast({ title: "Erro ao carregar agendamentos", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, toast]);

  const loadWeek = React.useCallback(async () => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const days = Array.from({ length: 6 }).map((_, i) => addDays(weekStart, i)); // seg-sab
      const results = await Promise.all(days.map((d) => getAllAppointmentsByDate({ date: ymd(d) })));
      setWeekAppointments(results.flat());
    } catch {
      toast({ title: "Erro ao carregar semana", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, toast]);

  React.useEffect(() => {
    if (viewMode === "calendar") {
      loadWeek();
    } else {
      loadDay();
    }
  }, [loadDay, loadWeek, viewMode]);

  React.useEffect(() => {
    const i = setInterval(() => {
      if (viewMode === "calendar") loadWeek();
      else loadDay();
    }, 60000);
    return () => clearInterval(i);
  }, [loadDay, loadWeek, viewMode]);

  const baseList = React.useMemo(() => (viewMode === "calendar" ? weekAppointments : appointments), [appointments, viewMode, weekAppointments]);

  const filtered = React.useMemo(() => {
    let list = [...baseList];

    if (status !== "todos") {
      if (status === "confirmed") list = list.filter((a) => a.status === "pending" || a.status === "confirmed");
      else list = list.filter((a) => a.status === status);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => {
        const c = resolveClient(a.userId);
        const phone = (c.phone ?? "").replace(/\s/g, "");
        return c.name.toLowerCase().includes(q) || phone.includes(q.replace(/\s/g, ""));
      });
    }

    // No modo lista, mantemos apenas a data selecionada; no modo calendário, mantém a semana inteira.
    if (viewMode === "list") {
      const key = ymd(selectedDate);
      list = list.filter((a) => a.startsAt.slice(0, 10) === key);
    }

    return list.sort((a, b) => parseISO(a.startsAt).getTime() - parseISO(b.startsAt).getTime());
  }, [baseList, resolveClient, searchQuery, selectedDate, status, viewMode]);

  const totalPages = React.useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length]);
  const paged = React.useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const counts = React.useMemo(() => {
    const by: Record<StatusFilter, number> = {
      todos: baseList.length,
      confirmed: baseList.filter((a) => a.status === "confirmed" || a.status === "pending").length,
      completed: baseList.filter((a) => a.status === "completed").length,
      canceled: baseList.filter((a) => a.status === "canceled").length,
      no_show: baseList.filter((a) => a.status === "no_show").length,
    };
    return by;
  }, [baseList]);

  const openAction = (action: AppointmentAction, apt: Appointment) => {
    setSelected(apt);
    if (action === "details") setDetailsOpen(true);
    if (action === "complete") setCompleteOpen(true);
    if (action === "absent") {
      setObservation("");
      setAbsentOpen(true);
    }
    if (action === "cancel") {
      setCancelReason("");
      setCancelOpen(true);
    }
  };

  const clearFilters = () => {
    setStatus("todos");
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  const onConfirmComplete = async () => {
    if (!selected) return;
    setMutating(true);
    try {
      await markAsCompleted({ id: selected.id });
      toast({ title: "Agendamento concluído", description: "Marcado como concluído." });
      setCompleteOpen(false);
      setSelected(null);
      if (viewMode === "calendar") await loadWeek();
      else await loadDay();
    } catch {
      toast({ title: "Erro ao concluir", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setMutating(false);
    }
  };

  const onConfirmAbsent = async () => {
    if (!selected) return;
    setMutating(true);
    try {
      const result = await markAsAbsent({ id: selected.id, observation: observation.trim() || undefined });
      toast({ 
        title: "Falta registrada", 
        description: result ? "Cliente marcado como falta e conta suspensa automaticamente." : "Cliente marcado como falta."
      });
      setAbsentOpen(false);
      setSelected(null);
      if (viewMode === "calendar") await loadWeek();
      else await loadDay();
    } catch {
      toast({ title: "Erro ao marcar falta", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setMutating(false);
    }
  };

  const onConfirmCancel = async () => {
    if (!selected) return;
    setMutating(true);
    try {
      // Cancelamento administrativo: marcamos como cancelado sem suspensão (placeholder).
      await cancelAppointment({ id: selected.id, userId: selected.userId });
      toast({ title: "Agendamento cancelado", description: "Cancelado pelo admin." });
      setCancelOpen(false);
      setSelected(null);
      if (viewMode === "calendar") await loadWeek();
      else await loadDay();
    } catch {
      toast({ title: "Erro ao cancelar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setMutating(false);
    }
  };

  const heroSubtitle = "Visualize e controle todos os agendamentos";

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8">
      {/* HERO */}
      <section className="bg-background px-4 py-16 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-3xl font-extrabold tracking-tight text-primary md:text-5xl"
          >
            📅 GERENCIAR AGENDAMENTOS
          </motion.h1>
          <p className="mt-3 text-base text-foreground md:text-lg">{heroSubtitle}</p>
        </div>
      </section>

      {/* FILTROS */}
      <section className="bg-background px-4 py-10 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {/* Data */}
            <div>
              <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">DATA</p>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="mt-2 flex w-full items-center justify-between rounded-md border border-border bg-card px-4 py-3 text-left text-sm font-extrabold text-foreground hover:bg-accent"
                    aria-label="Selecionar data"
                  >
                    <span className="inline-flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-primary" aria-hidden />
                      {format(selectedDate, "dd/MM/yyyy")}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

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
                <option value="confirmed">Confirmado/Pendente ({counts.confirmed})</option>
                <option value="completed">Concluído ({counts.completed})</option>
                <option value="canceled">Cancelado ({counts.canceled})</option>
                <option value="no_show">Falta ({counts.no_show})</option>
              </select>
            </div>

            {/* Busca */}
            <div>
              <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">BUSCA</p>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar por nome ou telefone"
                  className="h-11 pl-9"
                />
              </div>
            </div>

            {/* Visualização */}
            <div>
              <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">VISUALIZAÇÃO</p>
              <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-md border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={
                    "px-4 py-3 text-sm font-extrabold transition-colors " +
                    (viewMode === "list" ? "bg-primary text-primary-foreground" : "text-foreground hover:text-primary")
                  }
                  aria-label="Visualização em lista"
                >
                  📋 Lista
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={
                    "px-4 py-3 text-sm font-extrabold transition-colors " +
                    (viewMode === "calendar" ? "bg-primary text-primary-foreground" : "text-foreground hover:text-primary")
                  }
                  aria-label="Visualização em calendário"
                >
                  📅 Calendário
                </button>
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
              <p className="text-base font-extrabold text-foreground">📅 Nenhum agendamento encontrado</p>
              <p className="mt-2 text-sm text-muted-foreground">Ajuste os filtros ou selecione outra data</p>
              <Button className="mt-6" variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>
          ) : viewMode === "calendar" ? (
            <div className="overflow-x-auto">
              <WeekCalendar
                anchorDate={selectedDate}
                appointments={filtered}
                resolveClient={resolveClient}
                onSelect={(apt) => openAction("details", apt)}
                onPrevWeek={() => setSelectedDate(addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), -7))}
                onNextWeek={() => setSelectedDate(addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), 7))}
              />
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <AppointmentTable items={paged} resolveClient={resolveClient} onAction={openAction} />
              </div>

              {/* Mobile cards */}
              <div className="space-y-5 md:hidden">
                {paged.map((apt) => {
                  const c = resolveClient(apt.userId);
                  return (
                    <AppointmentCard
                      key={apt.id}
                      apt={apt}
                      clientName={c.name}
                      clientPhone={c.phone}
                      onAction={openAction}
                    />
                  );
                })}
              </div>

              {/* Paginação */}
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} de {filtered.length} agendamentos
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
              📋 DETALHES DO AGENDAMENTO {selected ? `#${selected.id.slice(-4)}` : ""}
            </DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="space-y-5 text-sm text-foreground">
              <div className="flex items-center justify-between gap-3">
                <AppointmentStatusBadge status={selected.status} />
                <p className="text-xs text-muted-foreground">Cancelamento até: {format(addHours(parseISO(selected.startsAt), -1), "dd/MM 'às' HH:mm")}</p>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">CLIENTE</p>
                <p className="mt-2 text-base font-extrabold">{resolveClient(selected.userId).name}</p>
                {resolveClient(selected.userId).phone ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <a
                      className="text-sm text-primary underline-offset-4 hover:underline"
                      href={`tel:${resolveClient(selected.userId).phone}`}
                    >
                      📞 Ligar
                    </a>
                    <a
                      className="text-sm text-primary underline-offset-4 hover:underline"
                      href={`https://wa.me/${String(resolveClient(selected.userId).phone).replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">DATA E HORA</p>
                <p className="mt-2 text-sm">
                  {format(parseISO(selected.startsAt), "EEEE, dd 'de' MMMM 'de' yyyy")} • {format(parseISO(selected.startsAt), "HH:mm")} - {format(addMinutes(parseISO(selected.startsAt), selected.durationMinutes), "HH:mm")} ({selected.durationMinutes} min)
                </p>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">SERVIÇO</p>
                <p className="mt-2 text-sm">✂️ {selected.serviceName} {selected.serviceType ? `(tipo: ${selected.serviceType})` : ""}</p>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">VALOR</p>
                <p className="mt-2 text-base font-extrabold text-brand-green">{formatBRL(selected.price)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Pagamento presencial</p>
              </div>
            </div>
          ) : null}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              FECHAR
            </Button>
            {selected && canMutate(selected.status) ? (
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => { setDetailsOpen(false); setAbsentOpen(true); }}>
                ❌ Marcar Falta
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CONCLUIR */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-lg border-2 border-brand-green bg-card p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-brand-green">✅ CONCLUIR AGENDAMENTO</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm text-foreground">
              <p><span className="font-extrabold">Cliente:</span> {resolveClient(selected.userId).name}</p>
              <p><span className="font-extrabold">Serviço:</span> {selected.serviceName}</p>
              <p>
                <span className="font-extrabold">Horário:</span> {format(parseISO(selected.startsAt), "HH:mm")} - {format(addMinutes(parseISO(selected.startsAt), selected.durationMinutes), "HH:mm")}
              </p>
              <p><span className="font-extrabold">Valor:</span> {formatBRL(selected.price)}</p>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-sm font-semibold">Confirmar que o serviço foi realizado?</p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)} disabled={mutating}>CANCELAR</Button>
            <Button variant="success" onClick={onConfirmComplete} disabled={mutating}>
              {mutating ? "SALVANDO..." : "SIM, CONCLUIR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL FALTA */}
      <Dialog open={absentOpen} onOpenChange={setAbsentOpen}>
        <DialogContent className="max-w-lg border-2 border-destructive bg-card p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-destructive">⚠️ MARCAR FALTA</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-sm text-foreground">
              <div className="rounded-lg border border-border bg-background p-4">
                <p><span className="font-extrabold">Cliente:</span> {resolveClient(selected.userId).name}</p>
                {resolveClient(selected.userId).phone ? (
                  <p className="mt-1 text-muted-foreground"><span className="font-extrabold text-foreground">Telefone:</span> {resolveClient(selected.userId).phone}</p>
                ) : null}
                <p className="mt-1 text-muted-foreground"><span className="font-extrabold text-foreground">Serviço:</span> {selected.serviceName}</p>
              </div>

              <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                <p className="text-sm font-extrabold text-destructive">⚠️ ATENÇÃO:</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>• O cliente será SUSPENSO automaticamente (placeholder)</li>
                  <li>• Não poderá fazer novos agendamentos (placeholder)</li>
                  <li>• Apenas você pode liberar (placeholder)</li>
                </ul>
              </div>

              <div>
                <label className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">OBSERVAÇÃO (OPCIONAL)</label>
                <textarea
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={3}
                  placeholder="Ex: Cliente não atendeu ligações"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbsentOpen(false)} disabled={mutating}>CANCELAR</Button>
            <Button variant="destructive" onClick={onConfirmAbsent} disabled={mutating}>
              {mutating ? "SALVANDO..." : "CONFIRMAR FALTA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CANCELAR (ADMIN) */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-lg border-2 border-destructive bg-card p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-destructive">🗑️ CANCELAR AGENDAMENTO</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-sm text-foreground">
              <div className="rounded-lg border border-border bg-background p-4">
                <p><span className="font-extrabold">Cliente:</span> {resolveClient(selected.userId).name}</p>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-extrabold text-foreground">Data:</span> {format(parseISO(selected.startsAt), "dd/MM/yyyy 'às' HH:mm")}
                </p>
                <p className="mt-1 text-muted-foreground"><span className="font-extrabold text-foreground">Serviço:</span> {selected.serviceName}</p>
              </div>

              <div>
                <label className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">MOTIVO DO CANCELAMENTO (OPCIONAL)</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={3}
                  placeholder="Ex: Cliente solicitou, reagendar"
                />
                <p className="mt-2 text-xs text-muted-foreground">ℹ️ Cliente NÃO será suspenso (cancelamento feito pelo admin).</p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={mutating}>VOLTAR</Button>
            <Button variant="destructive" onClick={onConfirmCancel} disabled={mutating}>
              {mutating ? "CANCELANDO..." : "CANCELAR AGENDAMENTO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
