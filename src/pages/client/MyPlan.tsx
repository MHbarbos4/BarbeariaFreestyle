import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  CalendarCheck, 
  Check, 
  ChevronRight, 
  Clock, 
  Crown, 
  Gift, 
  Scissors, 
  ShoppingBag, 
  Sparkles, 
  Star, 
  XCircle,
  Zap,
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { getMyPlan, FIXED_PLANS, type Plan, type PlanType, type PlanIncludes } from "@/services/api/planService";
import { getMyAppointments, type Appointment } from "@/services/api/appointmentService";

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

// Retorna nome do plano
function getPlanDisplayName(planType: PlanType): string {
  if (planType === "custom") return "Plano Personalizado";
  const plan = FIXED_PLANS[planType as keyof typeof FIXED_PLANS];
  return plan?.name ?? planType;
}

// Retorna preço do plano
function getPlanPrice(planType: PlanType): number {
  if (planType === "custom") return 0; // Personalizado não tem preço fixo
  const plan = FIXED_PLANS[planType as keyof typeof FIXED_PLANS];
  return plan?.price ?? 0;
}

// Retorna ícone do plano
function getPlanIcon(planType: PlanType) {
  switch (planType) {
    case "club-vip": return Crown;
    case "club-combo": return Star;
    default: return Zap;
  }
}

// Retorna cor do plano
function getPlanColor(planType: PlanType): string {
  switch (planType) {
    case "club-vip": return "text-yellow-500";
    case "club-combo": return "text-primary";
    default: return "text-brand-green";
  }
}

// Retorna label dos dias permitidos
function getAllowedDaysLabel(includes?: PlanIncludes | null): string {
  if (!includes?.allowedDays) return "Segunda a Quinta";
  const days = includes.allowedDays;
  if (days.includes("sab")) return "Segunda a Sábado";
  if (days.includes("sex")) return "Segunda a Sexta";
  return "Segunda a Quinta";
}

// Retorna label da prioridade
function getPriorityLabel(includes?: PlanIncludes | null): string {
  if (!includes?.priority) return "Normal";
  switch (includes.priority) {
    case "max": return "Máxima";
    case "medium": return "Média";
    default: return "Normal";
  }
}

