import { useCallback, useEffect, useMemo, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, ImageOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { getAllGalleryPhotos } from "@/services/api/galleryService";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { GalleryPhoto } from "@/lib/supabase";

type Category = "todos" | "Cortes" | "Luzes" | "Quimica";

function GalleryCard({
  image,
  onOpen,
}: {
  image: GalleryPhoto;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="group relative aspect-[3/4] sm:aspect-[3/4] md:aspect-square cursor-pointer overflow-hidden rounded-lg border-2 border-primary bg-accent shadow-card"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={`Abrir imagem: ${image.filename}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
    >
      {/* placeholder blur */}
      <div
        className={
          "absolute inset-0 bg-border transition-opacity duration-300 " +
          (loaded ? "opacity-0" : "opacity-100")
        }
        aria-hidden
      />

      <img
        src={image.url}
        alt={image.filename}
        loading="lazy"
        className={
          "h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 " +
          (loaded ? "blur-0" : "blur-sm")
        }
        onLoad={() => setLoaded(true)}
      />

      {/* overlay info */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-xs sm:text-sm font-semibold text-primary/90 uppercase">{image.category}</p>
        </div>
      </div>
    </div>
  );
}

export default function Gallery() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<Category>("todos");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const isConfigured = isSupabaseConfigured();

  // Função para embaralhar array (Fisher-Yates shuffle)
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Carregar fotos do Supabase
  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      setError("Supabase não configurado. Configure as variáveis de ambiente.");
      return;
    }

    setLoading(true);
    setError(null);
    
    getAllGalleryPhotos()
      .then((data) => {
        // Embaralha as fotos para exibição aleatória
        setPhotos(shuffleArray(data));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar galeria:", err);
        setError("Erro ao carregar fotos. Tente novamente mais tarde.");
        setLoading(false);
      });
  }, [isConfigured]);

  const filtered = useMemo(() => {
    if (filter === "todos") return photos;
    return photos.filter((g) => g.category === filter);
  }, [filter, photos]);

  // garante índice válido ao trocar filtro
  useEffect(() => {
    setIndex(0);
  }, [filter]);

  const openAt = useCallback(
    (i: number) => {
      setIndex(i);
      setOpen(true);
    },
    [setOpen],
  );

  const close = useCallback(() => setOpen(false), []);

  const prev = useCallback(() => setIndex((i) => (i - 1 + filtered.length) % filtered.length), [filtered.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % filtered.length), [filtered.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, prev, next]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => next(),
    onSwipedRight: () => prev(),
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  const tabs: { key: Category; label: string }[] = [
    { key: "todos", label: "TODOS" },
    { key: "Cortes", label: "CORTES" },
    { key: "Luzes", label: "LUZES" },
    { key: "Quimica", label: "QUÍMICAS" },
  ];

  const current = filtered[index];

  return (
    <div className="-mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8">
      {/* HERO */}
      <section className="bg-background px-3 py-10 sm:px-4 sm:py-12 md:px-6 md:py-14 lg:px-8 lg:py-16" style={{ minHeight: "30vh" }}>
        <div className="mx-auto flex min-h-[30vh] max-w-4xl flex-col items-center justify-center text-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <h1 className="text-2xl font-black tracking-tight text-primary sm:text-3xl md:text-4xl lg:text-5xl">GALERIA</h1>
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm md:text-base text-foreground/90">Confira nossos trabalhos e inspire-se</p>
          </motion.div>
        </div>
      </section>

      {/* FILTROS */}
      <section className="bg-background px-3 pb-6 sm:px-4 sm:pb-8 md:px-6 md:pb-10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="-mx-3 overflow-x-auto px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0">
            <div className="flex w-max md:w-full justify-start md:justify-center gap-2 sm:gap-3">
              {tabs.map((t) => {
                const active = filter === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFilter(t.key)}
                    className={
                      "snap-start whitespace-nowrap rounded-tight px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-black tracking-wide transition-colors duration-300 " +
                      (active
                        ? "bg-primary text-primary-foreground"
                        : "border border-foreground text-foreground hover:border-primary hover:text-primary")
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* GALERIA (CARROSSEL) */}
      <section className="bg-background px-3 py-8 sm:px-4 sm:py-12 md:px-6 md:py-16 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : error ? (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-12 text-center">
                  <ImageOff className="mx-auto h-12 w-12 text-destructive" />
                  <p className="mt-4 text-lg font-semibold text-destructive">{error}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Configure o Supabase para ver as fotos</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-lg border border-border bg-card p-12 text-center">
                  <ImageOff className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-lg font-semibold text-foreground">Nenhuma imagem encontrada</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {filter === "todos" 
                      ? "Adicione fotos no painel administrativo" 
                      : "Tente outro filtro ou adicione fotos nesta categoria"}
                  </p>
                </div>
              ) : (
                <>
                  {/* CARROSSEL - MOBILE */}
                  <div className="block md:hidden">
                    <Carousel
                      opts={{
                        align: "start",
                        loop: true,
                      }}
                      className="w-full"
                    >
                      <CarouselContent className="-ml-2 sm:-ml-3">
                        {filtered.map((img, i) => (
                          <CarouselItem key={`${img.id}-${i}`} className="pl-2 sm:pl-3 basis-full sm:basis-1/2">
                            <GalleryCard image={img} onOpen={() => openAt(i)} />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3 sm:gap-4">
                        <CarouselPrevious className="static translate-y-0 h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary hover:bg-primary hover:text-primary-foreground" />
                        <div className="text-xs sm:text-sm font-bold text-foreground">
                          {filtered.length} {filtered.length === 1 ? 'imagem' : 'imagens'}
                        </div>
                        <CarouselNext className="static translate-y-0 h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary hover:bg-primary hover:text-primary-foreground" />
                      </div>
                    </Carousel>
                  </div>

                  {/* GRID - DESKTOP */}
                  <div className="hidden md:grid gap-4 lg:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((img, i) => (
                      <GalleryCard key={`${img.id}-${i}`} image={img} onOpen={() => openAt(i)} />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* CTA final */}
      {!error && photos.length > 0 && (
        <section className="bg-card px-3 py-12 sm:px-4 sm:py-16 md:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-6xl border-t border-border pt-8 sm:pt-10 md:pt-12 text-center">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground md:text-3xl lg:text-4xl">GOSTOU DO QUE VIU?</h2>
            <p className="mx-auto mt-2 sm:mt-3 max-w-xl text-xs sm:text-sm text-muted-foreground md:text-base">Agende agora e seja o próximo</p>
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
                AGENDAR MEU HORÁRIO
              </button>
            </div>
          </div>
        </section>
      )}

      {/* LIGHTBOX */}
      <AnimatePresence>
        {open && current ? (
          <motion.div
            className="fixed inset-0 z-[70]"
            initial={reduce ? false : { opacity: 0 }}
            animate={reduce ? undefined : { opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Fechar lightbox"
              className="absolute inset-0 bg-background/95"
              onClick={close}
            />

            <motion.div
              className="relative flex h-full w-full items-center justify-center px-4"
              initial={reduce ? false : { scale: 0.96, opacity: 0 }}
              animate={reduce ? undefined : { scale: 1, opacity: 1 }}
              exit={reduce ? undefined : { scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              {...swipeHandlers}
            >
              {/* top bar */}
              <div className="absolute left-0 right-0 top-0 flex h-16 items-center justify-end gap-3 px-4">
                <p className="text-sm font-semibold text-foreground">
                  {index + 1} / {filtered.length}
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="grid h-10 w-10 place-items-center rounded-full border border-foreground bg-foreground text-background transition-colors duration-300 hover:bg-primary hover:text-primary-foreground"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* nav buttons */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full border border-foreground bg-foreground text-background transition-colors duration-300 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full border border-foreground bg-foreground text-background transition-colors duration-300 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Próxima"
              >
                <ChevronRight className="h-6 w-6" />
              </button>

              {/* image */}
              <motion.div
                key={current.id + ":" + index}
                initial={reduce ? false : { x: 24, opacity: 0 }}
                animate={reduce ? undefined : { x: 0, opacity: 1 }}
                exit={reduce ? undefined : { x: -24, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="max-h-[90vh] w-full max-w-[90vw]"
              >
                <img
                  src={current.url}
                  alt={current.filename}
                  className="max-h-[90vh] w-full rounded-lg object-contain shadow-card"
                  loading="eager"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
