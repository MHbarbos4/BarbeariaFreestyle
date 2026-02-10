import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { getAnnouncements, type Announcement } from "@/services/api/announcementService";
import {
  cancelAppointment,
  getNextAppointmentByUser,
  type Appointment,
} from "@/services/api/appointmentService";
import {
  createPlanRequest,
  getMyPlan,
  type PlanType,
  type Plan,
} from "@/services/api/planService";

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    dateLong: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "☀️ Bom dia";
  if (h >= 12 && h < 18) return "🌤️ Boa tarde";
  return "🌙 Boa noite";
}

function formatRemaining(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}min ${String(sec).padStart(2, "0")}s`;
}

const scheduleSchema = z.string().trim().min(3).max(80);

const scheduleOptions = [
  "Segunda-feira às 9h",
  "Segunda-feira às 14h",
  "Terça-feira às 10h",
  "Terça-feira às 15h",
  "Quarta-feira às 9h",
  "Quarta-feira às 14h",
  "Quinta-feira às 10h",
  "Quinta-feira às 15h",
  "Sexta-feira às 9h",
  "Sexta-feira às 14h",
  "Sábado às 10h",
  "Sábado às 13h",
] as const;

const PLAN_DETAILS = {
  basic: {
    name: "Plano Básico",
    price: 120,
    features: [
      "4 cortes por mês",
      "Agendamento prioritário",
      "Economia de R$ 40",
    ],
  },
  premium: {
    name: "Plano Premium",
    price: 200,
    features: [
      "Cortes ilimitados",
      "Prioridade máxima",
      "Desconto em produtos",
      "1 química grátis por mês",
    ],
  },
} as const;

export default function Dashboard() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { user, isSuspended } = useAuth();

  // Verifica suspensão ao carregar
  const suspended = isSuspended;

  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = React.useState(true);
  const [annError, setAnnError] = React.useState<string | null>(null);

  const [nextAppt, setNextAppt] = React.useState<Appointment | null>(null);
  const [apptLoading, setApptLoading] = React.useState(true);
  const [apptError, setApptError] = React.useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  const [planOpen, setPlanOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState<PlanType>("premium");
  const [selectedSchedule, setSelectedSchedule] = React.useState<string>("");
  const [planLoading, setPlanLoading] = React.useState(false);

  const [myPlan, setMyPlan] = React.useState<Plan | null>(null);
  const [myPlanLoading, setMyPlanLoading] = React.useState(true);

  const [remainingMs, setRemainingMs] = React.useState<number | null>(null);

  const loadAnnouncements = React.useCallback(async () => {
    setAnnLoading(true);
    setAnnError(null);
    try {
      const data = await getAnnouncements();
      setAnnouncements(data.filter((a) => a.isActive));
    } catch {
      setAnnError("Não foi possível carregar os avisos agora.");
    } finally {
      setAnnLoading(false);
    }
  }, []);

  const loadNextAppointment = React.useCallback(async () => {
    if (!user) return;
    setApptLoading(true);
    setApptError(null);
    try {
      const appt = await getNextAppointmentByUser(user.id);
      setNextAppt(appt);
    } catch {
      setApptError("Não foi possível carregar seu próximo agendamento.");
    } finally {
      setApptLoading(false);
    }
  }, [user]);

  const loadMyPlan = React.useCallback(async () => {
    if (!user) return;
    setMyPlanLoading(true);
    try {
      const plan = await getMyPlan(user.id);
      setMyPlan(plan);
    } catch {
      // Usuário não tem plano
      setMyPlan(null);
    } finally {
      setMyPlanLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    void loadAnnouncements();
    void loadNextAppointment();
    void loadMyPlan();
  }, [loadAnnouncements, loadNextAppointment, loadMyPlan]);

  // auto-refresh leve
  React.useEffect(() => {
    const id = window.setInterval(() => {
      void loadAnnouncements();
      void loadNextAppointment();
      void loadMyPlan();
    }, 120_000);
    return () => window.clearInterval(id);
  }, [loadAnnouncements, loadNextAppointment, loadMyPlan]);

  // Timer de cancelamento (até 1h antes do início)
  React.useEffect(() => {
    if (!nextAppt) {
      setRemainingMs(null);
      return;
    }

    const cancelUntil = new Date(nextAppt.startsAt).getTime() - 60 * 60_000;

    const tick = () => setRemainingMs(cancelUntil - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [nextAppt]);

  const greeting = getGreeting();
  const userName = user?.name || localStorage.getItem("userName") || "Cliente";

  const canCancel = remainingMs !== null && remainingMs > 0;
  const remainingText = remainingMs === null ? "--" : remainingMs <= 0 ? "Cancelamento não disponível" : formatRemaining(remainingMs);
  const timerClass =
    remainingMs !== null && remainingMs > 0 && remainingMs <= 60 * 60_000
      ? "text-destructive"
      : "text-primary";

  const onCancelConfirmed = async () => {
    if (!user || !nextAppt) return;
    if (!canCancel) {
      toast({ title: "Cancelamento indisponível", description: "O prazo de cancelamento já passou." });
      setCancelOpen(false);
      return;
    }

    try {
      await cancelAppointment({ id: nextAppt.id, userId: user.id });
      toast({ title: "Agendamento cancelado", description: "Agendamento cancelado com sucesso." });
      setCancelOpen(false);
      await loadNextAppointment();
    } catch {
      toast({ title: "Erro", description: "Não foi possível cancelar agora." });
    }
  };

  const onOpenPlan = (plan: PlanType) => {
    // Verifica se já tem plano ativo ou pendente
    if (myPlan?.status === "approved") {
      toast({
        title: "Você já tem um plano ativo!",
        description: `Seu ${PLAN_DETAILS[myPlan.planType].name} está ativo.`,
        variant: "destructive",
      });
      return;
    }
    if (myPlan?.status === "pending") {
      toast({
        title: "Solicitação pendente",
        description: "Você já tem uma solicitação de plano aguardando aprovação.",
        variant: "destructive",
      });
      return;
    }

    setSelectedPlan(plan);
    setSelectedSchedule("");
    setPlanOpen(true);
  };

  const onRequestPlan = async () => {
    if (!user) return;

    if (!selectedSchedule) {
      toast({
        title: "Selecione um horário",
        description: "Escolha seu horário preferido para continuar.",
        variant: "destructive",
      });
      return;
    }

    const parsed = scheduleSchema.safeParse(selectedSchedule);
    if (!parsed.success) {
      toast({ title: "Horário inválido", description: "Selecione um horário válido." });
      return;
    }

    setPlanLoading(true);
    try {
      await createPlanRequest({ userId: user.id, planType: selectedPlan, selectedSchedule });
      toast({
        title: "Solicitação enviada! 🎉",
        description: "Aguarde aprovação. Você receberá confirmação em breve.",
      });
      setPlanOpen(false);
      setSelectedSchedule("");
      await loadMyPlan();
    } catch {
      toast({
        title: "Erro ao enviar solicitação",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPlanLoading(false);
    }
  };

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8">
      {/* ALERTA DE SUSPENSÃO */}
      {suspended && (
        <section className="bg-destructive/10 px-4 py-4 md:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-lg border-2 border-destructive/30 bg-destructive/5 p-4 flex items-center gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-destructive/20">
                <span className="text-xl">🚫</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-destructive">Agendamento bloqueado</p>
                <p className="text-sm text-destructive/80">
                  Sua conta está suspensa devido a uma falta não justificada. Entre em contato com o estabelecimento para regularizar.
                </p>
              </div>
              <a 
                href="tel:+5500000000000" 
                className="text-sm font-semibold text-destructive underline hover:no-underline"
              >
                Ligar
              </a>
            </div>
          </div>
        </section>
      )}

      {/* HERO */}
      <section className="bg-background px-4 py-16 text-center md:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-3xl font-extrabold tracking-tight text-primary md:text-5xl"
          >
            {greeting}, {userName}!
          </motion.h1>
          <p className="mt-3 text-base text-foreground md:text-lg">Bem-vindo de volta</p>
        </div>
      </section>

      {/* AVISOS */}
      {!annLoading && !annError && announcements.length === 0 ? null : (
        <section className="bg-background px-4 py-10 md:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-lg font-extrabold tracking-tight text-primary">📢 AVISOS IMPORTANTES</h2>

            <div className="mx-auto mt-8 max-w-3xl space-y-3">
              {annLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-5 shadow-card">
                    <div className="h-4 w-1/2 rounded bg-border" />
                    <div className="mt-3 h-3 w-full rounded bg-border" />
                    <div className="mt-2 h-3 w-5/6 rounded bg-border" />
                  </div>
                ))
              ) : annError ? (
                <div className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">{annError}</div>
              ) : (
                announcements.map((a) => (
                  <article key={String(a.id)} className="rounded-lg border border-border bg-card p-5 shadow-card">
                    <div className="flex gap-4">
                      <div className="w-1 rounded bg-primary" aria-hidden />
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-foreground">{a.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{a.content}</p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* PRÓXIMO AGENDAMENTO */}
      <section className="bg-card px-4 py-20 md:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">📅 PRÓXIMO AGENDAMENTO</h2>

          <div className="mx-auto mt-10 max-w-3xl rounded-lg border border-border bg-background p-10 shadow-card">
            {apptLoading ? (
              <div>
                <div className="h-5 w-2/3 rounded bg-border" />
                <div className="mt-4 h-4 w-1/2 rounded bg-border" />
                <div className="mt-10 h-10 w-full rounded bg-border" />
              </div>
            ) : apptError ? (
              <p className="text-sm text-muted-foreground">{apptError}</p>
            ) : !nextAppt ? (
              <div className="text-center">
                <div className="text-5xl text-muted-foreground" aria-hidden>
                  📆
                </div>
                <p className="mt-4 text-base font-semibold text-foreground">Nenhum agendamento ativo</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {suspended ? "Regularize sua situação para agendar." : "Que tal agendar um horário?"}
                </p>
                <div className="mt-8">
                  <Button 
                    variant="hero" 
                    size="xl" 
                    onClick={() => navigate("/agendar")}
                    disabled={suspended}
                  >
                    {suspended ? "AGENDAMENTO BLOQUEADO" : "AGENDAR AGORA"}
                  </Button>
                </div>
              </div>
            ) : (
              <NextAppointmentCard
                appt={nextAppt}
                canCancel={canCancel}
                remainingText={remainingText}
                timerClass={timerClass}
                onCancel={() => setCancelOpen(true)}
                onDetails={() => setDetailsOpen(true)}
              />
            )}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section className="bg-background px-4 py-20 md:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">💎 PLANOS MENSAIS</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-muted-foreground md:text-base">
            Economia e praticidade para você
          </p>

          {myPlanLoading ? (
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-10">
                  <div className="h-4 w-1/3 rounded bg-border" />
                  <div className="mt-6 h-10 w-1/2 rounded bg-border" />
                  <div className="mt-6 space-y-2">
                    <div className="h-3 w-full rounded bg-border" />
                    <div className="h-3 w-5/6 rounded bg-border" />
                    <div className="h-3 w-4/6 rounded bg-border" />
                  </div>
                  <div className="mt-8 h-12 w-full rounded bg-border" />
                </div>
              ))}
            </div>
          ) : myPlan?.status === "approved" ? (
            <div className="mx-auto mt-10 max-w-2xl">
              <div className="rounded-xl border-2 border-brand-green bg-brand-green/5 p-10 text-center">
                <div className="text-5xl">✅</div>
                <h3 className="mt-4 text-2xl font-extrabold text-foreground">Você já tem um plano ativo!</h3>
                <p className="mt-2 text-xl font-extrabold text-brand-green">
                  {PLAN_DETAILS[myPlan.planType].name}
                </p>
                <div className="mx-auto mt-6 h-px w-2/3 bg-border" />
                <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                  <p>📅 Horário fixo: <span className="text-foreground font-semibold">{myPlan.selectedSchedule}</span></p>
                  <p>💰 Valor: <span className="text-brand-green font-extrabold">{formatBRL(PLAN_DETAILS[myPlan.planType].price)}/mês</span></p>
                </div>
                <ul className="mx-auto mt-6 max-w-xs space-y-1 text-left text-sm text-muted-foreground">
                  {PLAN_DETAILS[myPlan.planType].features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : myPlan?.status === "pending" ? (
            <div className="mx-auto mt-10 max-w-2xl">
              <div className="rounded-xl border-2 border-primary bg-primary/5 p-10 text-center">
                <div className="text-5xl">⏳</div>
                <h3 className="mt-4 text-2xl font-extrabold text-foreground">Solicitação em análise</h3>
                <p className="mt-2 text-xl font-extrabold text-primary">
                  {PLAN_DETAILS[myPlan.planType].name}
                </p>
                <div className="mx-auto mt-6 h-px w-2/3 bg-border" />
                <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                  <p>📅 Horário solicitado: <span className="text-foreground font-semibold">{myPlan.selectedSchedule}</span></p>
                  <p>💰 Valor: <span className="text-primary font-extrabold">{formatBRL(PLAN_DETAILS[myPlan.planType].price)}/mês</span></p>
                </div>
                <p className="mt-6 text-sm text-muted-foreground">
                  Você receberá confirmação em breve. O pagamento será presencial após aprovação.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              <PlanCard
                tone="green"
                title="PLANO BÁSICO"
                priceLabel="R$ 120"
                features={["✓ 4 cortes por mês", "✓ Agendamento prioritário", "✓ Economia de R$ 40"]}
                buttonVariant="success"
                onClick={() => onOpenPlan("basic")}
              />

              <PlanCard
                tone="primary"
                title="PLANO PREMIUM"
                badge="POPULAR"
                priceLabel="R$ 200"
                features={["✓ Cortes ilimitados", "✓ Prioridade máxima", "✓ Desconto em produtos", "✓ 1 química grátis/mês"]}
                buttonVariant="hero"
                onClick={() => onOpenPlan("premium")}
              />
            </div>
          )}
        </div>
      </section>

      {/* AÇÕES RÁPIDAS */}
      <section className="bg-card px-4 py-20 md:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">ACESSO RÁPIDO</h2>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <QuickAction
              icon="📅"
              title="AGENDAR HORÁRIO"
              onClick={() => navigate("/agendar")}
            />
            <QuickAction
              icon="📜"
              title="HISTÓRICO"
              onClick={() => navigate("/meus-agendamentos")}
            />
            <QuickAction
              icon="👕"
              title="PRODUTOS"
              onClick={() => navigate("/produtos")}
            />
          </div>
        </div>
      </section>

      {/* MODAL CANCELAR */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle className="text-destructive">⚠️ CANCELAR AGENDAMENTO</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem certeza que deseja cancelar?
            </DialogDescription>
          </DialogHeader>

          {nextAppt ? (
            <div className="mt-2 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
              <p>
                Agendamento: {formatDateTime(nextAppt.startsAt).dateLong} às {formatDateTime(nextAppt.startsAt).time}
              </p>
              <p className="mt-2">{nextAppt.serviceName}</p>
            </div>
          ) : null}

          <div className="mt-5 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setCancelOpen(false)}>
              NÃO, MANTER
            </Button>
            <Button variant="danger" className="flex-1" onClick={onCancelConfirmed}>
              SIM, CANCELAR
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALHES */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle className="text-primary">📅 DETALHES DO AGENDAMENTO</DialogTitle>
            <DialogDescription className="text-muted-foreground">Informações do seu próximo horário.</DialogDescription>
          </DialogHeader>

          {nextAppt ? <AppointmentDetails appt={nextAppt} remainingMs={remainingMs} /> : null}

          <div className="mt-5">
            <Button variant="outline" className="w-full" onClick={() => setDetailsOpen(false)}>
              FECHAR
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL PLANO */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent
          className={
            "max-w-[600px] border-2 bg-background p-10 " +
            (selectedPlan === "premium" ? "border-primary" : "border-brand-green")
          }
        >
          <DialogHeader>
            <DialogTitle
              className={
                "text-2xl font-extrabold tracking-tight " +
                (selectedPlan === "premium" ? "text-primary" : "text-brand-green")
              }
            >
              💎 ASSINAR {selectedPlan === "premium" ? "PLANO PREMIUM" : "PLANO BÁSICO"}
            </DialogTitle>
          </DialogHeader>

          <div className="mx-auto my-4 h-px w-full bg-border" />

          {/* Detalhes do plano */}
          <div>
            <p className="text-sm font-extrabold tracking-[0.12em] text-foreground">📋 DETALHES DO PLANO:</p>
            <ul className="mt-4 space-y-2 text-base text-foreground">
              {PLAN_DETAILS[selectedPlan].features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <p
              className={
                "mt-6 text-xl font-extrabold " +
                (selectedPlan === "premium" ? "text-primary" : "text-brand-green")
              }
            >
              💰 VALOR: {formatBRL(PLAN_DETAILS[selectedPlan].price)}/mês
            </p>
          </div>

          <div className="mx-auto my-4 h-px w-full bg-border" />

          {/* Horário preferido */}
          <div>
            <p className="text-sm font-extrabold tracking-[0.12em] text-foreground">
              🕐 ESCOLHA SEU HORÁRIO PREFERIDO: <span className="text-destructive">*</span>
            </p>
            <div className="mt-3">
              <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
                <SelectTrigger className="h-12 bg-background text-base">
                  <SelectValue placeholder="Selecione um horário..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 bg-background">
                  {scheduleOptions.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-base">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mx-auto my-4 h-px w-full bg-border" />

          {/* Aviso importante */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
            <p className="text-sm font-extrabold tracking-[0.12em] text-primary">⚠️ IMPORTANTE:</p>
            <ul className="mt-3 space-y-1 text-sm text-primary/80">
              <li>• Sua solicitação será analisada</li>
              <li>• Você receberá confirmação em breve</li>
              <li>• Pagamento presencial após aprovação</li>
              <li>• O horário escolhido será reservado automaticamente todas as semanas</li>
            </ul>
          </div>

          <div className="mx-auto my-4 h-px w-full bg-border" />

          {/* Botões */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setPlanOpen(false)} disabled={planLoading}>
              CANCELAR
            </Button>
            <Button
              variant={selectedPlan === "premium" ? "hero" : "success"}
              className="flex-1"
              onClick={onRequestPlan}
              disabled={planLoading || !selectedSchedule}
            >
              {planLoading ? "ENVIANDO..." : "SOLICITAR PLANO"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NextAppointmentCard({
  appt,
  canCancel,
  remainingText,
  timerClass,
  onCancel,
  onDetails,
}: {
  appt: Appointment;
  canCancel: boolean;
  remainingText: string;
  timerClass: string;
  onCancel: () => void;
  onDetails: () => void;
}) {
  const { dateLong, time } = formatDateTime(appt.startsAt);
  const endsAt = addMinutes(appt.startsAt, appt.durationMinutes);
  const endTime = formatDateTime(endsAt).time;

  return (
    <div>
      <div className="text-center">
        <p className="text-sm font-extrabold tracking-[0.16em] text-muted-foreground">🕐 {dateLong}</p>
        <p className="mt-2 text-3xl font-extrabold tracking-tight text-primary">às {time}</p>
      </div>

      <div className="mt-8 grid gap-6 border-t border-border pt-8">
        <div>
          <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">✂️ SERVIÇO</p>
          <p className="mt-2 text-base font-semibold text-foreground">{appt.serviceName}</p>
        </div>
        <div>
          <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">⏱️ DURAÇÃO</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {appt.durationMinutes} minutos (término: {endTime})
          </p>
        </div>
        <div>
          <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">💰 VALOR</p>
          <p className="mt-2 text-base font-extrabold text-brand-green">{formatBRL(appt.price)}</p>
        </div>

        <div className="border-t border-border pt-6">
          <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">⏳ CANCELAMENTO DISPONÍVEL ATÉ</p>
          <p className={"mt-2 text-lg font-extrabold " + timerClass + (canCancel ? "" : "")}>{remainingText}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="danger" className="w-full" onClick={onCancel} disabled={!canCancel}>
            CANCELAR AGENDAMENTO
          </Button>
          <Button variant="outline" className="w-full" onClick={onDetails}>
            DETALHES
          </Button>
        </div>
      </div>
    </div>
  );
}

function AppointmentDetails({ appt, remainingMs }: { appt: Appointment; remainingMs: number | null }) {
  const { dateLong, time } = formatDateTime(appt.startsAt);
  const endsAt = addMinutes(appt.startsAt, appt.durationMinutes);
  const endTime = formatDateTime(endsAt).time;
  const cancelUntil = new Date(appt.startsAt).getTime() - 60 * 60_000;
  const cancelUntilText = new Date(cancelUntil).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const cancelClass = remainingMs !== null && remainingMs > 0 && remainingMs <= 60 * 60_000 ? "text-destructive" : "text-primary";

  return (
    <div className="mt-3 space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📅 DATA E HORA</p>
        <p className="mt-2 text-sm font-semibold text-foreground">
          {dateLong} às {time}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">⏱️ DURAÇÃO</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {appt.durationMinutes} minutos (término: {endTime})
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">✂️ SERVIÇO</p>
        <p className="mt-2 text-sm font-semibold text-foreground">{appt.serviceName}</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">💰 VALOR</p>
        <p className="mt-2 text-sm font-extrabold text-brand-green">{formatBRL(appt.price)}</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📍 LOCAL</p>
        <p className="mt-2 text-sm text-muted-foreground">Barbearia Freestyle — Rua Exemplo, 123 - São Paulo</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">⏳ Cancelar até</p>
        <p className={"mt-2 text-sm font-extrabold " + cancelClass}>{cancelUntilText}</p>
      </div>
    </div>
  );
}

function PlanCard({
  title,
  priceLabel,
  features,
  badge,
  tone,
  buttonVariant,
  onClick,
}: {
  title: string;
  priceLabel: string;
  features: string[];
  badge?: string;
  tone: "primary" | "green";
  buttonVariant: "hero" | "success";
  onClick: () => void;
}) {
  const borderClass = tone === "primary" ? "border-primary" : "border-brand-green";
  const priceClass = tone === "primary" ? "text-primary" : "text-brand-green";

  return (
    <div className={"relative flex flex-col rounded-lg border-2 bg-card p-10 shadow-card transition-transform duration-300 hover:-translate-y-1 " + borderClass}>
      {badge ? (
        <span className="absolute right-4 top-4 rounded-tight bg-primary px-3 py-1 text-xs font-black text-primary-foreground">
          {badge}
        </span>
      ) : null}
      <p className={"text-sm font-extrabold tracking-[0.16em] " + priceClass}>{title}</p>
      <p className={"mt-6 text-4xl font-extrabold " + priceClass}>{priceLabel}</p>
      <p className="mt-1 text-sm text-muted-foreground">/mês</p>
      <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
        {features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <div className="mt-auto pt-8">
        <Button variant={buttonVariant} size="xl" className="w-full rounded-tight" onClick={onClick}>
          ASSINAR PLANO
        </Button>
      </div>
    </div>
  );
}

function QuickAction({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-border bg-background p-8 text-center shadow-card transition-transform duration-300 hover:-translate-y-1 hover:border-primary"
    >
      <div className="text-5xl" aria-hidden>
        {icon}
      </div>
      <p className="mt-5 text-sm font-extrabold tracking-[0.16em] text-foreground">{title}</p>
    </button>
  );
}
