import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Clock, Crown, Search, Scissors } from "lucide-react";
import { useNavigate } from "react-router-dom";

import ProgressBar from "@/components/booking/ProgressBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useBooking } from "@/context/BookingContext";
import {
  getServiceCombinations,
  getServices,
  type AnyService,
  type ComboType,
  type ServiceCategory,
} from "@/services/api/serviceService";
import { FIXED_PLANS } from "@/services/api/planService";

type Filter = "todos" | ServiceCategory;

const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  cortes: "CORTES",
  quimicas: "QUÍMICAS",
  luzes: "LUZES",
  acabamentos: "ACABAMENTOS",
};

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function typeLabel(type: "avulso" | "duplo" | "triplo") {
  return type === "avulso" ? "AVULSO" : type === "duplo" ? "DUPLO" : "TRIPLO";
}

function tone(type: "avulso" | "duplo" | "triplo") {
  return type === "avulso"
    ? {
        text: "text-primary",
        border: "border-primary",
        bgSoft: "bg-primary/5",
        outline: "border-primary text-primary hover:bg-primary hover:text-primary-foreground",
        buttonVariant: "hero" as const,
      }
    : type === "duplo"
      ? {
          text: "text-brand-green",
          border: "border-brand-green",
          bgSoft: "bg-brand-green/5",
          outline: "border-brand-green text-brand-green hover:bg-brand-green hover:text-background",
          buttonVariant: "success" as const,
        }
      : {
          text: "text-destructive",
          border: "border-destructive",
          bgSoft: "bg-destructive/5",
          outline:
            "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground",
          buttonVariant: "danger" as const,
        };
}