export default function MyPlan() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);

  // Carrega plano e agendamentos
  React.useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/login", { replace: true });
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [planData, appointmentsData] = await Promise.all([
          getMyPlan(user.id),
          getMyAppointments(user.id),
        ]);
        setPlan(planData);
        setAppointments(appointmentsData);
      } catch {
        // Erro silencioso
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAuthenticated, user, navigate]);

  // Calcula estatísticas do mês atual (apenas agendamentos pelo plano)
  const monthStats = React.useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Filtra apenas agendamentos do plano no mês atual
    const monthAppointments = appointments.filter(apt => {
      const aptDate = parseISO(apt.startsAt);
      return isWithinInterval(aptDate, { start: monthStart, end: monthEnd }) &&
             apt.status !== "canceled" &&
             apt.isPlanBooking; // Apenas agendamentos pelo plano
    });

    // Conta cortes realizados pelo plano
    const cuts = monthAppointments.filter(apt => {
      const name = apt.serviceName?.toLowerCase() ?? "";
      const id = apt.serviceId?.toLowerCase() ?? "";
      return name.includes("social") || 
             name.includes("degradê") || 
             name.includes("degrade") ||
             name.includes("contornado") ||
             name.includes("infantil") ||
             id.includes("social") ||
             id.includes("degrade") ||
             id.includes("contornado") ||
             id.includes("infantil");
    }).length;

    // Conta barbas pelo plano
    const beards = monthAppointments.filter(apt => {
      const name = apt.serviceName?.toLowerCase() ?? "";
      const id = apt.serviceId ?? "";
      return name === "barba" || id === "barba";
    }).length;

    const eyebrows = monthAppointments.filter(apt => {
      const name = apt.serviceName?.toLowerCase() ?? "";
      const id = apt.serviceId ?? "";
      return name === "sobrancelha" || id === "sobrancelha";
    }).length;

    return {
      total: monthAppointments.length,
      cuts,
      beards,
      eyebrows,
      monthName: format(now, "MMMM 'de' yyyy", { locale: ptBR }),
    };
  }, [appointments]);

  // Próximo agendamento
  const nextAppointment = React.useMemo(() => {
    const now = new Date();
    return appointments
      .filter(apt => parseISO(apt.startsAt) > now && apt.status !== "canceled")
      .sort((a, b) => parseISO(a.startsAt).getTime() - parseISO(b.startsAt).getTime())[0];
  }, [appointments]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 md:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Se não tem plano ativo
  if (!plan || plan.status !== "approved") {
    return (
      <div className="min-h-screen bg-background px-4 py-10 md:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Crown className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">Você ainda não tem um plano ativo</h1>
            <p className="mt-2 text-muted-foreground">
              {plan?.status === "pending" 
                ? "Sua solicitação está aguardando aprovação." 
                : "Assine um plano e aproveite benefícios exclusivos!"}
            </p>

            {plan?.status === "pending" && (
              <div className="mx-auto mt-6 max-w-md rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="text-sm font-semibold text-yellow-600">⏳ Solicitação pendente</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Plano: {getPlanDisplayName(plan.planType)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Solicitado em: {format(parseISO(plan.requestedAt), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              </div>
            )}

            <Button
              variant="hero"
              size="xl"
              className="mt-8"
              onClick={() => navigate("/planos")}
            >
              <Sparkles className="mr-2 h-5 w-5" />
              VER PLANOS
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  const PlanIcon = getPlanIcon(plan.planType);
  const planColor = getPlanColor(plan.planType);
  const includes = plan.includes;

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <section className="bg-gradient-to-b from-primary/10 to-background px-4 py-10 md:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 ${planColor}`}>
                <PlanIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Seu plano ativo</p>
                <h1 className="text-2xl font-extrabold text-foreground">{getPlanDisplayName(plan.planType)}</h1>
              </div>
            </div>

            {plan.approvedAt && (
              <p className="mt-3 text-sm text-muted-foreground">
                Ativo desde {format(parseISO(plan.approvedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="px-4 py-10 md:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* CARD PRINCIPAL - BENEFÍCIOS */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-lg border-2 border-primary bg-card p-6 shadow-card"
          >
            <h2 className="text-lg font-extrabold text-primary">✨ Seus Benefícios</h2>
            
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {/* Cortes */}
              <div className="flex items-center gap-3 rounded-lg bg-background p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green/10">
                  <Scissors className="h-5 w-5 text-brand-green" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Cortes</p>
                  <p className="text-xs text-muted-foreground">
                    {includes?.unlimitedCuts ? "Ilimitados" : "4 por mês"}
                  </p>
                </div>
                {includes?.unlimitedCuts && <Check className="ml-auto h-5 w-5 text-brand-green" />}
              </div>

              {/* Barba */}
              <div className="flex items-center gap-3 rounded-lg bg-background p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${includes?.unlimitedBeard ? "bg-brand-green/10" : "bg-muted"}`}>
                  <Sparkles className={`h-5 w-5 ${includes?.unlimitedBeard ? "text-brand-green" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Barba</p>
                  <p className="text-xs text-muted-foreground">
                    {includes?.unlimitedBeard ? "Ilimitada" : "Não incluída"}
                  </p>
                </div>
                {includes?.unlimitedBeard && <Check className="ml-auto h-5 w-5 text-brand-green" />}
              </div>

              {/* Sobrancelha */}
              <div className="flex items-center gap-3 rounded-lg bg-background p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${includes?.eyebrowIncluded ? "bg-brand-green/10" : "bg-muted"}`}>
                  <Gift className={`h-5 w-5 ${includes?.eyebrowIncluded ? "text-brand-green" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Sobrancelha</p>
                  <p className="text-xs text-muted-foreground">
                    {includes?.eyebrowIncluded ? "Incluída" : "Não incluída"}
                  </p>
                </div>
                {includes?.eyebrowIncluded && <Check className="ml-auto h-5 w-5 text-brand-green" />}
              </div>

              {/* Desconto */}
              <div className="flex items-center gap-3 rounded-lg bg-background p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${includes?.productDiscount ? "bg-brand-green/10" : "bg-muted"}`}>
                  <ShoppingBag className={`h-5 w-5 ${includes?.productDiscount ? "text-brand-green" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Desconto em Produtos</p>
                  <p className="text-xs text-muted-foreground">
                    {includes?.productDiscount ? `${includes.productDiscount}% de desconto` : "Sem desconto"}
                  </p>
                </div>
                {includes?.productDiscount ? <Check className="ml-auto h-5 w-5 text-brand-green" /> : null}
              </div>
            </div>

            {/* Dias e Prioridade */}
            <div className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Dias disponíveis</p>
                  <p className="text-xs text-muted-foreground">{getAllowedDaysLabel(includes)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Prioridade</p>
                  <p className="text-xs text-muted-foreground">{getPriorityLabel(includes)}</p>
                </div>
              </div>
            </div>

            {/* Valor */}
            {getPlanPrice(plan.planType) > 0 && (
              <div className="mt-6 border-t border-border pt-6">
                <p className="text-sm text-muted-foreground">Valor mensal</p>
                <p className="text-2xl font-extrabold text-brand-green">{formatBRL(getPlanPrice(plan.planType))}</p>
              </div>
            )}
          </motion.div>

          {/* ESTATÍSTICAS DO MÊS */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-lg border border-border bg-card p-6 shadow-card"
          >
            <h2 className="text-lg font-extrabold text-foreground">📊 Uso em {monthStats.monthName}</h2>
            
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-background p-4 text-center">
                <p className="text-3xl font-extrabold text-primary">{monthStats.cuts}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {includes?.unlimitedCuts 
                    ? "Cortes realizados" 
                    : `Cortes (de 4 disponíveis)`}
                </p>
                {!includes?.unlimitedCuts && monthStats.cuts < 4 && (
                  <p className="mt-1 text-xs text-brand-green">
                    {4 - monthStats.cuts} restantes
                  </p>
                )}
                {!includes?.unlimitedCuts && monthStats.cuts >= 4 && (
                  <p className="mt-1 text-xs text-destructive">
                    Limite atingido
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-background p-4 text-center">
                <p className="text-3xl font-extrabold text-primary">{monthStats.beards}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {includes?.unlimitedBeard ? "Barbas realizadas" : "Barbas"}
                </p>
                {!includes?.unlimitedBeard && monthStats.beards === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Não incluída
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-background p-4 text-center">
                <p className="text-3xl font-extrabold text-primary">{monthStats.total}</p>
                <p className="mt-1 text-sm text-muted-foreground">Total de serviços</p>
              </div>
            </div>

            {includes?.unlimitedCuts && (
              <p className="mt-4 text-center text-sm text-brand-green">
                ♾️ Você tem cortes ilimitados! Aproveite!
              </p>
            )}
            {includes?.unlimitedBeard && (
              <p className="mt-2 text-center text-sm text-brand-green">
                ♾️ Barba ilimitada incluída!
              </p>
            )}
          </motion.div>

          {/* PRÓXIMO AGENDAMENTO */}
          {nextAppointment && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="rounded-lg border border-border bg-card p-6 shadow-card"
            >
              <h2 className="text-lg font-extrabold text-foreground">📅 Próximo Agendamento</h2>
              
              <div className="mt-4 flex items-center gap-4 rounded-lg bg-primary/5 p-4">
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-lg font-extrabold">{format(parseISO(nextAppointment.startsAt), "dd")}</span>
                  <span className="text-xs uppercase">{format(parseISO(nextAppointment.startsAt), "MMM", { locale: ptBR })}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{nextAppointment.serviceName}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(nextAppointment.startsAt), "EEEE 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </motion.div>
          )}

          {/* AÇÕES */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Button
              variant="hero"
              size="lg"
              className="flex-1"
              onClick={() => navigate("/agendar")}
            >
              <CalendarCheck className="mr-2 h-5 w-5" />
              AGENDAR AGORA
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => navigate("/meus-agendamentos")}
            >
              <Clock className="mr-2 h-5 w-5" />
              MEUS AGENDAMENTOS
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
