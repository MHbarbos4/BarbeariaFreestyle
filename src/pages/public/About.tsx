import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FaBullseye,
  FaClock,
  FaEnvelope,
  FaGem,
  FaInstagram,
  FaMapMarkerAlt,
  FaPhone,
  FaStore,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import sobreImage from "@/assets/Sobre/Sobre.jpeg";

type Stat = { number: number; label: string; suffix?: string };

const aboutData = {
  stats: [
    { number: 5, label: "Anos", suffix: "+" },
    { number: 400, label: "Clientes", suffix: "+" },
    { number: 100, label: "Satisfação", suffix: "%" },
  ] satisfies Stat[],
  history: {
    title: "NOSSA HISTÓRIA",
    paragraphs: [
      "A Barbearia Freestyle nasceu em 2021 com um propósito claro: revolucionar o conceito de barbearia tradicional, trazendo estilo urbano, técnicas modernas e um atendimento diferenciado.",
      "Começamos com um sonho e uma cadeira. Hoje, somos referência em cortes modernos, coloração e tratamentos capilares, sempre mantendo a essência do atendimento personalizado.",
      "Cada cliente é único para nós. Por isso, dedicamos tempo para entender o estilo de cada pessoa e criar o visual perfeito.",
    ],
    imageUrl: sobreImage,
    imageAlt: "Interior da barbearia com estilo urbano",
  },
  mission: {
    text: "Proporcionar experiências únicas através de cortes impecáveis, atendimento de excelência e um ambiente moderno e acolhedor.",
  },
  vision: {
    text: "Ser referência em estilo e qualidade, expandindo nossa marca e levando o padrão Freestyle para mais pessoas.",
  },
  values: [
    "Qualidade sem compromisso",
    "Atendimento personalizado",
    "Inovação constante",
    "Respeito ao cliente",
    "Paixão pelo que fazemos",
  ],
  contact: {
    addressLines: ["Rua João Marcolino, 17", "São Conrado", "Sorocaba - SP", "CEP: 18076-219"],
    phoneDisplay: "(15) 99134-7226",
    phoneE164: "+5515991347226",
    email: "guifrestylebarber@gmail.com", // Email institucional da empresa (não usado para login)
    instagramHandle: "@gui.freestyle",
    instagramUrl: "https://instagram.com/gui.freestyle",
    whatsappUrl: "https://wa.me/5515991347226",
    mapEmbedUrl:
      "https://www.google.com/maps?q=Rua+João+Marcolino,+17,+São+Conrado,+Sorocaba,+SP&output=embed",
    mapOpenUrl: "https://www.google.com/maps/search/?api=1&query=Rua+João+Marcolino,+17,+São+Conrado,+Sorocaba,+SP",
  },
  hours: {
    title: "HORÁRIOS DE FUNCIONAMENTO",
    weekdays: "Segunda a Sexta: 9h às 18h",
    saturday: "Sábado: 9h às 14h",
    sunday: "Domingo: Fechado",
  },
  differentiators: [
    {
      title: "Profissionais Qualificados",
      description: "Equipe experiente e sempre atualizada",
      icon: FaUsers,
    },
    {
      title: "Produtos Premium",
      description: "Utilizamos apenas produtos de alta qualidade",
      icon: FaGem,
    },
    {
      title: "Ambiente Moderno",
      description: "Espaço confortável e climatizado",
      icon: FaStore,
    },
    {
      title: "Atendimento Personalizado",
      description: "Cada cliente recebe atenção exclusiva",
      icon: FaBullseye,
    },
  ],
};

function useInViewOnce<T extends Element>(options?: IntersectionObserverInit) {
  const ref = React.useRef<T | null>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25, ...options },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [inView, options]);

  return { ref, inView } as const;
}

function useCountUp({ to, durationMs, start }: { to: number; durationMs: number; start: boolean }) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (!start) return;
    if (reduceMotion) {
      setValue(to);
      return;
    }

    const startTime = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      // Ease-out simples (não precisa de lib extra)
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, reduceMotion, start, to]);

  return value;
}

function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={className}>
      {children}
    </section>
  );
}