export default function SelectService() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { bookingData, updateBooking, userPlanType, userPlan, planUsage } = useBooking();

  const selectedType = bookingData.type;
  const isPlanBooking = bookingData.isPlanBooking;

  // Informações do plano para filtrar serviços permitidos
  // Sempre usa os includes salvos no plano do usuário (já calculados na aprovação)
  const planInfo = userPlan?.includes ?? null;

  const planName = userPlanType && userPlanType !== "custom" 
    ? FIXED_PLANS[userPlanType as keyof typeof FIXED_PLANS]?.name 
    : userPlanType === "custom" ? "Plano Personalizado" : null;

  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<AnyService[]>([]);
  const [filter, setFilter] = React.useState<Filter>("todos");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(bookingData.serviceId);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [reduce]);

  React.useEffect(() => {
    if (!selectedType) {
      navigate("/agendar/tipo", { replace: true });
    }
  }, [navigate, selectedType]);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!selectedType) return;
      setLoading(true);
      try {
        const data =
          selectedType === "avulso"
            ? await getServices()
            : await getServiceCombinations(selectedType as ComboType);
        if (!cancelled) {
          setItems(data);
        }
      } catch {
        toast({
          title: "Erro ao carregar serviços",
          description: "Tente novamente.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedType, toast]);

  const categories = React.useMemo(() => {
    if (selectedType !== "avulso") return [] as ServiceCategory[];
    const set = new Set<ServiceCategory>();
    items.forEach((i) => {
      if (i.kind === "avulso") set.add(i.category);
    });
    return Array.from(set);
  }, [items, selectedType]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const byFilter = filter === "todos" ? true : i.category === filter;
      const byQuery = !q ? true : i.name.toLowerCase().includes(q);
     
      // Se está usando o plano, filtra serviços permitidos E com uso disponível
      if (isPlanBooking && planInfo) {
        // Lista de IDs de serviços permitidos no plano
        const allowedServiceIds: string[] = [];
        
        // Cortes só se tem uso disponível (ilimitado OU ainda tem cortes restantes)
        const canUseCuts = planInfo.unlimitedCuts || 
          (planUsage?.cuts?.remaining !== null && planUsage?.cuts?.remaining !== undefined && planUsage.cuts.remaining > 0);
        
        if (canUseCuts) {
          allowedServiceIds.push("social", "degrade-navalhado", "contornado", "infantil");
        }
        
        // Barba só se unlimitedBeard
        if (planInfo.unlimitedBeard) {
          allowedServiceIds.push("barba");
        }
        
        // Sobrancelha só se eyebrowIncluded
        if (planInfo.eyebrowIncluded) {
          allowedServiceIds.push("sobrancelha");
        }
        
        // Verifica se o serviço está na lista de IDs permitidos
        const byPlan = allowedServiceIds.includes(i.id);
        
        return byFilter && byQuery && byPlan;
      }
      
      return byFilter && byQuery;
    });
  }, [filter, items, query, isPlanBooking, planInfo, planUsage]);

  // Limpa seleção se o serviço não está mais disponível
  React.useEffect(() => {
    if (selectedId && !loading && filtered.length > 0) {
      const isStillAvailable = filtered.some(s => s.id === selectedId);
      if (!isStillAvailable) {
        setSelectedId(null);
        updateBooking({ serviceId: null, serviceName: "", price: 0, duration: 0 });
      }
    }
  }, [selectedId, filtered, loading, updateBooking]);

  const selectedItem = React.useMemo(
    () => filtered.find((i) => i.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const t = selectedType ? tone(selectedType) : null;

  const onSelect = (id: string) => {
    const item = filtered.find((i) => i.id === id);
    if (item) {
      // Atualiza o booking e navega direto para data/hora
      updateBooking({
        serviceId: item.id,
        serviceName: item.name,
        price: item.price,
        duration: item.minutes,
      });
      navigate("/agendar/data-hora");
    }
  };

  const onRemove = () => {
    setSelectedId(null);
    updateBooking({ serviceId: null, serviceName: "", price: 0, duration: 0 });
  };

  const onBack = () => {
    navigate("/agendar/tipo");
  };

  const onContinue = () => {
    if (!selectedItem) return;
    updateBooking({
      serviceId: selectedItem.id,
      serviceName: selectedItem.name,
      price: selectedItem.price,
      duration: selectedItem.minutes,
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
            ESCOLHA O SERVIÇO
          </motion.h1>
          <p className="mt-3 text-base text-foreground md:text-lg">
            {isPlanBooking 
              ? `Serviços incluídos no seu ${planName}` 
              : `Serviço ${selectedType ? typeLabel(selectedType) : ""} selecionado`}
          </p>
        </div>
      </section>

      {/* BANNER DO PLANO */}
      {isPlanBooking && planName && (
        <section className="bg-primary/5 px-4 py-4 md:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-3">
            <Crown className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-primary">
              Usando seu <span className="font-extrabold">{planName}</span> • Serviço selecionado será {formatBRL(0)}
            </p>
          </div>
        </section>
      )}

      {/* PROGRESS */}
      <section className="bg-background px-4 py-10 md:px-6 lg:px-8">
        <ProgressBar current={2} />
      </section>

      {/* FILTROS + BUSCA */}
      <section className="bg-background px-4 py-10 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {selectedType === "avulso" ? (
              <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                <button
                  type="button"
                  onClick={() => setFilter("todos")}
                  className={
                    "whitespace-nowrap rounded-lg px-6 py-3 text-xs font-extrabold tracking-[0.12em] transition-colors " +
                    (filter === "todos"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-transparent text-foreground hover:bg-accent")
                  }
                >
                  TODOS
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFilter(c)}
                    className={
                      "whitespace-nowrap rounded-lg px-6 py-3 text-xs font-extrabold tracking-[0.12em] transition-colors " +
                      (filter === c
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-transparent text-foreground hover:bg-accent")
                    }
                  >
                    {CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm font-semibold tracking-wide text-muted-foreground">
                Mostrando combos {selectedType ? typeLabel(selectedType) : ""}
              </div>
            )}

            <div className="relative w-full md:w-[360px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar serviço..."
                aria-label="Buscar serviço"
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="bg-background px-4 py-16 pb-56 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-6 shadow-card">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-3 h-4 w-1/2" />
                  <Skeleton className="mt-6 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-4/5" />
                  <Skeleton className="mt-6 h-10 w-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-lg border border-border bg-card p-8 text-center shadow-card">
              {isPlanBooking && planUsage && !planUsage.canUsePlan ? (
                // Limite do plano atingido
                <>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <Crown className="h-8 w-8 text-destructive" />
                  </div>
                  <p className="text-lg font-extrabold text-destructive">Limite do plano atingido</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {planUsage.reason || "Você já utilizou todos os serviços disponíveis no seu plano este mês."}
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button variant="outline" onClick={() => navigate("/agendar/tipo")}>
                      ← Voltar
                    </Button>
                    <Button variant="hero" onClick={() => {
                      updateBooking({ isPlanBooking: false });
                      navigate("/agendar/tipo");
                    }}>
                      Agendar sem plano
                    </Button>
                  </div>
                </>
              ) : (
                // Nenhum serviço encontrado (filtro)
                <>
                  <p className="text-base font-extrabold text-foreground">Nenhum serviço encontrado nesta categoria</p>
                  <p className="mt-2 text-sm text-muted-foreground">Tente trocar o filtro ou buscar por outro nome.</p>
                  <div className="mt-6">
                    <Button variant="outline" onClick={() => setFilter("todos")}>Ver todos</Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((s, idx) => {
                const selected = s.id === selectedId;
                const cardTone = selectedType ? tone(selectedType) : null;

                return (
                  <motion.div
                    key={s.id}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.28, delay: reduce ? 0 : idx * 0.04 }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-pressed={selected}
                      onClick={() => onSelect(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelect(s.id);
                        }
                      }}
                      className={
                        "group relative cursor-pointer rounded-lg border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 " +
                        (selected && cardTone ? `border-2 ${cardTone.border} ${cardTone.bgSoft}` : "border-border") +
                        (cardTone && !selected ? ` hover:${cardTone.border}` : "")
                      }
                    >
                      {selected && cardTone ? (
                        <motion.div
                          initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                          animate={reduce ? undefined : { opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                          className={
                            "absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border " +
                            (selectedType === "avulso"
                              ? "border-primary bg-primary text-primary-foreground"
                              : selectedType === "duplo"
                                ? "border-brand-green bg-brand-green text-background"
                                : "border-destructive bg-destructive text-destructive-foreground")
                          }
                          aria-label="Selecionado"
                        >
                          <Check className="h-5 w-5" />
                        </motion.div>
                      ) : null}

                      <h3 className="text-base font-extrabold tracking-tight text-foreground">{s.name}</h3>

                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Scissors className="h-4 w-4" aria-hidden />
                        <span>
                          {s.kind === "avulso" ? CATEGORY_LABEL[s.category] : `COMBO ${typeLabel((s as any).type)}`}
                        </span>
                      </div>

                      <div className="my-5 h-px bg-border" aria-hidden />

                      <div className="flex items-center justify-between gap-4">
                        <p className={"text-lg font-extrabold " + (cardTone ? cardTone.text : "text-primary")}>
                          {formatBRL(s.price)}
                        </p>
                        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" aria-hidden />
                          {s.minutes} min
                        </p>
                      </div>

                      {s.kind === "combo" && typeof s.economy === "number" ? (
                        <p className={"mt-3 text-xs font-semibold " + (cardTone ? cardTone.text : "text-muted-foreground")}>
                          💰 Economia: {formatBRL(s.economy)}
                        </p>
                      ) : null}

                      <div className="mt-6">
                        <button
                          type="button"
                          className={
                            "w-full rounded-lg border px-6 py-3 text-sm font-extrabold transition-colors duration-300 " +
                            (selected && cardTone
                              ? selectedType === "triplo"
                                ? "bg-destructive text-destructive-foreground"
                                : selectedType === "duplo"
                                  ? "bg-brand-green text-background"
                                  : "bg-primary text-primary-foreground"
                              : cardTone
                                ? cardTone.outline
                                : "border-primary text-primary hover:bg-primary hover:text-primary-foreground")
                          }
                        >
                          {selected ? "SELECIONADO ✓" : "SELECIONAR"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* RESUMO FLUTUANTE */}
      {selectedItem && selectedType && t ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: 14 }}
          transition={{ duration: 0.22 }}
          className={
            "fixed inset-x-0 bottom-[88px] z-40 border-t-2 bg-card/95 px-4 py-4 backdrop-blur md:px-6 lg:px-8 " +
            t.border
          }
        >
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">SERVIÇO SELECIONADO</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-extrabold text-foreground">{selectedItem.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className={t.text}>{formatBRL(selectedItem.price)}</span>
                  <span className="text-muted-foreground"> • </span>
                  <span className="text-muted-foreground">⏱️ {selectedItem.minutes} min</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onRemove}
                className="text-xs font-bold text-destructive underline-offset-4 hover:underline"
              >
                Remover
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}

      {/* FOOTER FIXO */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-4 py-4 backdrop-blur md:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" className="w-full sm:w-auto" onClick={onBack}>
            ← VOLTAR
          </Button>
          <Button
            variant={selectedType ? tone(selectedType).buttonVariant : "hero"}
            size="xl"
            className="w-full sm:w-auto"
            disabled={!selectedItem || (isPlanBooking && planUsage && !planUsage.canUsePlan)}
            onClick={onContinue}
          >
            ESCOLHER DATA E HORA →
          </Button>
        </div>
      </div>
    </div>
  );
}
