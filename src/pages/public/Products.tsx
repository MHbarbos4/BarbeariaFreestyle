import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FaMapMarkerAlt, FaWhatsapp } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import {
  getShopProducts,
  getTshirts,
  type ShopProduct,
  type TshirtProduct,
} from "@/services/api/productService";

type Tab = "camisetas" | "produtos";
type SubFilter = "todos" | "cabelo" | "barba";

const contactLinks = {
  whatsapp: "https://wa.me/5511999999999",
  maps: "https://www.google.com/maps?q=Rua%20Exemplo%2C%20123%2C%20S%C3%A3o%20Paulo%20-%20SP",
};

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function tabClass(active: boolean) {
  return active
    ? "bg-primary text-primary-foreground"
    : "border border-border bg-background text-foreground hover:border-primary";
}

function subTabClass(active: boolean) {
  return active
    ? "bg-primary text-primary-foreground"
    : "border border-border bg-background text-foreground hover:border-primary";
}

function stockBadge(stock: number) {
  if (stock <= 0) return { text: "Esgotado", className: "bg-destructive text-destructive-foreground" };
  if (stock <= 5) return { text: `${stock} unidades`, className: "bg-primary text-primary-foreground" };
  return { text: "Em estoque", className: "bg-brand-green text-background" };
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
      <div className="aspect-square w-full bg-border" />
      <div className="p-5">
        <div className="h-4 w-3/4 rounded bg-border" />
        <div className="mt-3 h-3 w-full rounded bg-border" />
        <div className="mt-2 h-3 w-5/6 rounded bg-border" />
        <div className="mt-5 h-10 w-full rounded bg-border" />
      </div>
    </div>
  );
}