export default function About() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const reduceMotion = useReducedMotion();

  const locationRef = React.useRef<HTMLElement | null>(null);

  const statsInView = useInViewOnce<HTMLDivElement>({ threshold: 0.35 });
  const years = useCountUp({ to: aboutData.stats[0].number, durationMs: 2000, start: statsInView.inView });
  const clients = useCountUp({ to: aboutData.stats[1].number, durationMs: 2000, start: statsInView.inView });
  const satisfaction = useCountUp({ to: aboutData.stats[2].number, durationMs: 2000, start: statsInView.inView });

  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const handleSchedule = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/agendar" } });
      return;
    }
    navigate("/agendar");
  };

  const handleScrollToMap = () => {
    locationRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <div>
      {/* HERO */}
      <header className="flex min-h-[30vh] items-center justify-center bg-background px-3 py-10 text-center sm:h-[35vh] sm:px-4 sm:py-12 md:h-[40vh] md:px-6 md:py-16 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl md:text-4xl lg:text-5xl"
          >
            SOBRE NÓS
          </motion.h1>
          <p className="mt-3 px-2 text-sm text-foreground sm:text-base md:mt-4 md:text-lg">"Conheça nossa história e valores"</p>
        </div>
      </header>

      {/* SEÇÃO 1 — HISTÓRIA */}
      <Section className="bg-background px-3 py-12 sm:px-4 sm:py-16 md:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-stretch">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-card"
            >
              <img
                src={aboutData.history.imageUrl}
                alt={aboutData.history.imageAlt}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              className="flex flex-col justify-center"
            >
              <h2 className="text-2xl font-extrabold tracking-tight text-primary md:text-3xl">
                {aboutData.history.title}
              </h2>
              <div className="mt-6 space-y-6 text-base leading-relaxed text-muted-foreground md:text-lg">
                {aboutData.history.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>

              <div ref={statsInView.ref} className="mt-10 grid gap-4 sm:grid-cols-3">
                <StatCard value={years} suffix={aboutData.stats[0].suffix} label={aboutData.stats[0].label} />
                <StatCard value={clients} suffix={aboutData.stats[1].suffix} label={aboutData.stats[1].label} />
                <StatCard
                  value={satisfaction}
                  suffix={aboutData.stats[2].suffix}
                  label={aboutData.stats[2].label}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* SEÇÃO 2 — MISSÃO / VISÃO / VALORES */}
      <Section className="bg-card px-4 py-24 md:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            variants={fadeUp}
            className="text-center"
          >
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">
              MISSÃO, VISÃO E VALORES
            </h2>
          </motion.div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <MvvCard
              tone="primary"
              icon="🎯"
              title="MISSÃO"
              text={aboutData.mission.text}
              hoverBorderClass="hover:border-primary"
            />
            <MvvCard
              tone="green"
              icon="👁️"
              title="VISÃO"
              text={aboutData.vision.text}
              hoverBorderClass="hover:border-brand-green"
            />
            <ValuesCard values={aboutData.values} />
          </div>
        </div>
      </Section>

      {/* SEÇÃO 3 — LOCALIZAÇÃO E CONTATO */}
      <Section
        id="localizacao"
        className="bg-background px-4 py-24 md:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <iframe
                title="Mapa da Barbearia Freestyle"
                src={aboutData.contact.mapEmbedUrl}
                className="h-[400px] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                style={{ filter: "grayscale(20%) brightness(80%)" }}
              />
              <a
                href={aboutData.contact.mapOpenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-tight bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-transform duration-200 hover:scale-[1.02] hover:shadow-md"
              >
                <FaMapMarkerAlt className="h-4 w-4" />
                COMO CHEGAR
              </a>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              variants={fadeUp}
              className="space-y-8"
              ref={(node) => {
                locationRef.current = node;
              }}
            >
              <div>
                <h3 className="flex items-center gap-3 text-lg font-extrabold tracking-tight text-primary">
                  <FaMapMarkerAlt className="h-5 w-5" aria-hidden="true" />
                  ENDEREÇO
                </h3>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {aboutData.contact.addressLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-8">
                <h3 className="flex items-center gap-3 text-lg font-extrabold tracking-tight text-brand-green">
                  <FaClock className="h-5 w-5" aria-hidden="true" />
                  {aboutData.hours.title}
                </h3>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>{aboutData.hours.weekdays}</p>
                  <p>{aboutData.hours.saturday}</p>
                  <p>{aboutData.hours.sunday}</p>
                </div>
              </div>

              <div className="border-t border-border pt-8">
                <h3 className="text-lg font-extrabold tracking-tight text-destructive">📞 CONTATO</h3>
                <div className="mt-4 grid gap-3">
                  <ContactButton
                    href={`tel:${aboutData.contact.phoneE164}`}
                    icon={<FaPhone className="h-5 w-5" aria-hidden="true" />}
                    title={aboutData.contact.phoneDisplay}
                    actionLabel="LIGAR"
                    openNewTab={false}
                  />
                  <ContactButton
                    href={aboutData.contact.whatsappUrl}
                    icon={<FaWhatsapp className="h-5 w-5" aria-hidden="true" />}
                    title="WhatsApp"
                    actionLabel="ABRIR CHAT"
                    openNewTab
                  />
                  <ContactButton
                    href={`mailto:${aboutData.contact.email}`}
                    icon={<FaEnvelope className="h-5 w-5" aria-hidden="true" />}
                    title={aboutData.contact.email}
                    actionLabel="ENVIAR EMAIL"
                    openNewTab={false}
                  />
                  <ContactButton
                    href={aboutData.contact.instagramUrl}
                    icon={<FaInstagram className="h-5 w-5" aria-hidden="true" />}
                    title={aboutData.contact.instagramHandle}
                    actionLabel="INSTAGRAM"
                    openNewTab
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* SEÇÃO 4 — DIFERENCIAIS */}
      <Section className="bg-card px-4 py-24 md:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            variants={fadeUp}
            className="text-center"
          >
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">NOSSOS DIFERENCIAIS</h2>
          </motion.div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {aboutData.differentiators.map((d) => (
              <motion.article
                key={d.title}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45 }}
                className="rounded-lg border border-border bg-background p-8 text-center transition-transform duration-300 hover:-translate-y-1"
              >
                <d.icon className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
                <h3 className="mt-5 text-base font-bold text-foreground">{d.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA FINAL */}
      <Section className="bg-background px-4 py-24 md:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-4xl">VENHA NOS CONHECER!</h2>
          <p className="mt-4 text-sm text-muted-foreground md:text-base">
            "Faça uma visita ou agende seu horário agora"
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="hero" size="xl" onClick={handleSchedule}>
              AGENDAR HORÁRIO
            </Button>
            <Button variant="outline" size="xl" onClick={handleScrollToMap}>
              VER NO MAPA
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}

function StatCard({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  return (
    <div className="rounded-lg border border-primary bg-card p-5 text-center shadow-card">
      <div className="text-3xl font-extrabold tracking-tight text-primary">
        {value}
        {suffix ?? ""}
      </div>
      <div className="mt-1 text-xs font-semibold tracking-[0.14em] text-foreground">{label}</div>
    </div>
  );
}

function MvvCard({
  icon,
  title,
  text,
  tone,
  hoverBorderClass,
}: {
  icon: string;
  title: string;
  text: string;
  tone: "primary" | "green";
  hoverBorderClass: string;
}) {
  const titleClass = tone === "primary" ? "text-primary" : "text-brand-green";
  return (
    <article
      className={`rounded-lg border border-border bg-background p-10 text-center transition-colors duration-300 ${hoverBorderClass}`}
    >
      <div className="text-4xl" aria-hidden="true">
        {icon}
      </div>
      <h3 className={`mt-4 text-sm font-extrabold tracking-[0.16em] ${titleClass}`}>{title}</h3>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </article>
  );
}

function ValuesCard({ values }: { values: string[] }) {
  return (
    <article className="rounded-lg border border-border bg-background p-10 text-center transition-colors duration-300 hover:border-destructive">
      <div className="text-4xl" aria-hidden="true">
        ⭐
      </div>
      <h3 className="mt-4 text-sm font-extrabold tracking-[0.16em] text-destructive">VALORES</h3>
      <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
        {values.map((v) => (
          <li key={v} className="flex items-start justify-center gap-2">
            <span className="mt-0.5 text-brand-green" aria-hidden="true">
              ✓
            </span>
            <span>{v}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function ContactButton({
  href,
  icon,
  title,
  actionLabel,
  openNewTab,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  actionLabel: string;
  openNewTab: boolean;
}) {
  return (
    <a
      href={href}
      target={openNewTab ? "_blank" : undefined}
      rel={openNewTab ? "noopener noreferrer" : undefined}
      className="group flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4 transition-colors duration-300 hover:border-primary"
    >
      <span className="flex items-center gap-3">
        <span className="text-foreground transition-transform duration-300 group-hover:scale-105">{icon}</span>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </span>
      <span className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground group-hover:text-primary">
        {actionLabel}
      </span>
    </a>
  );
}
