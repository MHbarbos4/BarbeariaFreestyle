import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";

import heroImage from "@/assets/hero-barbershop.png";
import TricolorWordmark from "@/components/branding/TricolorWordmark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getAnnouncements, type Announcement } from "@/services/api/announcementService";

function Section({
  children,
  className,
}: {
  children: ReactNode;
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

/* Card de aviso individual */
function AnnouncementCard({ a }: { a: Announcement }) {
  const hasImage = Boolean(a.imageUrl);
  const hasContent = Boolean(a.content?.trim());
  
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-accent shadow-card">
      {/* Área de imagem (só aparece se tiver imagem) */}
      {hasImage ? (
        <div className="h-44 w-full overflow-hidden bg-black/30">
          <img
            src={a.imageUrl}
            alt={a.title}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
      ) : null}
      
      {/* Conteúdo */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-1 gap-3">
          <div className="w-1 shrink-0 rounded bg-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            {/* Título - maior se não tiver imagem */}
            <h3 className={
              hasImage 
                ? "line-clamp-2 text-sm font-black text-foreground" 
                : "line-clamp-2 text-base font-black text-foreground"
            }>
              {a.title}
            </h3>
            {/* Conteúdo - mais linhas se não tiver imagem */}
            {hasContent && (
              <p className={
                hasImage 
                  ? "mt-2 line-clamp-2 text-xs text-muted-foreground"
                  : "mt-3 line-clamp-4 text-sm text-muted-foreground"
              }>
                {a.content}
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/* Carrossel automático de avisos */
function AnnouncementCarousel({ items }: { items: Announcement[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const total = items.length;

  const go = (i: number) => {
    if (i < 0) setIndex(total - 1);
    else if (i >= total) setIndex(0);
    else setIndex(i);
  };

  useEffect(() => {
    if (reduce || isHovering || total <= 1) return;
    intervalRef.current = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % total);
    }, 5000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [isHovering, reduce, total]);

  if (total === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Cards visíveis */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: Math.min(3, total) }).map((_, slot) => {
          const i = (index + slot) % total;
          const a = items[i];
          return (
            <motion.div
              key={`${a.id}-${slot}`}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <AnnouncementCard a={a} />
            </motion.div>
          );
        })}
      </div>

      {/* Controles do carrossel */}
      {total > 3 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Aviso anterior"
            onClick={() => go(index - 1)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2" role="tablist" aria-label="Navegação de avisos">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Ir para aviso ${i + 1}`}
                onClick={() => go(i)}
                className={
                  "h-2.5 w-2.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                  (i === index ? "border-primary bg-primary" : "border-border bg-background hover:border-primary")
                }
              />
            ))}
          </div>

          <button
            type="button"
            aria-label="Próximo aviso"
            onClick={() => go(index + 1)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [annError, setAnnError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setAnnLoading(true);
      setAnnError(null);
      try {
        const data = await getAnnouncements();
        if (!alive) return;
        setAnnouncements(data);
      } catch (e: any) {
        if (!alive) return;
        setAnnError("Não foi possível carregar os avisos agora.");
      } finally {
        if (!alive) return;
        setAnnLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const activeAnnouncements = useMemo(
    () => announcements.filter((a) => a.isActive),
    [announcements],
  );

  const hasAnnouncements = annLoading ? true : activeAnnouncements.length > 0;

  const onAgendar = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/agendar" } });
      return;
    }
    navigate("/agendar");
  };

  const featuredServices = [
    {
      title: "CORTES",
      price: "A partir de R$ 20",
      color: "text-primary",
      hoverBorder: "hover:border-primary",
      iconUrl: "https://img.icons8.com/?size=100&id=QrcEYnItDZt7&format=png&color=FFFFFF",
    },
    {
      title: "QUÍMICAS",
      price: "A partir de R$ 45",
      color: "text-brand-green",
      hoverBorder: "hover:border-brand-green",
      iconUrl: "https://img.icons8.com/?size=100&id=P17Hph2qPDAr&format=png&color=FFFFFF",
    },
    {
      title: "LUZES / COR",
      price: "A partir de R$ 75",
      color: "text-destructive",
      hoverBorder: "hover:border-destructive",
      iconUrl: "https://img.icons8.com/?size=100&id=TODrwVZJK3Qm&format=png&color=FFFFFF",
    },
    {
      title: "ACABAMENTOS",
      price: "A partir de R$ 8",
      color: "text-primary",
      hoverBorder: "hover:border-primary",
      iconUrl: "https://img.icons8.com/?size=100&id=5ohTvGfNXvVX&format=png&color=FFFFFF",
    },
  ];

  return (
    <div className="-mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8">
      {/* SEÇÃO 1 - HERO */}
      <section className="relative min-h-[100vh] bg-background px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Interior de barbearia com estética urbana"
            className="h-full w-full object-cover opacity-20"
            loading="lazy"
          />
        </div>
        {/* camada preta sólida para manter contraste (sem gradientes) */}
        <div className="absolute inset-0 bg-background/80" aria-hidden />
        <div className="relative mx-auto flex min-h-[100vh] max-w-4xl flex-col items-center justify-center px-2 text-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="max-w-[800px] px-2"
          >
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
              <TricolorWordmark text="BARBEARIA FREESTYLE" className="justify-center" />
            </h1>
            <p className="mt-3 text-sm text-foreground/90 sm:text-base md:mt-4 md:text-lg">
              Tradição e Elegância a cada corte
            </p>
            <div className="mt-6 sm:mt-8">
              <button
                type="button"
                onClick={onAgendar}
                className="rounded-tight bg-primary px-6 py-3 text-sm font-black text-primary-foreground transition-transform duration-200 hover:scale-105 sm:px-8 sm:py-3.5 sm:text-base md:px-10 md:py-4"
              >
                AGENDAR HORÁRIO
              </button>
            </div>
          </motion.div>

          <button
            type="button"
            aria-label="Rolar para baixo"
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 text-foreground/90"
          >
            <ChevronDown className="h-7 w-7 animate-bounce" />
          </button>
        </div>
      </section>

      {/* SEÇÃO 2 - AVISOS */}
      {hasAnnouncements ? (
        <Section className="bg-background px-3 py-12 sm:px-4 sm:py-16 md:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-xs font-black tracking-[0.18em] text-primary sm:text-sm">📢 AVISOS</h2>

            <div className="mt-6 sm:mt-8 md:mt-10">
              {annLoading ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border bg-accent shadow-card"
                      aria-label="Carregando aviso"
                    >
                      <div className="aspect-video w-full rounded-t-lg bg-border" />
                      <div className="p-5">
                        <div className="h-4 w-2/3 rounded bg-border" />
                        <div className="mt-3 h-3 w-full rounded bg-border" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : annError ? (
                <div className="rounded-md border border-border bg-accent p-6">
                  <p className="text-sm text-muted-foreground">{annError}</p>
                </div>
              ) : activeAnnouncements.length <= 3 ? (
                /* Se 3 ou menos, mostra em grid normal */
                <div className="grid gap-4 md:grid-cols-3">
                  {activeAnnouncements.map((a) => (
                    <AnnouncementCard key={a.id} a={a} />
                  ))}
                </div>
              ) : (
                /* Se mais de 3, mostra carrossel */
                <AnnouncementCarousel items={activeAnnouncements} />
              )}
            </div>
          </div>
        </Section>
      ) : null}

      {/* SEÇÃO 3 - SERVIÇOS EM DESTAQUE */}
      <Section className="bg-background px-3 py-12 sm:px-4 sm:py-16 md:px-6 md:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xl font-black tracking-tight text-foreground sm:text-2xl md:text-3xl lg:text-4xl">
            NOSSOS SERVIÇOS
          </h2>

          <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:mt-12">
            {featuredServices.map((service) => (
              <div
                key={service.title}
                className={
                  "group rounded-lg border border-border bg-accent p-4 shadow-card transition-transform duration-300 hover:scale-[1.02] sm:p-5 md:p-6 " +
                  service.hoverBorder
                }
              >
                <img src={service.iconUrl} alt={service.title} className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10" />
                <p className={"mt-3 text-xs font-black tracking-[0.18em] sm:text-sm md:mt-4 " + service.color}>{service.title}</p>
                <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm md:mt-2">{service.price}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center sm:mt-8 md:mt-10">
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-accent"
              onClick={() => navigate("/servicos")}
            >
              VER TODOS OS SERVIÇOS
            </Button>
          </div>
        </div>
      </Section>

      {/* SEÇÃO 4 - PLANOS */}
      <Section className="bg-background px-3 py-12 sm:px-4 sm:py-16 md:px-6 md:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xl font-black tracking-tight text-foreground sm:text-2xl md:text-3xl lg:text-4xl">💎 PLANOS MENSAIS</h2>
          <p className="mx-auto mt-3 max-w-2xl px-4 text-center text-xs text-muted-foreground sm:text-sm md:mt-4 md:text-base">
            Economia e praticidade para clientes frequentes
          </p>

          <div className="mt-8 grid gap-4 sm:mt-10 md:mt-12 lg:grid-cols-3">
            {/* Club Corte */}
            <div className="flex flex-col rounded-lg border-2 border-brand-green bg-card p-5 shadow-card sm:p-6 md:p-8">
              <p className="text-xs font-black tracking-[0.18em] text-foreground sm:text-sm">CLUB CORTE</p>
              <p className="mt-4 text-2xl font-black text-brand-green sm:text-3xl md:mt-6">R$ 120/mês</p>
              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground sm:text-sm md:mt-6 md:space-y-2">
                <li>✓ Cortes ilimitados</li>
                <li>✓ Agendamento Seg a Qui</li>
              </ul>
              <div className="mt-auto pt-6 md:pt-8">
                <Button
                  variant="success"
                  size="lg"
                  className="w-full rounded-tight"
                  onClick={() => navigate("/planos")}
                >
                  SAIBA MAIS
                </Button>
              </div>
            </div>

            {/* Club Combo */}
            <div className="flex flex-col rounded-lg border-2 border-primary bg-card p-5 shadow-card sm:p-6 md:p-8">
              <p className="text-xs font-black tracking-[0.18em] text-foreground sm:text-sm">CLUB COMBO</p>
              <p className="mt-4 text-2xl font-black text-primary sm:text-3xl md:mt-6">R$ 180/mês</p>
              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground sm:text-sm md:mt-6 md:space-y-2">
                <li>✓ Cortes + Barba ilimitados</li>
                <li>✓ Agendamento Seg a Sex</li>
                <li>✓ 5% desconto em produtos</li>
              </ul>
              <div className="mt-auto pt-6 md:pt-8">
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full rounded-tight"
                  onClick={() => navigate("/planos")}
                >
                  SAIBA MAIS
                </Button>
              </div>
            </div>

            {/* Club VIP */}
            <div className="relative flex flex-col rounded-lg border-2 border-destructive bg-card p-5 shadow-card sm:p-6 md:p-8">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-destructive px-3 py-0.5 text-[10px] font-black text-white sm:text-xs md:px-4 md:py-1">
                MAIS POPULAR
              </span>
              <p className="text-xs font-black tracking-[0.18em] text-foreground sm:text-sm">CLUB VIP</p>
              <p className="mt-4 text-2xl font-black text-destructive sm:text-3xl md:mt-6">R$ 230/mês</p>
              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground sm:text-sm md:mt-6 md:space-y-2">
                <li>✓ Cortes + Barba ilimitados</li>
                <li>✓ Sobrancelha grátis</li>
                <li>✓ Todos os dias (incluindo Sábado)</li>
                <li>✓ Horário fixo + 10% desc. produtos</li>
              </ul>
              <div className="mt-auto pt-6 md:pt-8">
                <Button
                  variant="danger"
                  size="lg"
                  className="w-full rounded-tight"
                  onClick={() => navigate("/planos")}
                >
                  SAIBA MAIS
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center sm:mt-8 md:mt-10">
            <Button
              variant="outline"
              className="border-primary text-xs text-primary hover:bg-accent sm:text-sm"
              onClick={() => navigate("/planos")}
            >
              <Wrench className="mr-2 h-3 w-3 text-white sm:h-4 sm:w-4" />
              MONTE SEU PLANO PERSONALIZADO
            </Button>
          </div>
        </div>
      </Section>

      {/* SEÇÃO 5 - CTA */}
      <Section className="bg-background px-3 py-16 sm:px-4 sm:py-20 md:px-6 md:py-24 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl border-t border-border pt-12 text-center sm:pt-16 md:pt-20">
          <h2 className="px-4 text-2xl font-black tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl">PRONTO PARA MUDAR SEU ESTILO?</h2>
          <p className="mx-auto mt-3 max-w-2xl px-4 text-xs text-muted-foreground sm:text-sm md:mt-5 md:text-base">
            Agende seu horário agora e venha fazer parte da família Freestyle
          </p>
          <div className="mt-6 sm:mt-8 md:mt-10">
            <button
              type="button"
              onClick={onAgendar}
              className="rounded-tight bg-primary px-8 py-3.5 text-base font-black text-primary-foreground transition-transform duration-200 hover:scale-105 sm:px-10 sm:py-4 md:px-12 md:py-5 md:text-lg"
            >
              AGENDAR AGORA
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}
