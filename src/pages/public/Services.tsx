import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FaClock, FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import {
  getServiceCombinations,
  getServices,
  type ComboItem,
  type ComboSubCategory,
  type ServiceCategory,
  type ServiceItem,
} from "@/services/api/serviceService";

type Tab = "todos" | ServiceCategory;
type SubTabDuplo = "todos" | "acabamentos" | "corte-barba" | "corte-quimica" | "corte-luzes";
type SubTabTriplo = "todos" | "corte-barba-sobrancelha" | "corte-quimica-sobrancelha" | "corte-luzes-sobrancelha";

function moneyBRL(value: number) {
  return `R$ ${value.toFixed(2)}`.replace(".", ",");
}

function Section({
  children,
}: {
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function ServiceCard({
  item,
  accent,
  onAgendar,
}: {
  item: ServiceItem;
  accent: "primary" | "brand-green" | "destructive";
  onAgendar: (service: ServiceItem) => void;
}) {
  const borderClass =
    accent === "brand-green" ? "border-brand-green" : accent === "destructive" ? "border-destructive" : "border-primary";
  const priceClass =
    accent === "brand-green" ? "text-brand-green" : accent === "destructive" ? "text-destructive" : "text-primary";

  return (
    <motion.div
      className={
        "flex flex-col rounded-lg border-2 bg-card p-4 shadow-card transition-transform duration-300 hover:scale-[1.02] sm:p-5 md:p-6 " +
        borderClass
      }
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <p className="text-sm font-black text-foreground sm:text-base">{item.name}</p>
        <p className={"shrink-0 text-base font-black sm:text-lg " + priceClass}>{moneyBRL(item.price)}</p>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground sm:text-sm md:mt-4">
        <FaClock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span>{item.minutes} minutos</span>
      </div>
      <div className="mt-auto pt-4 sm:pt-5 md:pt-6">
        <Button
          variant="outline"
          className={"w-full border-2 text-xs sm:text-sm " + borderClass + " " + priceClass + " hover:bg-accent"}
          size="sm"
          onClick={() => onAgendar(item)}
        >
          AGENDAR
        </Button>
      </div>
    </motion.div>
  );
}

function ComboCard({
  item,
  tone,
  onAgendar,
}: {
  item: ComboItem;
  tone: "brand-green" | "destructive";
  onAgendar: (service: ComboItem) => void;
}) {
  const borderClass = tone === "destructive" ? "border-destructive" : "border-brand-green";
  const priceClass = tone === "destructive" ? "text-destructive" : "text-brand-green";

  return (
    <motion.div
      className={
        "flex flex-col rounded-lg border-2 bg-card p-4 shadow-card transition-transform duration-300 hover:scale-[1.02] sm:p-5 md:p-6 " +
        borderClass
      }
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <p className="text-sm font-black text-foreground sm:text-base">{item.name}</p>
        <p className={"shrink-0 text-base font-black sm:text-lg " + priceClass}>{moneyBRL(item.price)}</p>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground sm:text-sm md:mt-4">
        <FaClock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span>{item.minutes} min</span>
      </div>
      <div className="mt-auto pt-4 sm:pt-5 md:pt-6">
        <Button
          variant="outline"
          className={"w-full border-2 text-xs sm:text-sm " + borderClass + " " + priceClass + " hover:bg-accent"}
          size="sm"
          onClick={() => onAgendar(item)}
        >
          AGENDAR COMBO
        </Button>
      </div>
    </motion.div>
  );
}

export default function Services() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [selected, setSelected] = useState<Tab>("todos");
  const [subDuplo, setSubDuplo] = useState<SubTabDuplo>("todos");
  const [subTriplo, setSubTriplo] = useState<SubTabTriplo>("todos");
  const [query, setQuery] = useState("");
  const topRef = useRef<HTMLDivElement | null>(null);
  const avulsosRef = useRef<HTMLDivElement | null>(null);
  const duplosRef = useRef<HTMLDivElement | null>(null);
  const triplosRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [avulsos, setAvulsos] = useState<ServiceItem[]>([]);
  const [duplos, setDuplos] = useState<ComboItem[]>([]);
  const [triplos, setTriplos] = useState<ComboItem[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [s, d, t] = await Promise.all([getServices(), getServiceCombinations("duplo"), getServiceCombinations("triplo")]);
        if (!alive) return;
        setAvulsos(s);
        setDuplos(d);
        setTriplos(t);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    // smooth scroll ao mudar categoria
    topRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [selected, reduce]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "todos", label: "TODOS" },
    { key: "cortes", label: "CORTES" },
    { key: "quimicas", label: "QUÍMICAS" },
    { key: "luzes", label: "LUZES / COR" },
    { key: "acabamentos", label: "ACABAMENTOS" },
  ];

  const subDuploTabs: { key: SubTabDuplo; label: string }[] = [
    { key: "todos", label: "TODOS" },
    { key: "acabamentos", label: "ACABAMENTOS" },
    { key: "corte-barba", label: "CORTE + BARBA" },
    { key: "corte-quimica", label: "CORTE + QUÍMICA" },
    { key: "corte-luzes", label: "CORTE + LUZES" },
  ];

  const subTriploTabs: { key: SubTabTriplo; label: string }[] = [
    { key: "todos", label: "TODOS" },
    { key: "corte-barba-sobrancelha", label: "CORTE + BARBA + SOBRANCELHA" },
    { key: "corte-quimica-sobrancelha", label: "CORTE + QUÍMICA + SOBRANCELHA" },
    { key: "corte-luzes-sobrancelha", label: "CORTE + LUZES + SOBRANCELHA" },
  ];

  const filterFn = <T extends { name: string; category: ServiceCategory }>(items: T[]) => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const okCat = selected === "todos" ? true : i.category === selected;
      const okQ = q ? i.name.toLowerCase().includes(q) : true;
      return okCat && okQ;
    });
  };

  const filterComboFn = <T extends { name: string; category: ServiceCategory; subCategory: ComboSubCategory }>(
    items: T[],
    subFilter: string
  ) => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const okCat = selected === "todos" ? true : i.category === selected;
      const okSub = subFilter === "todos" ? true : i.subCategory === subFilter;
      const okQ = q ? i.name.toLowerCase().includes(q) : true;
      return okCat && okSub && okQ;
    });
  };

  const avulsosFiltered = useMemo(() => filterFn(avulsos), [avulsos, selected, query]);
  const duplosFiltered = useMemo(() => filterComboFn(duplos, subDuplo), [duplos, selected, subDuplo, query]);
  const triplosFiltered = useMemo(() => filterComboFn(triplos, subTriplo), [triplos, selected, subTriplo, query]);

  const onAgendar = (service: ServiceItem | ComboItem) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/agendar", service } });
      return;
    }
    navigate("/agendar", { state: { service } });
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const skeletonGrid = (count = 6) => (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 md:gap-6 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-accent p-4 shadow-card sm:p-5 md:p-6">
          <div className="h-3.5 w-2/3 rounded bg-border sm:h-4" />
          <div className="mt-3 h-3 w-1/3 rounded bg-border sm:mt-4" />
          <div className="mt-4 h-8 w-20 rounded bg-border sm:mt-5 sm:h-9 sm:w-24 md:mt-6" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="-mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8">
      {/* HERO */}
      <section className="bg-background px-3 py-10 sm:px-4 sm:py-12 md:px-6 md:py-14 lg:px-8 lg:py-16" style={{ minHeight: "25vh" }}>
        <div className="mx-auto flex min-h-[25vh] max-w-4xl flex-col items-center justify-center text-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <h1 className="text-2xl font-black tracking-tight text-primary sm:text-3xl md:text-4xl lg:text-5xl">NOSSOS SERVIÇOS</h1>
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm md:text-base text-foreground/90">Qualidade e estilo em cada detalhe</p>
          </motion.div>
        </div>
      </section>

      {/* PRINCIPAL */}
      <section className="bg-background px-3 py-12 sm:px-4 sm:py-16 md:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-[1400px]" ref={topRef}>
          {/* Tabs + busca */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex w-full items-center gap-2 rounded-md border border-border bg-accent px-3 py-2 sm:max-w-md">
                <FaSearch className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar serviço..."
                  className="h-7 sm:h-8 border-0 bg-transparent px-0 text-xs sm:text-sm focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="-mx-3 overflow-x-auto px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0">
              <div className="flex w-max gap-2 sm:gap-3 snap-x snap-mandatory">
                {tabs.map((t) => {
                  const active = selected === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setSelected(t.key)}
                      className={
                        "snap-start whitespace-nowrap rounded-tight px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 text-xs sm:text-sm font-black tracking-wide transition-colors duration-300 " +
                        (active
                          ? "bg-primary text-primary-foreground"
                          : "border border-foreground text-foreground hover:border-primary")
                      }
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* NAVEGAÇÃO RÁPIDA POR SEÇÕES (Mobile) */}
          <div className="mt-6 sm:mt-8 -mx-3 overflow-x-auto px-3 sm:-mx-4 sm:px-4 md:hidden">
            <div className="flex w-max gap-2 py-2">
              <button
                type="button"
                onClick={() => scrollToSection(avulsosRef)}
                className="flex items-center gap-2 rounded-tight border-2 border-primary bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20"
              >
                <span>✂️</span>
                <span>AVULSOS</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(duplosRef)}
                className="flex items-center gap-2 rounded-tight border-2 border-brand-green bg-brand-green/10 px-4 py-2 text-xs font-bold text-brand-green hover:bg-brand-green/20"
              >
                <span>🔥</span>
                <span>DUPLOS</span>
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(triplosRef)}
                className="flex items-center gap-2 rounded-tight border-2 border-destructive bg-destructive/10 px-4 py-2 text-xs font-bold text-destructive hover:bg-destructive/20"
              >
                <span>⭐</span>
                <span>TRIPLOS</span>
              </button>
            </div>
          </div>

          {/* AVULSOS */}
          <Section>
            <div ref={avulsosRef} className="scroll-mt-20">
              <h2 className="mt-8 sm:mt-9 md:mt-10 text-lg sm:text-xl font-black tracking-tight text-primary md:text-2xl">✂️ SERVIÇOS AVULSOS</h2>
              <div className="mt-5 sm:mt-6 md:mt-8">
                {loading ? (
                  skeletonGrid(9)
                ) : avulsosFiltered.length === 0 ? (
                  <p className="text-center text-xs sm:text-sm text-muted-foreground py-8">Nenhum serviço avulso encontrado.</p>
                ) : (
                  <div className="grid gap-4 sm:gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {avulsosFiltered.map((s) => (
                      <ServiceCard key={s.id} item={s} accent="primary" onAgendar={onAgendar} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* DUPLOS */}
          <Section>
            <div ref={duplosRef} className="scroll-mt-20 mt-10 sm:mt-12 md:mt-14">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-brand-green md:text-2xl">🔥 COMBOS DUPLOS</h2>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground">Combine 2 serviços e economize</p>
            
            {/* Sub-filtros Duplos */}
            <div className="-mx-3 mt-4 sm:mt-5 md:mt-6 overflow-x-auto px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0">
              <div className="flex w-max gap-1.5 sm:gap-2 snap-x snap-mandatory">
                {subDuploTabs.map((t) => {
                  const active = subDuplo === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setSubDuplo(t.key)}
                      className={
                        "snap-start whitespace-nowrap rounded-tight px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-bold tracking-wide transition-colors duration-300 " +
                        (active
                          ? "bg-brand-green text-white"
                          : "border border-brand-green text-brand-green hover:bg-brand-green/10")
                      }
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="mt-4 sm:mt-5 md:mt-6">
              {loading ? (
                skeletonGrid(6)
              ) : duplosFiltered.length === 0 ? (
                <p className="text-center text-xs sm:text-sm text-muted-foreground py-8">Nenhum combo duplo encontrado.</p>
              ) : (
                <div className="grid gap-4 sm:gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {duplosFiltered.map((c) => (
                    <ComboCard key={c.id} item={c} tone="brand-green" onAgendar={onAgendar} />
                  ))}
                </div>
              )}
            </div>
          </div>
          </Section>

          {/* TRIPLOS */}
          <Section>
            <div ref={triplosRef} className="scroll-mt-20 mt-10 sm:mt-12 md:mt-14">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-destructive md:text-2xl">⭐ COMBOS TRIPLOS</h2>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground">Serviço completo com desconto especial</p>
            
            {/* Sub-filtros Triplos */}
            <div className="-mx-3 mt-4 sm:mt-5 md:mt-6 overflow-x-auto px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0">
              <div className="flex w-max gap-1.5 sm:gap-2 snap-x snap-mandatory">
                {subTriploTabs.map((t) => {
                  const active = subTriplo === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setSubTriplo(t.key)}
                      className={
                        "snap-start whitespace-nowrap rounded-tight px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-bold tracking-wide transition-colors duration-300 " +
                        (active
                          ? "bg-destructive text-white"
                          : "border border-destructive text-destructive hover:bg-destructive/10")
                      }
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="mt-4 sm:mt-5 md:mt-6">
              {loading ? (
                skeletonGrid(6)
              ) : triplosFiltered.length === 0 ? (
                <p className="text-center text-xs sm:text-sm text-muted-foreground py-8">Nenhum combo triplo encontrado.</p>
              ) : (
                <div className="grid gap-4 sm:gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {triplosFiltered.map((c) => (
                    <ComboCard key={c.id} item={c} tone="destructive" onAgendar={onAgendar} />
                  ))}
                </div>
              )}
            </div>
          </div>
          </Section>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-card px-3 py-12 sm:px-4 sm:py-16 md:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl border-t border-border pt-8 sm:pt-10 md:pt-12 text-center">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground md:text-3xl lg:text-4xl">ENCONTROU O SERVIÇO IDEAL?</h2>
          <div className="mt-6 sm:mt-7 md:mt-8">
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  navigate("/login", { state: { from: "/agendar" } });
                  return;
                }
                navigate("/agendar");
              }}
              className="rounded-tight bg-primary px-8 py-3 sm:px-10 sm:py-3.5 md:py-4 text-sm sm:text-base font-black text-primary-foreground transition-transform duration-200 hover:scale-105"
            >
              AGENDAR AGORA
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
