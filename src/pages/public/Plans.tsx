import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Crown, Sparkles, Star, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  createPlanRequest,
  getMyPlan,
  FIXED_PLANS,
  CUSTOM_PLAN_OPTIONS,
  calculateCustomPlanPrice,
  getRecommendation,
  type PlanType,
  type Plan as PlanData,
  type CustomPlanSelection,
  type PlanRecommendation,
} from "@/services/api/planService";

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function Section({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      className={className}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}

const planIcons = {
  "club-corte": Zap,
  "club-combo": Star,
  "club-vip": Crown,
};

const planColors = {
  "club-corte": {
    border: "border-brand-green",
    text: "text-brand-green",
    bg: "bg-brand-green",
    button: "success" as const,
  },
  "club-combo": {
    border: "border-primary",
    text: "text-primary",
    bg: "bg-primary",
    button: "hero" as const,
  },
  "club-vip": {
    border: "border-destructive",
    text: "text-destructive",
    bg: "bg-destructive",
    button: "danger" as const,
  },
};

export default function Plans() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [planOpen, setPlanOpen] = useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState<PlanType>("club-corte");
  const [planLoading, setPlanLoading] = useState(false);
  const [myPlan, setMyPlan] = useState<PlanData | null>(null);

  // Estado do plano personalizado
  const [customSelection, setCustomSelection] = useState<CustomPlanSelection>({
    unlimitedCuts: false,
    unlimitedBeard: false,
    eyebrowIncluded: false,
    addFriday: false,
    addSaturday: false,
    priority: "normal",
    productDiscount: 0,
    fixedSchedule: false,
  });

  const customPrice = useMemo(() => calculateCustomPlanPrice(customSelection), [customSelection]);
  const recommendation = useMemo(() => getRecommendation(customPrice, customSelection), [customPrice, customSelection]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const plan = await getMyPlan(user.id);
        setMyPlan(plan);
      } catch {
        setMyPlan(null);
      }
    })();
  }, [user]);

  const onAssinar = (planType: PlanType) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/planos" } });
      return;
    }

    if (myPlan?.status === "approved") {
      toast({
        title: "Você já tem um plano ativo!",
        description: "Entre em contato para alterar seu plano.",
        variant: "destructive",
      });
      return;
    }
    if (myPlan?.status === "pending") {
      toast({
        title: "Solicitação pendente",
        description: "Você já tem uma solicitação aguardando aprovação.",
        variant: "destructive",
      });
      return;
    }

    setSelectedPlanType(planType);
    setPlanOpen(true);
  };

  const onRequestPlan = async () => {
    if (!user) return;

    setPlanLoading(true);
    try {
      await createPlanRequest({ 
        userId: user.id, 
        planType: selectedPlanType, 
        selectedSchedule: "A definir", // Cliente agenda depois da aprovação
        // Passa a seleção customizada para salvar os detalhes do plano
        customSelection: selectedPlanType === "custom" ? customSelection : undefined,
      });
      toast({
        title: "Solicitação enviada! 🎉",
        description: "Aguarde aprovação. Você receberá confirmação em breve.",
      });
      setPlanOpen(false);
      const plan = await getMyPlan(user.id);
      setMyPlan(plan);
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

  const getPlanPrice = () => {
    if (selectedPlanType === "custom") return customPrice;
    return FIXED_PLANS[selectedPlanType as keyof typeof FIXED_PLANS]?.price || 0;
  };

  const getPlanName = () => {
    if (selectedPlanType === "custom") return "Monte seu Plano";
    return FIXED_PLANS[selectedPlanType as keyof typeof FIXED_PLANS]?.name || "";
  };

  return (
    <div className="-mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8">
      {/* HERO */}
      <section className="bg-background px-3 py-10 sm:px-4 sm:py-12 md:px-6 md:py-16 lg:px-8">
        <div className="mx-auto flex min-h-[25vh] max-w-4xl flex-col items-center justify-center text-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <h1 className="text-2xl font-black tracking-tight text-primary sm:text-3xl md:text-4xl lg:text-5xl">
              💎 PLANOS MENSAIS
            </h1>
            <p className="mt-3 px-4 text-sm text-foreground/90 sm:text-base md:mt-4 md:text-lg">
              Escolha o plano ideal ou monte o seu personalizado
            </p>
          </motion.div>
        </div>
      </section>

      {/* PLANOS FIXOS */}
      <Section className="bg-background px-3 py-8 sm:px-4 sm:py-10 md:px-6 md:py-12 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xl font-black tracking-tight text-foreground md:text-2xl">
            PLANOS PRONTOS
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-xs sm:text-sm text-muted-foreground">
            Escolha um dos nossos planos pré-configurados
          </p>

          <div className="mt-8 sm:mt-10 md:mt-12">
            {/* CARROSSEL - MOBILE */}
            <div className="block md:hidden">
              <Carousel
                opts={{
                  align: "center",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 sm:-ml-3">
                  {(Object.entries(FIXED_PLANS) as [keyof typeof FIXED_PLANS, typeof FIXED_PLANS[keyof typeof FIXED_PLANS]][]).map(
                    ([key, plan], index) => {
                      const Icon = planIcons[key];
                      const colors = planColors[key];
                      const isPopular = key === "club-vip";

                      return (
                        <CarouselItem key={key} className="pl-2 sm:pl-3 basis-full sm:basis-1/2">
                          <div
                            className={`relative flex h-full flex-col rounded-xl border-2 bg-card p-6 sm:p-8 shadow-card transition-all duration-300 hover:-translate-y-1 ${colors.border}`}
                          >
                            {isPopular && (
                              <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full ${colors.bg} px-3 py-1 sm:px-4 text-[10px] sm:text-xs font-black text-white`}>
                                MAIS POPULAR
                              </span>
                            )}

                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className={`rounded-full ${colors.bg} p-2`}>
                                <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                              </div>
                              <p className="text-base sm:text-lg font-black text-foreground">{plan.name}</p>
                            </div>

                            <p className={`mt-4 sm:mt-6 text-3xl sm:text-4xl font-black ${colors.text}`}>
                              {formatBRL(plan.price)}
                              <span className="text-sm sm:text-base font-normal text-muted-foreground">/mês</span>
                            </p>

                            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">{plan.description}</p>

                            <ul className="mt-4 sm:mt-6 flex-1 space-y-2 sm:space-y-3">
                              {plan.features.map((feature) => (
                                <li key={feature} className="flex items-start gap-2 text-xs sm:text-sm text-foreground">
                                  <Check className={`mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${colors.text}`} />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>

                            <div className="mt-6 sm:mt-8">
                              <Button
                                variant={colors.button}
                                className="w-full rounded-tight text-xs sm:text-sm"
                                size="lg"
                                onClick={() => onAssinar(key)}
                              >
                                ASSINAR
                              </Button>
                            </div>
                          </div>
                        </CarouselItem>
                      );
                    }
                  )}
                </CarouselContent>
                <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3 sm:gap-4">
                  <CarouselPrevious className="static translate-y-0 h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary hover:bg-primary hover:text-primary-foreground" />
                  <div className="text-xs sm:text-sm font-bold text-foreground">
                    3 planos disponíveis
                  </div>
                  <CarouselNext className="static translate-y-0 h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary hover:bg-primary hover:text-primary-foreground" />
                </div>
              </Carousel>
            </div>

            {/* GRID - DESKTOP */}
            <div className="hidden md:grid gap-6 lg:grid-cols-3">
              {(Object.entries(FIXED_PLANS) as [keyof typeof FIXED_PLANS, typeof FIXED_PLANS[keyof typeof FIXED_PLANS]][]).map(
                ([key, plan], index) => {
                  const Icon = planIcons[key];
                  const colors = planColors[key];
                  const isPopular = key === "club-vip";

                  return (
                    <motion.div
                      key={key}
                      className={`relative flex flex-col rounded-xl border-2 bg-card p-8 shadow-card transition-all duration-300 hover:-translate-y-1 ${colors.border}`}
                      initial={reduce ? false : { opacity: 0, y: 20 }}
                      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: index * 0.1 }}
                    >
                      {isPopular && (
                        <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full ${colors.bg} px-4 py-1 text-xs font-black text-white`}>
                          MAIS POPULAR
                        </span>
                      )}

                      <div className="flex items-center gap-3">
                        <div className={`rounded-full ${colors.bg} p-2`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-lg font-black text-foreground">{plan.name}</p>
                      </div>

                      <p className={`mt-6 text-4xl font-black ${colors.text}`}>
                        {formatBRL(plan.price)}
                        <span className="text-base font-normal text-muted-foreground">/mês</span>
                      </p>

                      <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>

                      <ul className="mt-6 flex-1 space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${colors.text}`} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-8">
                        <Button
                          variant={colors.button}
                          className="w-full rounded-tight"
                          size="lg"
                          onClick={() => onAssinar(key)}
                        >
                          ASSINAR
                        </Button>
                      </div>
                    </motion.div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* MONTE SEU PLANO */}
      <Section className="bg-card px-3 py-12 sm:px-4 sm:py-14 md:px-6 md:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <span className="rounded-full bg-primary/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-black text-primary">
              PERSONALIZE
            </span>
            <h2 className="mt-3 sm:mt-4 text-lg sm:text-xl font-black tracking-tight text-foreground md:text-2xl">
              🛠️ MONTE SEU PLANO
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-xs sm:text-sm text-muted-foreground">
              Escolha exatamente o que você precisa e pague apenas pelo que usar
            </p>
          </div>

          <div className="mt-8 sm:mt-10 rounded-xl border-2 border-border bg-background p-6 sm:p-8">
            {/* Base */}
            <div className="flex items-center justify-between border-b border-border pb-4 sm:pb-6">
              <div>
                <p className="text-sm sm:text-base font-black text-foreground">Base do Plano</p>
                <p className="text-xs sm:text-sm text-muted-foreground">4 cortes por mês • Seg a Qui</p>
              </div>
              <p className="text-base sm:text-lg font-black text-foreground">{formatBRL(CUSTOM_PLAN_OPTIONS.base.price)}</p>
            </div>

            {/* Serviços */}
            <div className="border-b border-border py-4 sm:py-6">
              <p className="mb-3 sm:mb-4 text-xs sm:text-sm font-black tracking-wide text-muted-foreground">SERVIÇOS</p>
              <div className="space-y-3 sm:space-y-4">
                <label className="flex cursor-pointer items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={customSelection.unlimitedCuts}
                      onCheckedChange={(checked) =>
                        setCustomSelection((s) => ({ ...s, unlimitedCuts: !!checked }))
                      }
                    />
                    <span className="text-sm text-foreground">{CUSTOM_PLAN_OPTIONS.services.unlimitedCuts.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-brand-green">
                    +{formatBRL(CUSTOM_PLAN_OPTIONS.services.unlimitedCuts.price)}
                  </span>
                </label>

                <label className="flex cursor-pointer items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={customSelection.unlimitedBeard}
                      onCheckedChange={(checked) =>
                        setCustomSelection((s) => ({ ...s, unlimitedBeard: !!checked }))
                      }
                    />
                    <span className="text-sm text-foreground">{CUSTOM_PLAN_OPTIONS.services.unlimitedBeard.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-brand-green">
                    +{formatBRL(CUSTOM_PLAN_OPTIONS.services.unlimitedBeard.price)}
                  </span>
                </label>

                <label className="flex cursor-pointer items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={customSelection.eyebrowIncluded}
                      onCheckedChange={(checked) =>
                        setCustomSelection((s) => ({ ...s, eyebrowIncluded: !!checked }))
                      }
                    />
                    <span className="text-sm text-foreground">{CUSTOM_PLAN_OPTIONS.services.eyebrowIncluded.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-brand-green">
                    +{formatBRL(CUSTOM_PLAN_OPTIONS.services.eyebrowIncluded.price)}
                  </span>
                </label>
              </div>
            </div>

            {/* Dias */}
            <div className="border-b border-border py-4 sm:py-6">
              <p className="mb-3 sm:mb-4 text-xs sm:text-sm font-black tracking-wide text-muted-foreground">DIAS DISPONÍVEIS</p>
              <div className="space-y-3 sm:space-y-4">
                <label className="flex cursor-pointer items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={customSelection.addFriday}
                      onCheckedChange={(checked) => {
                        setCustomSelection((s) => ({ ...s, addFriday: !!checked }));
                      }}
                    />
                    <span className="text-sm text-foreground">{CUSTOM_PLAN_OPTIONS.days.friday.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    +{formatBRL(CUSTOM_PLAN_OPTIONS.days.friday.price)}
                  </span>
                </label>

                <label className="flex cursor-pointer items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={customSelection.addSaturday}
                      onCheckedChange={(checked) => {
                        setCustomSelection((s) => ({ ...s, addSaturday: !!checked }));
                      }}
                    />
                    <span className="text-sm text-foreground">{CUSTOM_PLAN_OPTIONS.days.saturday.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    +{formatBRL(CUSTOM_PLAN_OPTIONS.days.saturday.price)}
                  </span>
                </label>
              </div>
            </div>

            {/* Benefícios */}
            <div className="border-b border-border py-4 sm:py-6">
              <p className="mb-3 sm:mb-4 text-xs sm:text-sm font-black tracking-wide text-muted-foreground">BENEFÍCIOS</p>
              <div className="space-y-3 sm:space-y-4">
                {/* Prioridade */}
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Prioridade no agendamento</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "normal" as const, label: "Normal", price: 0 },
                      { value: "medium" as const, label: "Média", price: CUSTOM_PLAN_OPTIONS.benefits.priorityMedium.price },
                      { value: "max" as const, label: "Máxima", price: CUSTOM_PLAN_OPTIONS.benefits.priorityMax.price },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCustomSelection((s) => ({ ...s, priority: opt.value }))}
                        className={`rounded-tight px-4 py-2 text-sm font-semibold transition-colors ${
                          customSelection.priority === opt.value
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-background text-foreground hover:border-primary"
                        }`}
                      >
                        {opt.label} {opt.price > 0 && `(+R$ ${opt.price})`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desconto */}
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Desconto em produtos</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 0 as const, label: "Sem desconto", price: 0 },
                      { value: 5 as const, label: "5%", price: CUSTOM_PLAN_OPTIONS.benefits.discount5.price },
                      { value: 10 as const, label: "10%", price: CUSTOM_PLAN_OPTIONS.benefits.discount10.price },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCustomSelection((s) => ({ ...s, productDiscount: opt.value }))}
                        className={`rounded-tight px-4 py-2 text-sm font-semibold transition-colors ${
                          customSelection.productDiscount === opt.value
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-background text-foreground hover:border-primary"
                        }`}
                      >
                        {opt.label} {opt.price > 0 && `(+R$ ${opt.price})`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horário fixo */}
                <label className="flex cursor-pointer items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={customSelection.fixedSchedule}
                      onCheckedChange={(checked) =>
                        setCustomSelection((s) => ({ ...s, fixedSchedule: !!checked }))
                      }
                    />
                    <span className="text-sm text-foreground">{CUSTOM_PLAN_OPTIONS.benefits.fixedSchedule.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-destructive">
                    +{formatBRL(CUSTOM_PLAN_OPTIONS.benefits.fixedSchedule.price)}
                  </span>
                </label>
              </div>
            </div>

            {/* Recomendação */}
            {recommendation && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-lg border-2 border-primary bg-primary/5 p-4"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-black text-primary">
                      {recommendation.difference > 0
                        ? `Por apenas +${formatBRL(recommendation.difference)}, pegue o ${recommendation.planName}!`
                        : `O ${recommendation.planName} custa menos e tem tudo isso!`}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {recommendation.extraBenefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-2 text-sm text-foreground">
                          <Check className="h-3 w-3 text-brand-green" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="hero"
                      size="sm"
                      className="mt-3"
                      onClick={() => onAssinar(recommendation.planId)}
                    >
                      ESCOLHER {recommendation.planName.toUpperCase()}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Total */}
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">Valor mensal</p>
                <p className="text-2xl sm:text-3xl font-black text-primary">{formatBRL(customPrice)}</p>
              </div>
              <Button
                variant="hero"
                size="xl"
                className="rounded-tight w-full sm:w-auto text-sm sm:text-base"
                onClick={() => onAssinar("custom")}
              >
                ASSINAR MEU PLANO
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section className="bg-background px-4 py-16 md:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-xl font-black tracking-tight text-foreground md:text-2xl">
            DÚVIDAS FREQUENTES
          </h2>
          <div className="mt-8 grid gap-4 text-left md:grid-cols-2">
            {[
              {
                q: "Posso cancelar quando quiser?",
                a: "Sim! Você pode cancelar a qualquer momento sem multa.",
              },
              {
                q: "Como funciona o horário fixo?",
                a: "Você escolhe um horário na semana que será reservado exclusivamente para você.",
              },
              {
                q: "Posso mudar de plano?",
                a: "Sim, entre em contato conosco para fazer upgrade ou downgrade.",
              },
              {
                q: "O desconto em produtos vale para quais itens?",
                a: "Vale para todos os produtos da barbearia: pomadas, shampoos, etc.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-lg border border-border bg-card p-6">
                <p className="font-black text-foreground">{q}</p>
                <p className="mt-2 text-sm text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Modal de solicitação */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-w-[600px] border-2 border-primary bg-background p-10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-primary">
              💎 ASSINAR {getPlanName().toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="rounded-lg bg-accent p-4">
              <p className="text-sm text-muted-foreground">Valor mensal</p>
              <p className="text-2xl font-black text-primary">{formatBRL(getPlanPrice())}</p>
            </div>

            {/* Explicação de como funciona */}
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">📅 Como funciona o agendamento?</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">1.</span>
                  Após aprovação, você poderá agendar seus horários normalmente
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">2.</span>
                  Serviços do plano sem custo adicional (já inclusos na mensalidade)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">3.</span>
                  Agende quantas vezes quiser dentro do seu plano!
                </li>
              </ul>
            </div>

            <Button
              variant="hero"
              className="w-full rounded-tight"
              size="xl"
              onClick={onRequestPlan}
              disabled={planLoading}
            >
              {planLoading ? "ENVIANDO..." : "CONFIRMAR SOLICITAÇÃO"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Sua solicitação será analisada e você receberá confirmação em breve.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