export default function Products() {
  const reduce = useReducedMotion();

  const [activeTab, setActiveTab] = React.useState<Tab>("camisetas");
  const [subFilter, setSubFilter] = React.useState<SubFilter>("todos");

  const [tshirts, setTshirts] = React.useState<TshirtProduct[]>([]);
  const [shopProducts, setShopProducts] = React.useState<ShopProduct[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [tshirtModalOpen, setTshirtModalOpen] = React.useState(false);
  const [selectedTshirt, setSelectedTshirt] = React.useState<TshirtProduct | null>(null);

  const [productModalOpen, setProductModalOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<ShopProduct | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [ts, sp] = await Promise.all([getTshirts(), getShopProducts()]);
        if (!alive) return;
        setTshirts(ts);
        setShopProducts(sp);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filteredShopProducts = React.useMemo(() => {
    if (subFilter === "todos") return shopProducts;
    return shopProducts.filter((p) => p.subcategory === subFilter);
  }, [shopProducts, subFilter]);

  const openTshirtModal = (p: TshirtProduct) => {
    setSelectedTshirt(p);
    setTshirtModalOpen(true);
  };

  const openProductModal = (p: ShopProduct) => {
    setSelectedProduct(p);
    setProductModalOpen(true);
  };

  return (
    <div className="-mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8">
      {/* HERO */}
      <header className="flex min-h-[30vh] items-center justify-center bg-background px-3 py-10 text-center sm:h-[35vh] sm:px-4 sm:py-12 md:h-[40vh] md:px-6 md:py-16 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl md:text-4xl lg:text-5xl"
          >
            PRODUTOS
          </motion.h1>
          <p className="mt-3 px-2 text-sm text-foreground sm:text-base md:mt-4 md:text-lg">
            "Camisetas exclusivas e produtos premium para cabelo e barba"
          </p>
        </div>
      </header>

      {/* TABS PRINCIPAIS */}
      <section className="bg-background px-3 py-8 sm:px-4 sm:py-10 md:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex justify-center">
            <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("camisetas")}
                className={
                  "flex-1 rounded-lg px-4 py-3 text-xs font-extrabold transition-colors duration-300 sm:px-6 sm:py-4 sm:text-sm " +
                  tabClass(activeTab === "camisetas")
                }
              >
                CAMISETAS
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("produtos")}
                className={
                  "flex-1 rounded-lg px-6 py-4 text-sm font-extrabold transition-colors duration-300 " +
                  tabClass(activeTab === "produtos")
                }
              >
                PRODUTOS BARBEARIA
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="bg-background px-4 pb-24 md:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <AnimatePresence mode="wait">
            {activeTab === "camisetas" ? (
              <motion.div
                key="tab-camisetas"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-10 rounded-lg border border-border bg-card p-5 shadow-card">
                  <div className="flex gap-4">
                    <div className="w-1 rounded bg-primary" aria-hidden />
                    <div>
                      <p className="text-sm font-extrabold tracking-[0.16em] text-primary">👕 CAMISETAS EXCLUSIVAS FREESTYLE</p>
                      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                        <li>• Modelos exclusivos da barbearia</li>
                        <li>• Qualidade premium</li>
                        <li>• Venda presencial na barbearia</li>
                      </ul>
                    </div>
                  </div>
                </div>

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
                      {loading
                        ? Array.from({ length: 8 }).map((_, i) => (
                            <CarouselItem key={i} className="pl-2 sm:pl-3 basis-full sm:basis-1/2">
                              <SkeletonCard />
                            </CarouselItem>
                          ))
                        : tshirts.map((p) => (
                            <CarouselItem key={p.id} className="pl-2 sm:pl-3 basis-full sm:basis-1/2">
                              <button
                                type="button"
                                onClick={() => openTshirtModal(p)}
                                className="group overflow-hidden rounded-lg border border-border bg-card text-left shadow-card transition-transform duration-300 hover:-translate-y-1 h-full"
                              >
                                <div className="relative aspect-square overflow-hidden">
                                  <img
                                    src={p.image}
                                    alt={p.name}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    loading="lazy"
                                    decoding="async"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-background/20" aria-hidden />
                                </div>
                                <div className="p-5">
                                  <p className="text-sm font-extrabold text-foreground">{p.name}</p>
                                  <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                                  <p className="mt-4 text-xl font-extrabold text-primary">{formatBRL(p.price)}</p>
                                  <p className="mt-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground">👕 Venda presencial</p>
                                </div>
                              </button>
                            </CarouselItem>
                          ))}
                    </CarouselContent>
                    <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3 sm:gap-4">
                      <CarouselPrevious className="static translate-y-0 h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary hover:bg-primary hover:text-primary-foreground" />
                      <div className="text-xs sm:text-sm font-bold text-foreground">
                        {tshirts.length} camisetas disponíveis
                      </div>
                      <CarouselNext className="static translate-y-0 h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary hover:bg-primary hover:text-primary-foreground" />
                    </div>
                  </Carousel>
                </div>

                {/* GRID - DESKTOP */}
                <div className="hidden md:grid gap-8 md:grid-cols-3 xl:grid-cols-4">
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                    : tshirts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => openTshirtModal(p)}
                          className="group overflow-hidden rounded-lg border border-border bg-card text-left shadow-card transition-transform duration-300 hover:-translate-y-1"
                        >
                          <div className="relative aspect-square overflow-hidden">
                            <img
                              src={p.image}
                              alt={p.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-background/20" aria-hidden />
                          </div>
                          <div className="p-5">
                            <p className="text-sm font-extrabold text-foreground">{p.name}</p>
                            <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                            <p className="mt-4 text-xl font-extrabold text-primary">{formatBRL(p.price)}</p>
                            <p className="mt-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground">👕 Venda presencial</p>
                          </div>
                        </button>
                      ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="tab-produtos"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-10 rounded-lg border border-border bg-card p-5 shadow-card">
                  <div className="flex gap-4">
                    <div className="w-1 rounded bg-brand-green" aria-hidden />
                    <div>
                      <p className="text-sm font-extrabold tracking-[0.16em] text-brand-green">💈 PRODUTOS PARA CABELO E BARBA</p>
                      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                        <li>• Venda APENAS presencial na barbearia</li>
                        <li>• Estoque limitado</li>
                        <li>• Qualidade premium</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* SUB-FILTROS */}
                <div className="mb-10 flex w-full justify-center">
                  <div className="flex gap-3">
                    {(
                      [
                        { key: "todos", label: "TODOS" },
                        { key: "cabelo", label: "CABELO" },
                        { key: "barba", label: "BARBA" },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setSubFilter(t.key)}
                        className={
                          "rounded-lg px-5 py-3 text-xs font-extrabold tracking-[0.16em] transition-colors duration-300 " +
                          subTabClass(subFilter === t.key)
                        }
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

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
                      {loading
                        ? Array.from({ length: 8 }).map((_, i) => (
                            <CarouselItem key={i} className="pl-2 sm:pl-3 basis-full sm:basis-1/2">
                              <SkeletonCard />
                            </CarouselItem>
                          ))
                        : filteredShopProducts.map((p) => {
                            const badge = stockBadge(p.stock);
                            return (
                              <CarouselItem key={p.id} className="pl-2 sm:pl-3 basis-full sm:basis-1/2">
                                <button
                                  type="button"
                                  onClick={() => openProductModal(p)}
                                  className="group relative overflow-hidden rounded-lg border border-border bg-card text-left shadow-card transition-transform duration-300 hover:-translate-y-1 h-full"
                                >
                                  <div className="absolute right-3 top-3 z-10">
                                    <span
                                      className={
                                        "inline-flex items-center rounded-md px-3 py-1 text-xs font-extrabold backdrop-blur-sm " +
                                        badge.className
                                      }
                                    >
                                      {badge.text}
                                    </span>
                                  </div>

                                  <div className="relative aspect-square overflow-hidden">
                                    <img
                                      src={p.image}
                                      alt={p.name}
                                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      loading="lazy"
                                      decoding="async"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-background/20" aria-hidden />
                                  </div>
                                  <div className="p-5">
                                    <p className="text-sm font-extrabold text-foreground">{p.name}</p>
                                    <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                                    <p className="mt-4 text-xl font-extrabold text-brand-green">{formatBRL(p.price)}</p>
                                    <p className="mt-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground">💈 Venda presencial</p>
                                  </div>
                                </button>
                              </CarouselItem>
                            );
                          })}
                    </CarouselContent>
                    <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3 sm:gap-4">
                      <CarouselPrevious className="static translate-y-0 h-10 w-10 sm:h-12 sm:w-12 border-2 border-brand-green hover:bg-brand-green hover:text-background" />
                      <div className="text-xs sm:text-sm font-bold text-foreground">
                        {filteredShopProducts.length} produtos disponíveis
                      </div>
                      <CarouselNext className="static translate-y-0 h-10 w-10 sm:h-12 sm:w-12 border-2 border-brand-green hover:bg-brand-green hover:text-background" />
                    </div>
                  </Carousel>
                </div>

                {/* GRID - DESKTOP */}
                <div className="hidden md:grid gap-8 md:grid-cols-3 xl:grid-cols-4">
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                    : filteredShopProducts.map((p) => {
                        const badge = stockBadge(p.stock);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => openProductModal(p)}
                            className="group relative overflow-hidden rounded-lg border border-border bg-card text-left shadow-card transition-transform duration-300 hover:-translate-y-1"
                          >
                            <div className="absolute right-3 top-3 z-10">
                              <span
                                className={
                                  "inline-flex items-center rounded-md px-3 py-1 text-xs font-extrabold backdrop-blur-sm " +
                                  badge.className
                                }
                              >
                                {badge.text}
                              </span>
                            </div>

                            <div className="relative aspect-square overflow-hidden">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-background/20" aria-hidden />
                            </div>
                            <div className="p-5">
                              <p className="text-sm font-extrabold text-foreground">{p.name}</p>
                              <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                              <p className="mt-4 text-xl font-extrabold text-brand-green">{formatBRL(p.price)}</p>
                              <p className="mt-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground">💈 Venda presencial</p>
                            </div>
                          </button>
                        );
                      })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-background px-4 py-20 md:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl border-t border-border pt-16">
          <div className="grid gap-10 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-8 shadow-card">
              <h3 className="text-xl font-extrabold tracking-tight text-foreground">DÚVIDAS SOBRE ENCOMENDAS?</h3>
              <div className="mt-6">
                <a href={contactLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="block">
                  <Button variant="hero" size="xl" className="w-full">
                    <span className="inline-flex items-center gap-3">
                      <FaWhatsapp className="h-5 w-5" aria-hidden="true" />
                      FALAR NO WHATSAPP
                    </span>
                  </Button>
                </a>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-8 shadow-card">
              <h3 className="text-xl font-extrabold tracking-tight text-foreground">QUER CONHECER OS PRODUTOS?</h3>
              <div className="mt-6">
                <a href={contactLinks.maps} target="_blank" rel="noopener noreferrer" className="block">
                  <Button variant="success" size="xl" className="w-full">
                    <span className="inline-flex items-center gap-3">
                      <FaMapMarkerAlt className="h-5 w-5" aria-hidden="true" />
                      VISITAR BARBEARIA
                    </span>
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL — CAMISETA (VISUALIZAÇÃO) */}
      <Dialog
        open={tshirtModalOpen}
        onOpenChange={(open) => {
          setTshirtModalOpen(open);
          if (!open) setSelectedTshirt(null);
        }}
      >
        <DialogContent className="bg-background">
          {selectedTshirt ? (
            <>
              <DialogHeader>
                <DialogTitle className="tracking-tight">Camiseta</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Disponível apenas para compra presencial na barbearia.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid gap-5">
                <div className="grid gap-4 sm:grid-cols-[140px_1fr] sm:items-start">
                  <img
                    src={selectedTshirt.image}
                    alt={selectedTshirt.name}
                    className="aspect-square w-full rounded-md object-cover"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="text-base font-extrabold text-foreground">{selectedTshirt.name}</p>
                    <p className="mt-2 text-lg font-extrabold text-primary">{formatBRL(selectedTshirt.price)}</p>
                    <p className="mt-3 text-sm text-muted-foreground">{selectedTshirt.description}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-5">
                  <p className="text-sm font-extrabold tracking-[0.12em] text-foreground">👕 COMPRA PRESENCIAL</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Esta camiseta está disponível apenas para compra na barbearia. Visite-nos ou fale com a gente.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <a href={contactLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="hero" className="w-full">
                        <span className="inline-flex items-center gap-2">
                          <FaWhatsapp className="h-5 w-5" aria-hidden="true" />
                          WHATSAPP
                        </span>
                      </Button>
                    </a>
                    <a href={contactLinks.maps} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="outline" className="w-full">
                        <span className="inline-flex items-center gap-2">
                          <FaMapMarkerAlt className="h-5 w-5" aria-hidden="true" />
                          VER NO MAPA
                        </span>
                      </Button>
                    </a>
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={() => setTshirtModalOpen(false)}>
                  FECHAR
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* MODAL — PRODUTO (VISUALIZAÇÃO) */}
      <Dialog
        open={productModalOpen}
        onOpenChange={(open) => {
          setProductModalOpen(open);
          if (!open) setSelectedProduct(null);
        }}
      >
        <DialogContent className="bg-background">
          {selectedProduct ? (
            <>
              <DialogHeader>
                <DialogTitle className="tracking-tight">Produto</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Disponível apenas para compra presencial na barbearia.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid gap-5">
                <div className="grid gap-4 sm:grid-cols-[140px_1fr] sm:items-start">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="aspect-square w-full rounded-md object-cover"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="text-base font-extrabold text-foreground">{selectedProduct.name}</p>
                    <p className="mt-2 text-lg font-extrabold text-brand-green">{formatBRL(selectedProduct.price)}</p>
                    <p className="mt-3 text-sm text-muted-foreground">{selectedProduct.description}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-5">
                  <p className="text-sm font-extrabold tracking-[0.12em] text-foreground">DISPONIBILIDADE:</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {selectedProduct.stock <= 0
                      ? "❌ Produto esgotado"
                      : selectedProduct.stock <= 5
                        ? `⚠️ Últimas unidades — ${selectedProduct.stock} em estoque`
                        : `✅ ${selectedProduct.stock} unidades em estoque`}
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-5">
                  <p className="text-sm font-extrabold tracking-[0.12em] text-foreground">💈 COMPRA PRESENCIAL</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Este produto está disponível apenas para compra na barbearia. Visite-nos ou fale com a gente.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <a href={contactLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="hero" className="w-full">
                        <span className="inline-flex items-center gap-2">
                          <FaWhatsapp className="h-5 w-5" aria-hidden="true" />
                          WHATSAPP
                        </span>
                      </Button>
                    </a>
                    <a href={contactLinks.maps} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="outline" className="w-full">
                        <span className="inline-flex items-center gap-2">
                          <FaMapMarkerAlt className="h-5 w-5" aria-hidden="true" />
                          VER NO MAPA
                        </span>
                      </Button>
                    </a>
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={() => setProductModalOpen(false)}>
                  FECHAR
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
