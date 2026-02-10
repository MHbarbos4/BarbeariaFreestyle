import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { addDays, addMinutes, format, isBefore, isSameDay, startOfDay, endOfMonth, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Check, Clock, Crown, MapPin, Star, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

import ProgressBar from "@/components/booking/ProgressBar";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useBooking } from "@/context/BookingContext";
import { createAppointment, getAvailableSlots, type AvailableSlotsResponse } from "@/services/api/appointmentService";
import { isDayOpen, getShopConfig, type ShopConfig } from "@/services/api/shopConfigService";
import { 
  isDayAllowedForPlan, 
  getPlanPriority, 
  getPrioritySlots, 
  getAllowedDaysLabel,
  getPriorityLabel,
  getPlanValidPeriod,
  isDateWithinPlanPeriod,
  FIXED_PLANS,
} from "@/services/api/planService";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function toYMD(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function hhmmFromISO(iso: string) {
  const d = new Date(iso);
  return format(d, "HH:mm");
}

function groupByPeriod(slots: string[]) {
  const morning: string[] = [];
  const afternoon: string[] = [];
  slots.forEach((iso) => {
    const h = new Date(iso).getHours();
    if (h < 13) morning.push(iso);
    else afternoon.push(iso);
  });
  return { morning, afternoon };
}

export default function SelectDateTime() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { bookingData, updateBooking, resetBooking, userPlanType, userPlan, planUsage } = useBooking();

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  // Informações do plano para exibição
  const isSubscriber = Boolean(userPlan && userPlanType);
  const isPlanBooking = bookingData.isPlanBooking;
  const planIncludes = userPlan?.includes ?? null;
  const planPriority = isPlanBooking ? getPlanPriority(userPlanType, planIncludes) : 0;
  const priorityLabel = isPlanBooking ? getPriorityLabel(userPlanType, planIncludes) : "Normal";
  const allowedDaysLabel = isPlanBooking ? getAllowedDaysLabel(userPlanType, planIncludes) : "Todos os dias";
  const planName = userPlanType && userPlanType !== "custom" 
    ? FIXED_PLANS[userPlanType as keyof typeof FIXED_PLANS]?.name 
    : userPlanType === "custom" ? "Plano Personalizado" : null;

  // Período válido do plano (mês atual)
  const planPeriod = React.useMemo(() => {
    if (!isPlanBooking || !userPlan) return null;
    return getPlanValidPeriod(userPlan);
  }, [isPlanBooking, userPlan]);

  // Carrega configuração da barbearia
  const [shopConfig, setShopConfig] = React.useState<ShopConfig | null>(null);
  React.useEffect(() => {
    getShopConfig().then(setShopConfig);
  }, []);

  // Função para verificar se um dia é permitido
  const isDayAllowed = React.useCallback((date: Date) => {
    const today = startOfDay(new Date());
    // Não permite datas passadas
    if (isBefore(startOfDay(date), today)) return false;
    // Verifica se a barbearia está aberta nesse dia
    const shopStatus = isDayOpen(date);
    if (!shopStatus.isOpen) return false;
    // Se está usando o plano, verifica restrições
    if (isPlanBooking && userPlanType && userPlan) {
      // Verifica se está dentro do período do plano (mês vigente)
      if (!isDateWithinPlanPeriod(date, userPlan)) return false;
      // Verifica se o dia da semana é permitido
      return isDayAllowedForPlan(date, userPlanType, planIncludes);
    }
    return true;
  }, [isPlanBooking, userPlanType, userPlan, planIncludes]);

  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (!bookingData.date) return undefined;
    const d = new Date(bookingData.date);
    return Number.isNaN(d.getTime()) ? undefined : d;
  });
  const [selectedTimeISO, setSelectedTimeISO] = React.useState<string | null>(null);
  const [slots, setSlots] = React.useState<AvailableSlotsResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [reduce]);

  // Proteções: auth é feito no RequireAuth, mas mantemos a verificação do passo.
  React.useEffect(() => {
    if (!bookingData.type) {
      navigate("/agendar/tipo", { replace: true });
      return;
    }
    if (!bookingData.serviceId) {
      navigate("/agendar/servico", { replace: true });
      return;
    }
    // Se está usando plano mas limite foi atingido, volta
    if (isPlanBooking && planUsage && !planUsage.canUsePlan) {
      toast({
        title: "Limite do plano atingido",
        description: planUsage.reason || "Você já utilizou todos os serviços do plano neste mês.",
        variant: "destructive",
      });
      navigate("/agendar/tipo", { replace: true });
      return;
    }
  }, [bookingData.serviceId, bookingData.type, navigate, isPlanBooking, planUsage, toast]);

  const endTimeLabel = React.useMemo(() => {
    if (!selectedTimeISO) return null;
    const start = new Date(selectedTimeISO);
    const end = addMinutes(start, bookingData.duration);
    return format(end, "HH:mm");
  }, [bookingData.duration, selectedTimeISO]);

  const loadSlots = React.useCallback(
    async (d: Date) => {
      setLoadingSlots(true);
      setSelectedTimeISO(null);
      updateBooking({ date: d.toISOString(), time: null });
      try {
        const res = await getAvailableSlots({ date: toYMD(d), duration: bookingData.duration });
        setSlots(res);
      } catch {
        setSlots(null);
        toast({
          title: "Erro ao carregar horários",
          description: "Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoadingSlots(false);
      }
    },
    [bookingData.duration, toast, updateBooking],
  );

  const onSelectDate = (d?: Date) => {
    if (!d) return;
    if (!isDayAllowed(d)) return;
    setDate(d);
    loadSlots(d);
  };

  const onSelectTime = (iso: string) => {
    setSelectedTimeISO(iso);
    updateBooking({ time: hhmmFromISO(iso) });
  };

  const onBack = () => {
    navigate("/agendar/servico");
  };

  const canConfirm = Boolean(date && selectedTimeISO);

  const onOpenConfirm = () => {
    if (!canConfirm) return;
    setConfirmOpen(true);
  };

  const onFinalConfirm = async () => {
    if (!userId || !bookingData.type || !bookingData.serviceId || !date || !selectedTimeISO) return;

    setSubmitting(true);
    try {
      await createAppointment({
        userId,
        serviceType: bookingData.type,
        serviceId: bookingData.serviceId,
        serviceName: bookingData.serviceName,
        totalPrice: isPlanBooking ? 0 : bookingData.price, // Plano = grátis
        totalDuration: bookingData.duration,
        dateTime: selectedTimeISO,
        isPlanBooking: isPlanBooking,
      });

      toast({
        title: "Agendamento confirmado!",
        description: "Seu horário foi reservado com sucesso.",
      });

      resetBooking();
      navigate("/meus-agendamentos");
    } catch {
      toast({
        title: "Erro ao confirmar agendamento",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const grouped = React.useMemo(() => {
    if (!slots?.slots?.length) return null;
    return groupByPeriod(slots.slots);
  }, [slots]);

  const cancelUntilLabel = React.useMemo(() => {
    if (!selectedTimeISO) return null;
    const start = new Date(selectedTimeISO);
    const cancelUntil = addMinutes(start, -60);
    return format(cancelUntil, "dd/MM 'às' HH:mm");
  }, [selectedTimeISO]);

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
            ESCOLHA DATA E HORÁRIO
          </motion.h1>
          <p className="mt-3 text-base text-foreground md:text-lg">Última etapa para confirmar seu agendamento</p>
        </div>
      </section>

      {/* PROGRESS */}
      <section className="bg-background px-4 py-10 md:px-6 lg:px-8">
        <ProgressBar current={3} />
      </section>

      {/* CONTENT */}
      <section className="bg-background px-4 py-20 pb-40 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-start gap-6 lg:grid-cols-2">
            {/* CALENDAR */}
            <div className="rounded-lg border border-border bg-card p-8 shadow-card">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-foreground" aria-hidden />
                <h2 className="text-base font-extrabold text-foreground">SELECIONE A DATA</h2>
              </div>

              <div className="mt-6">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={onSelectDate}
                  disabled={(d) => !isDayAllowed(d)}
                  modifiers={{ today: new Date() }}
                  className="p-3 pointer-events-auto"
                  classNames={{
                    caption_label: "text-base font-extrabold",
                    head_cell: "text-muted-foreground rounded-md w-9 font-semibold text-[0.75rem] uppercase",
                    day_today: "border border-primary text-primary bg-transparent",
                    day_disabled: "text-muted-foreground opacity-40 line-through",
                  }}
                />
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-6">
              {/* PLAN INFO (se assinante usando plano) */}
              {isPlanBooking && planName && (
                <div className="rounded-lg border-2 border-primary bg-primary/5 p-6 shadow-card">
                  <div className="flex items-center gap-3">
                    {planPriority >= 2 ? (
                      <Crown className="h-6 w-6 text-primary" />
                    ) : planPriority >= 1 ? (
                      <Star className="h-6 w-6 text-primary" />
                    ) : (
                      <Zap className="h-6 w-6 text-primary" />
                    )}
                    <div>
                      <p className="text-sm font-extrabold text-primary">{planName}</p>
                      <p className="text-xs text-muted-foreground">Agendamento pelo plano</p>
                    </div>
                  </div>
                  
                  <div className="my-4 h-px bg-primary/20" aria-hidden />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Dias disponíveis</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{allowedDaysLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sua prioridade</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{priorityLabel}</p>
                    </div>
                  </div>
                  
                  {/* Período válido do plano */}
                  {planPeriod && (
                    <div className="mt-4 rounded-lg bg-primary/10 p-3">
                      <p className="text-xs text-primary">
                        📅 Válido para agendamentos até {format(planPeriod.end, "dd/MM/yyyy")}
                      </p>
                    </div>
                  )}
                  
                  {planPriority > 0 && (
                    <p className="mt-4 text-xs text-primary">
                      ⭐ Horários marcados com estrela são prioritários para você!
                    </p>
                  )}
                </div>
              )}

              {/* SUMMARY */}
              <div className="rounded-lg border border-border bg-card p-6 shadow-card">
                <h2 className="text-base font-extrabold text-primary">✂️ RESUMO DO AGENDAMENTO</h2>
                <div className="my-5 h-px bg-border" aria-hidden />

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">SERVIÇO</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{bookingData.serviceName}</p>
                    {isPlanBooking && (
                      <span className="mt-1 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        Coberto pelo plano
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">DURAÇÃO</p>
                    <p className="mt-1 text-sm text-muted-foreground">{bookingData.duration} minutos</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">VALOR</p>
                    {isPlanBooking ? (
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-lg font-extrabold text-brand-green">{formatBRL(0)}</p>
                        <span className="text-sm text-muted-foreground line-through">{formatBRL(bookingData.price)}</span>
                      </div>
                    ) : (
                      <p className="mt-1 text-lg font-extrabold text-brand-green">{formatBRL(bookingData.price)}</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/agendar/servico")}
                  className="mt-5 text-xs font-bold text-foreground underline-offset-4 hover:underline"
                >
                  Alterar serviço
                </button>
              </div>

              {/* SLOTS */}
              <div className="rounded-lg border border-border bg-card p-6 shadow-card">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-foreground" aria-hidden />
                    <h2 className="text-base font-extrabold text-foreground">
                      {date ? `HORÁRIOS PARA ${format(date, "dd/MM/yyyy")}` : "HORÁRIOS DISPONÍVEIS"}
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground">Duração: {bookingData.duration} min</p>
                </div>

                <div className="my-5 h-px bg-border" aria-hidden />

                {!date ? (
                  <div className="py-10 text-center">
                    <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden />
                    <p className="mt-4 text-sm font-semibold text-foreground">Selecione uma data</p>
                    <p className="mt-2 text-sm text-muted-foreground">para ver os horários disponíveis</p>
                  </div>
                ) : loadingSlots ? (
                  <div className="space-y-4 py-2">
                    <Skeleton className="h-4 w-32" />
                    <div className="grid grid-cols-3 gap-3">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <Skeleton key={i} className="h-10" />
                      ))}
                    </div>
                  </div>
                ) : !grouped || (grouped.morning.length === 0 && grouped.afternoon.length === 0) ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-semibold text-foreground">Nenhum horário disponível nesta data</p>
                    <p className="mt-2 text-sm text-muted-foreground">Escolha outra data no calendário.</p>
                    <div className="mt-6">
                      <Button variant="outline" onClick={() => setDate(undefined)}>
                        Escolher outra data
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {grouped.morning.length ? (
                      <div>
                        <p className="text-xs font-extrabold tracking-[0.16em] text-primary">MANHÃ</p>
                        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                          {grouped.morning.map((iso) => {
                            const selected = iso === selectedTimeISO;
                            const timeStr = hhmmFromISO(iso);
                            const prioritySlots = getPrioritySlots(planPriority);
                            const isPrioritySlot = isPlanBooking && prioritySlots.earlyAccess.includes(timeStr);
                            
                            return (
                              <button
                                key={iso}
                                type="button"
                                onClick={() => onSelectTime(iso)}
                                className={
                                  "relative rounded-lg border px-4 py-3 text-sm font-semibold transition-all " +
                                  (selected
                                    ? "border-primary bg-primary text-primary-foreground shadow-card"
                                    : isPrioritySlot
                                    ? "border-primary/50 bg-primary/5 text-foreground hover:border-primary hover:bg-primary/10"
                                    : "border-border bg-background text-foreground hover:border-primary hover:bg-accent")
                                }
                                aria-pressed={selected}
                              >
                                {isPrioritySlot && !selected && (
                                  <Star className="absolute -right-1 -top-1 h-4 w-4 fill-primary text-primary" />
                                )}
                                {timeStr}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {grouped.afternoon.length ? (
                      <div>
                        <p className="text-xs font-extrabold tracking-[0.16em] text-primary">TARDE</p>
                        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                          {grouped.afternoon.map((iso) => {
                            const selected = iso === selectedTimeISO;
                            const timeStr = hhmmFromISO(iso);
                            const prioritySlots = getPrioritySlots(planPriority);
                            const isPrioritySlot = isPlanBooking && prioritySlots.earlyAccess.includes(timeStr);
                            
                            return (
                              <button
                                key={iso}
                                type="button"
                                onClick={() => onSelectTime(iso)}
                                className={
                                  "relative rounded-lg border px-4 py-3 text-sm font-semibold transition-all " +
                                  (selected
                                    ? "border-primary bg-primary text-primary-foreground shadow-card"
                                    : isPrioritySlot
                                    ? "border-primary/50 bg-primary/5 text-foreground hover:border-primary hover:bg-primary/10"
                                    : "border-border bg-background text-foreground hover:border-primary hover:bg-accent")
                                }
                                aria-pressed={selected}
                              >
                                {isPrioritySlot && !selected && (
                                  <Star className="absolute -right-1 -top-1 h-4 w-4 fill-primary text-primary" />
                                )}
                                {timeStr}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {selectedTimeISO && endTimeLabel ? (
                      <p className="text-center text-xs text-muted-foreground">ℹ️ Término previsto: {endTimeLabel}</p>
                    ) : null}
                  </div>
                )}

                <div className="mt-6 rounded-lg border border-border bg-background p-4">
                  <div className="flex gap-3">
                    <div className="w-1 rounded bg-primary" aria-hidden />
                    <div className="text-xs text-muted-foreground">
                      <p className="font-extrabold text-foreground">⚠️ ATENÇÃO</p>
                      <ul className="mt-2 space-y-1">
                        <li>• Cancelamento grátis até 1h antes</li>
                        <li>• Após esse prazo, não é possível cancelar</li>
                        <li>• Pagamento presencial</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* FINAL SUMMARY */}
              {date && selectedTimeISO && endTimeLabel ? (
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-lg border-2 border-brand-green bg-brand-green/10 p-6 shadow-card"
                >
                  <p className="text-sm font-extrabold text-brand-green">✅ SEU AGENDAMENTO</p>
                  <div className="my-4 h-px bg-border" aria-hidden />
                  <p className="text-sm font-semibold text-foreground">📅 {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    🕐 {hhmmFromISO(selectedTimeISO)} às {endTimeLabel}
                  </p>
                  <p className="mt-3 text-sm text-foreground">✂️ {bookingData.serviceName}</p>
                  <p className="mt-1 text-sm text-foreground">💰 {formatBRL(bookingData.price)}</p>
                  <div className="my-4 h-px bg-border" aria-hidden />
                  <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-4 w-4" aria-hidden />
                    Barbearia Freestyle • Rua Exemplo, 123 - São Paulo
                  </p>
                </motion.div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER FIXO */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-4 py-4 backdrop-blur md:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onBack}>
            ← VOLTAR
          </Button>
          <Button
            variant="success"
            size="xl"
            className="w-full sm:w-auto"
            disabled={!canConfirm}
            onClick={onOpenConfirm}
          >
            CONFIRMAR AGENDAMENTO
          </Button>
        </div>
      </div>

      {/* MODAL CONFIRMAÇÃO */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-xl border-2 border-brand-green bg-card p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-brand-green">✅ CONFIRMAR AGENDAMENTO?</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm text-foreground">
            <p className="text-muted-foreground">Revise os dados antes de confirmar:</p>

            {/* Badge do plano */}
            {isPlanBooking && (
              <div className="rounded-lg border-2 border-primary bg-primary/10 p-3">
                <p className="text-center font-extrabold text-primary">
                  ⭐ Agendamento pelo {planName ?? "Plano"}
                </p>
              </div>
            )}

            <div className="rounded-lg border border-border bg-background p-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">📅 DATA</p>
                  <p className="mt-1 font-semibold">
                    {date ? format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">🕐 HORÁRIO</p>
                  <p className="mt-1 font-semibold">
                    {selectedTimeISO ? hhmmFromISO(selectedTimeISO) : ""}
                    {endTimeLabel ? ` (término previsto: ${endTimeLabel})` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">✂️ SERVIÇO</p>
                  <p className="mt-1 font-semibold">{bookingData.serviceName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">💰 VALOR</p>
                  {isPlanBooking ? (
                    <p className="mt-1 font-extrabold text-brand-green">
                      R$ 0,00 <span className="text-sm font-normal text-muted-foreground">(coberto pelo plano)</span>
                    </p>
                  ) : (
                    <p className="mt-1 font-extrabold text-brand-green">{formatBRL(bookingData.price)} (pagamento presencial)</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-extrabold text-foreground">⚠️ IMPORTANTE:</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>• Chegue com 5 minutos de antecedência</li>
                <li>• Cancelamento grátis até {cancelUntilLabel ?? "1h antes"}</li>
                <li>• Faltas resultam em suspensão</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              CANCELAR
            </Button>
            <Button variant="success" onClick={onFinalConfirm} disabled={submitting}>
              {submitting ? "CONFIRMANDO..." : (
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4" /> SIM, CONFIRMAR
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
