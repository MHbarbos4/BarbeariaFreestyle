import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FaFacebook, FaInstagram, FaStar, FaWhatsapp } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import guilhermePhoto from "@/assets/Equipe/Guilherme.jpeg";

type SocialLinks = {
  instagram?: string;
  whatsapp?: string;
  facebook?: string;
};

type TeamMember = {
  id: number;
  name: string;
  role: string;
  photo: string;
  bio: string;
  specialties: string[];
  social: SocialLinks;
};

type Testimonial = {
  id: number;
  stars: number;
  text: string;
  author: string;
};

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
      animate={reduce ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}

function SocialIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-transform duration-200 hover:scale-105 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </a>
  );
}

function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const total = items.length;
  const active = items[index] ?? items[0];

  const go = (next: number) => {
    if (total === 0) return;
    const normalized = (next + total) % total;
    setIndex(normalized);
  };

  useEffect(() => {
    if (reduce) return;
    if (total <= 1) return;
    if (isHovering) return;

    intervalRef.current = window.setInterval(() => {
      setIndex((v) => (v + 1) % total);
    }, 5000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isHovering, reduce, total]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, total]);

  if (!active) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, slot) => {
          const i = (index + slot) % total;
          const t = items[i];
          return (
            <motion.article
              key={t.id}
              className="rounded-lg border border-border bg-accent p-8 shadow-card"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="flex items-center gap-1 text-primary" aria-label={`${t.stars} estrelas`}>
                {Array.from({ length: t.stars }).map((__, s) => (
                  <FaStar key={s} className="h-4 w-4" />
                ))}
              </div>
              <p className="mt-5 text-sm italic leading-relaxed text-foreground">“{t.text}”</p>
              <p className="mt-5 text-xs text-muted-foreground">— {t.author}</p>
            </motion.article>
          );
        })}
      </div>

      {/* Controles */}
      {total > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Depoimento anterior"
            onClick={() => go(index - 1)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2" role="tablist" aria-label="Navegação de depoimentos">
            {items.map((t, i) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Ir para depoimento ${i + 1}`}
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
            aria-label="Próximo depoimento"
            onClick={() => go(index + 1)}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function Team() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const teamMembers: TeamMember[] = useMemo(
    () => [
      {
        id: 2,
        name: "Guilherme Xavier",
        role: "Barbeiro e Proprietário",
        photo: guilhermePhoto,
        bio: "5 anos dedicados à arte da barbearia. Especialista em cortes clássicos e modernos. Atendimento personalizado para cada cliente.",
        specialties: ["Social", "Contornado","Degrade", "Barba", "Infantil","Luzes","Platinado"],
        social: {
          instagram: "https://www.instagram.com/gui.freestyles?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
          whatsapp: "https://wa.me/5515991347226",
        },
      },
    ],
    [],
  );

  const testimonials: Testimonial[] = useMemo(
    () => [
      {
        id: 1,
        stars: 5,
        text: "Melhor barbearia da região! Atendimento impecável e corte perfeito. Recomendo!",
        author: "João Cliente",
      },
      {
        id: 2,
        stars: 5,
        text: "Ambiente top, profissionais qualificados. Sempre saio satisfeito!",
        author: "Carlos Silva",
      },
      {
        id: 3,
        stars: 5,
        text: "Fiz luzes com o Pedro e ficou incrível! Voltarei com certeza.",
        author: "Marcos Santos",
      },
      {
        id: 4,
        stars: 5,
        text: "Atendimento nota 10! A equipe é muito atenciosa e o resultado sempre perfeito.",
        author: "Rafael Costa",
      },
    ],
    [],
  );

  const onAgendar = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/agendar" } });
      return;
    }
    navigate("/agendar");
  };

  return (
    <div className="-mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8">
      {/* HERO */}
      <section className="bg-background px-3 py-12 sm:px-4 sm:py-14 md:px-6 md:py-16 lg:px-8">
        <div className="mx-auto flex min-h-[25vh] max-w-4xl flex-col items-center justify-center text-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <h1 className="text-2xl font-black tracking-tight text-primary sm:text-3xl md:text-4xl lg:text-5xl">NOSSA EQUIPE</h1>
            <p className="mt-3 px-2 text-sm text-foreground/90 sm:text-base md:mt-4 md:text-lg">
              Profissionais qualificados e apaixonados pelo que fazem
            </p>
          </motion.div>
        </div>
      </section>

      {/* EQUIPE */}
      <Section className="bg-background px-4 py-20 md:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex justify-center">
            {teamMembers.map((m) => (
              <motion.article
                key={m.id}
                className="max-w-md rounded-xl border border-border bg-accent p-10 text-center shadow-card transition-all duration-300 hover:-translate-y-2 hover:border-primary hover:shadow-soft"
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <div className="mx-auto h-[200px] w-[200px] overflow-hidden rounded-full border-4 border-primary bg-background shadow-soft transition-transform duration-300 hover:scale-105">
                  <img
                    src={m.photo}
                    alt={`Foto de ${m.name}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>

                <h2 className="mt-6 text-2xl font-black tracking-tight text-foreground">{m.name}</h2>
                <p className="mt-2 text-sm font-semibold tracking-wide text-primary">{m.role}</p>

                <div className="mx-auto mt-6 h-px w-16 bg-border" aria-hidden />

                <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{m.bio}</p>

                <div className="mt-8">
                  <p className="text-xs font-black tracking-[0.18em] text-foreground">ESPECIALIDADES:</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {m.specialties.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-primary bg-transparent px-4 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-10">
                  <p className="text-xs font-black tracking-[0.18em] text-foreground">REDES SOCIAIS:</p>
                  <div className="mt-4 flex items-center justify-center gap-4">
                    {m.social.instagram ? (
                      <SocialIconLink href={m.social.instagram} label={`Instagram de ${m.name}`}>
                        <FaInstagram className="h-6 w-6" />
                      </SocialIconLink>
                    ) : null}
                    {m.social.whatsapp ? (
                      <SocialIconLink href={m.social.whatsapp} label={`WhatsApp de ${m.name}`}>
                        <FaWhatsapp className="h-6 w-6" />
                      </SocialIconLink>
                    ) : null}
                    {m.social.facebook ? (
                      <SocialIconLink href={m.social.facebook} label={`Facebook de ${m.name}`}>
                        <FaFacebook className="h-6 w-6" />
                      </SocialIconLink>
                    ) : null}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </Section>

      {/* DEPOIMENTOS (opcional) */}
      <Section className="bg-card px-4 py-20 md:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl border-t border-border pt-20">
          <h2 className="text-center text-2xl font-black tracking-tight text-foreground md:text-4xl">💬 O QUE DIZEM NOSSOS CLIENTES</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-muted-foreground md:text-base">
            Avaliações reais que mostram a consistência do nosso trabalho.
          </p>

          <div className="mt-12">
            <TestimonialCarousel items={testimonials} />
          </div>
        </div>
      </Section>

      {/* CTA FINAL */}
      <Section className="bg-background px-4 py-20 md:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl border-t border-border pt-20 text-center">
          <h2 className="text-3xl font-black tracking-tight text-foreground md:text-5xl">QUER CONHECER NOSSO TRABALHO?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-muted-foreground md:text-base">
            Agende seu horário e venha nos visitar
          </p>
          <div className="mt-10">
            <button
              type="button"
              onClick={onAgendar}
              className="rounded-tight bg-primary px-12 py-5 text-lg font-black text-primary-foreground transition-transform duration-200 hover:scale-105"
            >
              AGENDAR AGORA
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}
