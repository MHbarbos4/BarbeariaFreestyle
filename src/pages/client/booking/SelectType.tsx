import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ArrowRight, Crown, Star, Zap, Ban, Phone } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import ProgressBar from "@/components/booking/ProgressBar";
import { useBooking, type BookingType } from "@/context/BookingContext";
import { useAuth } from "@/context/AuthContext";
import { FIXED_PLANS, getAllowedDaysLabel } from "@/services/api/planService";
import type { ServiceItem, ComboItem } from "@/services/api/serviceService";

type ServiceTypeCard = {
  id: Exclude<BookingType, null>;
  icon: string;
  title: string;
  description: string;
  priceFrom: number;
  priceClass: string;
  hoverBorder: string;
  borderSelected: string;
  badge?: { text: string; toneClass: string; borderClass: string };
};

const serviceTypes: ServiceTypeCard[] = [
  {
    id: "avulso",
    icon: "✂️",
    title: "AVULSO",
    description: "Serviço individual",
    priceFrom: 8,
    priceClass: "text-primary",
    hoverBorder: "hover:border-primary",
    borderSelected: "border-primary",
  },
  {
    id: "duplo",
    icon: "🔥",
    title: "DUPLO",
    description: "Combo de 2 serviços",
    priceFrom: 25,
    priceClass: "text-brand-green",
    hoverBorder: "hover:border-brand-green",
    borderSelected: "border-brand-green",
    badge: { text: "💰 Economize até R$ 15", toneClass: "text-brand-green", borderClass: "border-brand-green" },
  },
  {
    id: "triplo",
    icon: "⭐",
    title: "TRIPLO",
    description: "Combo de 3 serviços",
    priceFrom: 55,
    priceClass: "text-destructive",
    hoverBorder: "hover:border-destructive",
    borderSelected: "border-destructive",
    badge: { text: "💰 Economize até R$ 30", toneClass: "text-destructive", borderClass: "border-destructive" },
  },
];

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function SelectType() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingData, updateBooking, resetBooking, userPlan, userPlanType, loadingPlan, planUsage } = useBooking();
  const { isSuspended } = useAuth();

  const [selectedType, setSelectedType] = React.useState<BookingType>(bookingData.type);
  const [usePlan, setUsePlan] = React.useState(false); // Sempre começa false, atualiza depois

  // Verifica suspensão ao carregar a página
  const suspended = isSuspended;

  // Verifica se veio de /servicos com um serviço pré-selecionado
  const preSelectedService = location.state?.service as ServiceItem | ComboItem | undefined;
  
  React.useEffect(() => {
    // Se tem serviço pré-selecionado e não está suspenso, configura e redireciona
    if (preSelectedService && !suspended) {
      // Determina o tipo baseado no serviço
      const serviceType: BookingType = preSelectedService.kind === "avulso" 
        ? "avulso" 
        : (preSelectedService as ComboItem).type;
      
      // Atualiza o booking com todas as informações do serviço
      updateBooking({
        type: serviceType,
        serviceId: preSelectedService.id,
        serviceName: preSelectedService.name,
        price: preSelectedService.price,
        duration: preSelectedService.minutes,
        isPlanBooking: false,
      });
      
      // Navega diretamente para seleção de data/hora
      // Limpa o state para evitar loop
      navigate("/agendar/data-hora", { replace: true, state: {} });
    }
  }, [preSelectedService, suspended, navigate, updateBooking]);

  // Informações do plano - só considera assinante se plano estiver APROVADO e carregado
  const isSubscriber = Boolean(!loadingPlan && userPlan && userPlanType && userPlan.status === "approved");
  const planIncludes = userPlan?.includes ?? null;
  const planName = userPlanType && userPlanType !== "custom" 
    ? FIXED_PLANS[userPlanType as keyof typeof FIXED_PLANS]?.name 
    : userPlanType === "custom" ? "Plano Personalizado" : null;
  const allowedDaysLabel = getAllowedDaysLabel(userPlanType, planIncludes);
  
  // Verifica se pode usar o plano (baseado no uso do mês)
  const canUsePlan = planUsage?.canUsePlan ?? true;
  const planUsageReason = planUsage?.reason;
  
  // Info de uso para exibição
  const cutsInfo = planUsage?.cuts;
  const cutsLabel = cutsInfo 
    ? cutsInfo.limit === null 
      ? "Ilimitados" 
      : `${cutsInfo.remaining ?? 0} de ${cutsInfo.limit} restantes`
    : null;

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [reduce]);

  const onSelect = (type: Exclude<BookingType, null>) => {
    setSelectedType(type);
    // Se usar plano, só pode ser avulso (corte ou barba)
    if (usePlan && type !== "avulso") {
      setUsePlan(false);
    }
  };

  const onTogglePlan = () => {
    // Não permite ativar o plano se não pode usar
    if (!usePlan && !canUsePlan) return;
    
    const newUsePlan = !usePlan;
    setUsePlan(newUsePlan);
    // Se usar plano, força tipo avulso
    if (newUsePlan) {
      setSelectedType("avulso");
    }
  };

  const onBack = () => {
    resetBooking();
    navigate("/dashboard");
  };

  const onContinue = () => {
    // Se usar plano, força tipo avulso
    const finalType = usePlan ? "avulso" : selectedType;
    if (!finalType) return;
    updateBooking({ type: finalType, isPlanBooking: usePlan });
    navigate("/agendar/servico");
  };

  return (
    <div className="-mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8">
      {/* BLOQUEIO POR SUSPENSÃO */}
      {suspended && (
        <section className="bg-background px-3 py-12 sm:px-4 sm:py-14 md:px-6 md:py-16 lg:px-8">
          <div className="mx-auto max-w-lg">
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-5 text-center sm:p-6 md:p-8"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 sm:mb-4 sm:h-14 sm:w-14 md:h-16 md:w-16">
                <Ban className="h-6 w-6 text-destructive sm:h-7 sm:w-7 md:h-8 md:w-8" />
              </div>
              <h2 className="text-lg font-extrabold text-destructive sm:text-xl">
                Agendamento Bloqueado
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:mt-3">
                Sua conta está temporariamente suspensa devido a uma falta não justificada. 
                Entre em contato com o estabelecimento para regularizar sua situação.
              </p>
              
              <div className="mt-4 rounded-lg border border-border bg-card p-3 sm:mt-6 sm:p-4">
                <p className="mb-1.5 text-xs font-semibold text-foreground sm:mb-2 sm:text-sm">Entre em contato:</p>
                <a 
                  href="tel:+5500000000000" 
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  (00) 00000-0000
                </a>
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => navigate("/dashboard")}
                className="mt-4 sm:mt-6"
                size="sm"
              >
                Voltar ao Dashboard
              </Button>
            </motion.div>
          </div>
        </section>
      )}

      {/* CONTEÚDO NORMAL (se não suspenso) */}
      {!suspended && (
        <>
          {/* HERO */}
          <section className="bg-background px-4 py-16 text-center md:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <motion.h1
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="text-3xl font-extrabold tracking-tight text-primary md:text-5xl"
              >
                NOVO AGENDAMENTO
              </motion.h1>
              <p className="mt-3 text-base text-foreground md:text-lg">Escolha o tipo de serviço</p>
            </div>
          </section>

          {/* PROGRESS */}
          <section className="bg-background px-4 py-10 md:px-6 lg:px-8">
            <ProgressBar current={1} />
          </section>

          {/* SELEÇÃO */}
          <section className="bg-background px-4 py-20 pb-40 md:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              {/* CARD DO PLANO (se assinante) */}
              {isSubscriber && planName && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mb-8"
            >
              <div
                role="button"
                tabIndex={canUsePlan ? 0 : -1}
                aria-disabled={!canUsePlan}
                onClick={() => canUsePlan && onTogglePlan()}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && canUsePlan) {
                    e.preventDefault();
                    onTogglePlan();
                  }
                }}
                className={
                  "relative rounded-lg border-2 p-6 shadow-card transition-all duration-300 " +
                  (!canUsePlan
                    ? "cursor-not-allowed opacity-60 border-muted"
                    : "cursor-pointer " + (usePlan
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50"))
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-full p-3 ${usePlan ? "bg-primary" : "bg-primary/20"}`}>
                      <Crown className={`h-6 w-6 ${usePlan ? "text-white" : "text-primary"}`} />
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-foreground">
                        Usar meu {planName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {allowedDaysLabel} • {cutsLabel ? `Cortes: ${cutsLabel}` : (planIncludes?.unlimitedCuts && planIncludes?.unlimitedBeard ? "Corte e Barba" : planIncludes?.unlimitedCuts ? "Cortes" : planIncludes?.unlimitedBeard ? "Barba" : "Serviços") + " incluídos"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {usePlan && (
                      <span className="rounded-full bg-brand-green px-3 py-1 text-xs font-bold text-white">
                        {formatBRL(0)}
                      </span>
                    )}
                    {canUsePlan && (
                      <div
                        className={
                          "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all " +
                          (usePlan
                            ? "border-primary bg-primary"
                            : "border-muted-foreground")
                        }
                      >
                        {usePlan && <Check className="h-4 w-4 text-white" />}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Mensagem quando não pode usar o plano */}
                {!canUsePlan && planUsageReason && (
                  <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                    <p className="text-xs font-semibold text-destructive">
                      ⚠️ {planUsageReason}
                    </p>
                  </div>
                )}
                
                {usePlan && canUsePlan && (
                  <p className="mt-4 text-xs text-primary">
                    ✨ Serviço coberto pelo seu plano! Escolha um corte ou barba abaixo.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Título da seção */}
          {isSubscriber && (
            <p className="mb-4 text-sm font-semibold text-muted-foreground">
              {usePlan ? "Ou pague normalmente:" : "Escolha o tipo de serviço:"}
            </p>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {serviceTypes.map((t, index) => {
              const selected = selectedType === t.id && !usePlan;
              const disabled = usePlan && t.id !== "avulso";
              const selectedBg =
                t.id === "avulso"
                  ? "bg-primary/5"
                  : t.id === "duplo"
                    ? "bg-brand-green/5"
                    : "bg-destructive/5";

              return (
                <motion.div
                  key={t.id}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.35, delay: reduce ? 0 : index * 0.08 }}
                >
                  <div
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-pressed={selected}
                    aria-disabled={disabled}
                    onClick={() => !disabled && onSelect(t.id)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && !disabled) {
                        e.preventDefault();
                        onSelect(t.id);
                      }
                    }}
                    className={
                      "group relative rounded-lg border-2 bg-card px-8 py-12 text-center shadow-card transition-all duration-300 " +
                      (disabled 
                        ? "cursor-not-allowed opacity-50" 
                        : "cursor-pointer " + (selected ? `border-[3px] ${t.borderSelected} ${selectedBg}` : "border-border hover:-translate-y-2 " + t.hoverBorder))
                    }
                  >
                    {selected ? (
                      <motion.div
                        initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                        animate={reduce ? undefined : { opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={
                          "absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border " +
                          (t.id === "avulso"
                            ? "border-primary bg-primary text-primary-foreground"
                            : t.id === "duplo"
                              ? "border-brand-green bg-brand-green text-background"
                              : "border-destructive bg-destructive text-destructive-foreground")
                        }
                        aria-label="Selecionado"
                      >
                        <Check className="h-5 w-5" />
                      </motion.div>
                    ) : null}

                    <motion.div
                      animate={
                        selected && !reduce
                          ? { y: [0, -6, 0] }
                          : undefined
                      }
                      transition={{ duration: 0.35 }}
                      className="text-5xl"
                      aria-hidden="true"
                    >
                      {t.icon}
                    </motion.div>

                    <h3 className="mt-6 text-xl font-extrabold tracking-tight text-foreground">{t.title}</h3>
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t.description}</p>

                    {t.badge ? (
                      <div
                        className={
                          "mx-auto mt-6 inline-flex items-center rounded-full border px-4 py-2 text-xs font-extrabold tracking-[0.12em] " +
                          t.badge.borderClass +
                          " " +
                          t.badge.toneClass
                        }
                      >
                        {t.badge.text}
                      </div>
                    ) : (
                      <div className="mt-6 h-[34px]" />
                    )}

                    <p className={"mt-6 text-lg font-extrabold " + t.priceClass}>
                      A partir de {formatBRL(t.priceFrom)}
                    </p>

                    <div className="mt-8">
                      {selected ? (
                        <button
                          type="button"
                          className={
                            "w-full rounded-lg px-6 py-3 text-sm font-extrabold " +
                            (t.id === "avulso"
                              ? "bg-primary text-primary-foreground"
                              : t.id === "duplo"
                                ? "bg-brand-green text-background"
                                : "bg-destructive text-destructive-foreground")
                          }
                        >
                          SELECIONADO ✓
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={
                            "w-full rounded-lg border px-6 py-3 text-sm font-extrabold transition-colors duration-300 " +
                            (t.id === "avulso"
                              ? "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                              : t.id === "duplo"
                                ? "border-brand-green text-brand-green hover:bg-brand-green hover:text-background"
                                : "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground")
                          }
                        >
                          SELECIONAR
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* INFO */}
          <div className="mx-auto mt-12 max-w-[800px] rounded-lg border border-border bg-card p-6 shadow-card">
            <div className="flex gap-4">
              <div className="w-1 rounded bg-primary" aria-hidden />
              <div>
                <h4 className="text-base font-extrabold tracking-tight text-primary">ℹ️ INFORMAÇÕES IMPORTANTES</h4>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>• Todos os serviços incluem consulta</li>
                  <li>• Produtos de alta qualidade</li>
                  <li>• Cancelamento grátis até 1h antes</li>
                  <li>• Pagamento presencial</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER FIXO */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-4 py-4 backdrop-blur md:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onBack}>
            ← VOLTAR
          </Button>
          <Button
            variant="hero"
            size="xl"
            className="w-full sm:w-auto"
            disabled={!selectedType && !usePlan}
            onClick={onContinue}
          >
            <span className="inline-flex items-center gap-2">
              {usePlan ? "USAR MEU PLANO" : "CONTINUAR"} <ArrowRight className="h-5 w-5" />
            </span>
          </Button>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
