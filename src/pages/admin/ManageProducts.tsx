import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { z } from "zod";

import SectionHeading from "@/components/common/SectionHeading";
import EmptyState from "@/components/common/EmptyState";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  createShopProduct,
  deleteShopProduct,
  getAllShopProducts,
  updateShopProduct,
  updateShopProductStock,
  getAllTshirts,
  createTshirt,
  updateTshirt,
  deleteTshirt,
  type ShopProduct,
  type TshirtProduct,
} from "@/services/api/productService";
import ShopProductCard from "@/components/admin/products/ShopProductCard";
import { getStockTone } from "@/components/admin/products/StockBadge";
import { cn } from "@/lib/utils";

type AdminTab = "camisetas" | "produtos" | "estoque";

const moneySchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .refine((v) => /^(\d+)([\.,]\d{1,2})?$/.test(v.replace(/\s/g, "")), "Preço inválido");

const productFormSchema = z.object({
  name: z.string().trim().min(3, "Digite um nome válido").max(80),
  description: z.string().trim().min(3, "Digite uma descrição").max(240),
  price: moneySchema,
  stock: z
    .string()
    .trim()
    .min(1)
    .max(6)
    .refine((v) => /^\d+$/.test(v), "Estoque deve ser um número"),
  subcategory: z.enum(["cabelo", "barba"]),
});

const tshirtFormSchema = z.object({
  name: z.string().trim().min(3, "Digite um nome válido").max(80),
  description: z.string().trim().min(3, "Digite uma descrição").max(240),
  price: moneySchema,
});

function parseMoneyToNumber(input: string) {
  const normalized = input.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function ManageProducts() {
  const reduce = useReducedMotion();

  const [activeTab, setActiveTab] = React.useState<AdminTab>("camisetas");
  const [loading, setLoading] = React.useState(true);

  const [products, setProducts] = React.useState<ShopProduct[]>([]);
  const [tshirts, setTshirts] = React.useState<TshirtProduct[]>([]);

  // Modais: produto
  const [addOpen, setAddOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ShopProduct | null>(null);
  const [savingProduct, setSavingProduct] = React.useState(false);

  // Modais: camiseta
  const [addTshirtOpen, setAddTshirtOpen] = React.useState(false);
  const [editTshirtOpen, setEditTshirtOpen] = React.useState(false);
  const [editingTshirt, setEditingTshirt] = React.useState<TshirtProduct | null>(null);
  const [savingTshirt, setSavingTshirt] = React.useState(false);

  // Upload/preview
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);

  // Form state produto
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    subcategory: "cabelo" as "cabelo" | "barba",
  });

  // Form state camiseta
  const [tshirtForm, setTshirtForm] = React.useState({
    name: "",
    description: "",
    price: "",
  });

  // Ajuste de estoque
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [adjusting, setAdjusting] = React.useState<ShopProduct | null>(null);
  const [adjustOperation, setAdjustOperation] = React.useState<"add" | "remove">("add");
  const [adjustQty, setAdjustQty] = React.useState(1);
  const [adjustReason, setAdjustReason] = React.useState("");
  const [savingStock, setSavingStock] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([getAllShopProducts(), getAllTshirts()]);
      setProducts(p);
      setTshirts(t);
    } catch {
      toast({ title: "Erro ao carregar dados", description: "Tente novamente." });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const counters = React.useMemo(
    () => ({
      tshirts: tshirts.filter((t) => t.isActive).length,
      products: products.length,
      lowStock: products.filter((p) => p.isActive && getStockTone(p.stock) !== "ok").length,
    }),
    [products, tshirts],
  );

  const activeProducts = React.useMemo(() => products.filter((p) => p.isActive), [products]);
  const activeTshirts = React.useMemo(() => tshirts.filter((t) => t.isActive), [tshirts]);
  const lowStockProducts = React.useMemo(
    () => activeProducts.filter((p) => p.stock <= 5),
    [activeProducts],
  );

  const resetProductForm = React.useCallback(() => {
    setForm({ name: "", description: "", price: "", stock: "", subcategory: "cabelo" });
    setImagePreview(null);
  }, []);

  const resetTshirtForm = React.useCallback(() => {
    setTshirtForm({ name: "", description: "", price: "" });
    setImagePreview(null);
  }, []);

  const openAdd = () => {
    resetProductForm();
    setAddOpen(true);
  };

  const openEdit = (p: ShopProduct) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price).replace(".", ","),
      stock: String(p.stock),
      subcategory: p.subcategory,
    });
    setImagePreview(p.image);
    setEditOpen(true);
  };

  const openAddTshirt = () => {
    resetTshirtForm();
    setAddTshirtOpen(true);
  };

  const openEditTshirt = (t: TshirtProduct) => {
    setEditingTshirt(t);
    setTshirtForm({
      name: t.name,
      description: t.description,
      price: String(t.price).replace(".", ","),
    });
    setImagePreview(t.image);
    setEditTshirtOpen(true);
  };

  const openAdjust = (p: ShopProduct) => {
    setAdjusting(p);
    setAdjustOperation("add");
    setAdjustQty(1);
    setAdjustReason("");
    setAdjustOpen(true);
  };

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Envie uma imagem (JPG/PNG)." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máximo: 2MB." });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
  };

  const submitProduct = async ({ mode }: { mode: "create" | "update" }) => {
    const parsed = productFormSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Campos inválidos", description: parsed.error.issues[0]?.message ?? "Revise o formulário." });
      return;
    }
    if (!imagePreview) {
      toast({ title: "Imagem obrigatória", description: "Envie uma imagem do produto." });
      return;
    }

    const priceN = parseMoneyToNumber(parsed.data.price);
    if (!Number.isFinite(priceN) || priceN < 0) {
      toast({ title: "Preço inválido", description: "Digite um valor válido." });
      return;
    }

    const stockN = Number(parsed.data.stock);
    if (!Number.isFinite(stockN) || stockN < 0) {
      toast({ title: "Estoque inválido", description: "Digite um estoque válido." });
      return;
    }

    setSavingProduct(true);
    try {
      if (mode === "create") {
        await createShopProduct({
          name: parsed.data.name,
          description: parsed.data.description,
          price: priceN,
          stock: stockN,
          subcategory: parsed.data.subcategory,
          image: imagePreview,
        });
        toast({ title: "Produto adicionado", description: "Produto criado com sucesso." });
        setAddOpen(false);
      } else {
        if (!editing) return;
        await updateShopProduct({
          id: editing.id,
          patch: {
            name: parsed.data.name,
            description: parsed.data.description,
            price: priceN,
            stock: stockN,
            subcategory: parsed.data.subcategory,
            image: imagePreview,
          },
        });
        toast({ title: "Produto atualizado", description: "Alterações salvas." });
        setEditOpen(false);
        setEditing(null);
      }
      resetProductForm();
      await loadData();
    } catch {
      toast({ title: "Erro ao salvar", description: "Tente novamente." });
    } finally {
      setSavingProduct(false);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!editing) return;
    setSavingProduct(true);
    try {
      await deleteShopProduct({ id: editing.id });
      toast({ title: "Produto excluído", description: "Removido do catálogo." });
      setEditOpen(false);
      setEditing(null);
      resetProductForm();
      await loadData();
    } catch {
      toast({ title: "Erro ao excluir", description: "Tente novamente." });
    } finally {
      setSavingProduct(false);
    }
  };

  const newStockValue = React.useMemo(() => {
    if (!adjusting) return 0;
    const qty = Math.max(1, Math.min(999, Math.floor(adjustQty || 1)));
    return adjustOperation === "add" ? adjusting.stock + qty : Math.max(0, adjusting.stock - qty);
  }, [adjusting, adjustOperation, adjustQty]);

  const submitStockAdjustment = async () => {
    if (!adjusting) return;
    const qty = Math.max(1, Math.min(999, Math.floor(adjustQty || 1)));
    setSavingStock(true);
    try {
      await updateShopProductStock({
        id: adjusting.id,
        newStock: newStockValue,
        operation: adjustOperation,
        quantity: qty,
        reason: adjustReason,
      });
      toast({ title: "Estoque atualizado", description: "Ajuste realizado com sucesso." });
      setAdjustOpen(false);
      setAdjusting(null);
      await loadData();
    } catch {
      toast({ title: "Erro ao ajustar estoque", description: "Tente novamente." });
    } finally {
      setSavingStock(false);
    }
  };

  const submitTshirt = async ({ mode }: { mode: "create" | "update" }) => {
    const parsed = tshirtFormSchema.safeParse(tshirtForm);
    if (!parsed.success) {
      toast({ title: "Campos inválidos", description: parsed.error.issues[0]?.message ?? "Revise o formulário." });
      return;
    }
    if (!imagePreview) {
      toast({ title: "Imagem obrigatória", description: "Envie uma imagem da camiseta." });
      return;
    }

    const priceN = parseMoneyToNumber(parsed.data.price);
    if (!Number.isFinite(priceN) || priceN < 0) {
      toast({ title: "Preço inválido", description: "Digite um valor válido." });
      return;
    }

    setSavingTshirt(true);
    try {
      if (mode === "create") {
        await createTshirt({
          name: parsed.data.name,
          description: parsed.data.description,
          price: priceN,
          image: imagePreview,
        });
        toast({ title: "Camiseta adicionada", description: "Camiseta criada com sucesso." });
        setAddTshirtOpen(false);
      } else {
        if (!editingTshirt) return;
        await updateTshirt({
          id: editingTshirt.id,
          patch: {
            name: parsed.data.name,
            description: parsed.data.description,
            price: priceN,
            image: imagePreview,
          },
        });
        toast({ title: "Camiseta atualizada", description: "Alterações salvas." });
        setEditTshirtOpen(false);
        setEditingTshirt(null);
      }
      resetTshirtForm();
      await loadData();
    } catch {
      toast({ title: "Erro ao salvar", description: "Tente novamente." });
    } finally {
      setSavingTshirt(false);
    }
  };

  const confirmDeleteTshirt = async () => {
    if (!editingTshirt) return;
    setSavingTshirt(true);
    try {
      await deleteTshirt({ id: editingTshirt.id });
      toast({ title: "Camiseta excluída", description: "Removida do catálogo." });
      setEditTshirtOpen(false);
      setEditingTshirt(null);
      resetTshirtForm();
      await loadData();
    } catch {
      toast({ title: "Erro ao excluir", description: "Tente novamente." });
    } finally {
      setSavingTshirt(false);
    }
  };

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8">
      {/* HERO */}
      <header className="bg-background px-4 py-12 sm:py-16 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl md:text-5xl"
          >
            📦 PRODUTOS
          </motion.h1>
          <p className="mt-4 text-sm text-foreground sm:text-base md:text-lg">Camisetas e produtos da barbearia</p>
        </div>
      </header>

      {/* TABS */}
      <section className="bg-background px-4 py-6 sm:py-10 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex justify-center">
            <div className="flex w-full max-w-4xl gap-2 sm:gap-3">
              {(
                [
                  { key: "camisetas", label: "CAMISETAS", shortLabel: "CAMISETAS", count: counters.tshirts },
                  { key: "produtos", label: "PRODUTOS BARBEARIA", shortLabel: "PRODUTOS", count: counters.products },
                  { key: "estoque", label: "ESTOQUE BAIXO", shortLabel: "ESTOQUE", count: counters.lowStock },
                ] as const
              ).map((t) => {
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    className={cn(
                      "flex-1 rounded-lg border px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-center sm:text-left text-xs font-extrabold uppercase tracking-[0.12em] sm:tracking-[0.16em] transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary hover:text-primary",
                    )}
                  >
                    <div className="flex flex-col items-center justify-center gap-1 sm:flex-row sm:justify-between sm:gap-3">
                      <span className="hidden sm:inline truncate text-[10px] sm:text-xs">{t.label}</span>
                      <span className="sm:hidden truncate text-[9px]">{t.shortLabel}</span>
                      <span
                        className={cn(
                          "inline-flex min-w-7 sm:min-w-10 items-center justify-center rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px]",
                          active ? "bg-primary-foreground text-primary" : "bg-card text-foreground",
                        )}
                      >
                        {t.count}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="bg-background px-4 pb-24 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AnimatePresence mode="wait">
            {activeTab === "camisetas" ? (
              <motion.div
                key="tab-camisetas"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-8 flex items-center justify-between gap-4">
                  <SectionHeading kicker="ADMIN" title="Camisetas" description="Editar nome, foto e preço das camisetas." />
                  <Button variant="hero" size="lg" onClick={openAddTshirt}>
                    + Adicionar camiseta
                  </Button>
                </div>

                {loading ? (
                  <div className="rounded-lg border border-border bg-card p-8 text-center shadow-card">
                    <LoadingSpinner text="Carregando..." size="md" />
                  </div>
                ) : activeTshirts.length === 0 ? (
                  <EmptyState
                    icon="👕"
                    title="Nenhuma camiseta cadastrada"
                    description='Clique em "Adicionar camiseta" para começar.'
                  />
                ) : (
                  <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {activeTshirts.map((t) => (
                      <div
                        key={t.id}
                        className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                      >
                        {/* Imagem com aspect ratio fixo */}
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                          <img
                            src={t.image}
                            alt={t.name}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                        {/* Conteúdo do card */}
                        <div className="flex flex-1 flex-col p-4">
                          <h3 className="line-clamp-1 text-sm font-bold text-foreground">{t.name}</h3>
                          <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs text-muted-foreground">
                            {t.description}
                          </p>
                          <p className="mt-3 text-lg font-extrabold text-primary">{formatBRL(t.price)}</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-auto w-full text-xs" 
                            onClick={() => openEditTshirt(t)}
                          >
                            ✏️ Editar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : activeTab === "produtos" ? (
              <motion.div
                key="tab-produtos"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-8 flex items-center justify-between gap-4">
                  <SectionHeading kicker="ADMIN" title="Produtos da barbearia" description="CRUD + estoque (venda presencial)." />
                  <Button variant="hero" size="lg" onClick={openAdd}>
                    + Adicionar produto
                  </Button>
                </div>

                {loading ? (
                  <div className="rounded-lg border border-border bg-card p-8 text-center shadow-card">
                    <LoadingSpinner text="Carregando..." size="md" />
                  </div>
                ) : activeProducts.length === 0 ? (
                  <EmptyState
                    icon="📦"
                    title="Nenhum produto cadastrado"
                    description="Clique em “Adicionar produto” para começar."
                  />
                ) : (
                  <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {activeProducts.map((p) => (
                      <ShopProductCard key={p.id} product={p} onEdit={openEdit} onAdjustStock={openAdjust} />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="tab-estoque"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-8 rounded-lg border border-border bg-card p-8 shadow-card">
                  <p className="text-2xl font-extrabold text-destructive">⚠️ PRODUTOS COM ESTOQUE BAIXO</p>
                  <p className="mt-3 text-sm text-muted-foreground">Produtos com 5 ou menos unidades.</p>
                </div>

                {loading ? (
                  <div className="rounded-lg border border-border bg-card p-8 text-center shadow-card">
                    <LoadingSpinner text="Carregando..." size="md" />
                  </div>
                ) : lowStockProducts.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card p-10 text-center shadow-card">
                    <p className="text-xl font-extrabold text-brand-green">✅ Todos os estoques estão OK!</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {lowStockProducts.map((p) => (
                      <div 
                        key={p.id} 
                        className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-md"
                      >
                        {/* Imagem */}
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="text-sm font-bold text-destructive">⚠️ {p.stock} un.</span>
                            <span className="text-sm font-semibold text-primary">{formatBRL(p.price)}</span>
                          </div>
                        </div>
                        
                        {/* Botão */}
                        <Button 
                          variant="hero" 
                          size="sm" 
                          className="flex-shrink-0"
                          onClick={() => openAdjust(p)}
                        >
                          📊 Ajustar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* INPUT FILE (hidden) */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      {/* MODAL: ADICIONAR */}
      <Dialog open={addOpen} onOpenChange={(v) => (v ? setAddOpen(true) : (setAddOpen(false), resetProductForm()))}>
        <DialogContent className="w-[95vw] sm:w-full border border-border bg-card text-foreground p-4 sm:p-6 sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-primary">➕ ADICIONAR PRODUTO</DialogTitle>
            <DialogDescription className="text-muted-foreground">Todos os campos com * são obrigatórios.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📷 IMAGEM DO PRODUTO *</p>
              <button
                type="button"
                onClick={handlePickImage}
                className="mt-3 flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background p-6 text-sm text-muted-foreground hover:border-primary"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-40 w-full rounded-md object-cover" />
                ) : (
                  <span>Clique para enviar (JPG/PNG até 2MB)</span>
                )}
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📝 NOME *</p>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Ex: Pomada Modeladora Premium"
                />
              </div>
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📄 DESCRIÇÃO *</p>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Ex: Fixação forte, efeito matte"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">💰 PREÇO *</p>
                  <Input
                    value={form.price}
                    onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                    placeholder="45,00"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📦 ESTOQUE INICIAL *</p>
                  <Input
                    value={form.stock}
                    onChange={(e) => setForm((s) => ({ ...s, stock: e.target.value.replace(/\D/g, "") }))}
                    placeholder="10"
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">🏷️ CATEGORIA *</p>
                <Select value={form.subcategory} onValueChange={(v) => setForm((s) => ({ ...s, subcategory: v as any }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cabelo">Cabelo</SelectItem>
                    <SelectItem value="barba">Barba</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => (setAddOpen(false), resetProductForm())}>
              Cancelar
            </Button>
            <Button variant="hero" disabled={savingProduct} onClick={() => void submitProduct({ mode: "create" })}>
              {savingProduct ? "Salvando…" : "Adicionar produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDITAR */}
      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          if (v) setEditOpen(true);
          else {
            setEditOpen(false);
            setEditing(null);
            resetProductForm();
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:w-full border border-border bg-card text-foreground p-4 sm:p-6 sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-primary">✏️ EDITAR PRODUTO</DialogTitle>
            <DialogDescription className="text-muted-foreground">Atualize os dados e salve.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📷 IMAGEM DO PRODUTO *</p>
              <button
                type="button"
                onClick={handlePickImage}
                className="mt-3 flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background p-6 text-sm text-muted-foreground hover:border-primary"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-40 w-full rounded-md object-cover" />
                ) : (
                  <span>Clique para enviar (JPG/PNG até 2MB)</span>
                )}
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📝 NOME *</p>
                <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
              </div>
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📄 DESCRIÇÃO *</p>
                <Textarea value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">💰 PREÇO *</p>
                  <Input value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} />
                </div>
                <div>
                  <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📦 ESTOQUE *</p>
                  <Input
                    value={form.stock}
                    onChange={(e) => setForm((s) => ({ ...s, stock: e.target.value.replace(/\D/g, "") }))}
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">🏷️ CATEGORIA *</p>
                <Select value={form.subcategory} onValueChange={(v) => setForm((s) => ({ ...s, subcategory: v as any }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cabelo">Cabelo</SelectItem>
                    <SelectItem value="barba">Barba</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button variant="danger" disabled={savingProduct} onClick={() => void confirmDeleteProduct()}>
              🗑️ Excluir
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => (setEditOpen(false), setEditing(null), resetProductForm())}>
                Cancelar
              </Button>
              <Button variant="hero" disabled={savingProduct} onClick={() => void submitProduct({ mode: "update" })}>
                {savingProduct ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: AJUSTAR ESTOQUE */}
      <Dialog open={adjustOpen} onOpenChange={(v) => (v ? setAdjustOpen(true) : (setAdjustOpen(false), setAdjusting(null)))}>
        <DialogContent className="border border-border bg-card text-foreground sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-brand-green">📊 AJUSTAR ESTOQUE</DialogTitle>
            <DialogDescription className="text-muted-foreground">Ajuste rápido com cálculo automático.</DialogDescription>
          </DialogHeader>

          {adjusting ? (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">PRODUTO</p>
                <p className="mt-2 text-base font-extrabold text-foreground">{adjusting.name}</p>
              </div>

              <div className="rounded-lg border border-border bg-background p-5">
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">ESTOQUE ATUAL</p>
                <p className="mt-2 text-2xl font-extrabold text-primary">{adjusting.stock} unidades</p>
              </div>

              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">OPERAÇÃO</p>
                <Tabs value={adjustOperation} onValueChange={(v) => setAdjustOperation(v as any)}>
                  <TabsList className="mt-3">
                    <TabsTrigger value="add">Adicionar</TabsTrigger>
                    <TabsTrigger value="remove">Remover</TabsTrigger>
                  </TabsList>
                  <TabsContent value="add" />
                  <TabsContent value="remove" />
                </Tabs>
              </div>

              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">QUANTIDADE</p>
                <div className="mt-3 flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => setAdjustQty((q) => Math.max(1, q - 1))}>
                    -
                  </Button>
                  <Input
                    value={String(adjustQty)}
                    onChange={(e) => setAdjustQty(Number(e.target.value.replace(/\D/g, "")) || 1)}
                    inputMode="numeric"
                    className="text-center"
                  />
                  <Button variant="outline" size="icon" onClick={() => setAdjustQty((q) => Math.min(999, q + 1))}>
                    +
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-5">
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">NOVO ESTOQUE</p>
                <p className="mt-2 text-2xl font-extrabold text-brand-green">{newStockValue} unidades</p>
              </div>

              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">MOTIVO (opcional)</p>
                <Textarea value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Ex: compra nova, venda, avaria" />
              </div>
            </div>
          ) : null}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => (setAdjustOpen(false), setAdjusting(null))}>
              Cancelar
            </Button>
            <Button variant="success" disabled={savingStock} onClick={() => void submitStockAdjustment()}>
              {savingStock ? "Salvando…" : "Confirmar ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ADICIONAR CAMISETA */}
      <Dialog open={addTshirtOpen} onOpenChange={(v) => (v ? setAddTshirtOpen(true) : (setAddTshirtOpen(false), resetTshirtForm()))}>
        <DialogContent className="border border-border bg-card text-foreground sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary">👕 ADICIONAR CAMISETA</DialogTitle>
            <DialogDescription className="text-muted-foreground">Todos os campos com * são obrigatórios.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📷 IMAGEM DA CAMISETA *</p>
              <button
                type="button"
                onClick={handlePickImage}
                className="mt-3 flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background p-6 text-sm text-muted-foreground hover:border-primary"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-40 w-full rounded-md object-cover" />
                ) : (
                  <span>Clique para enviar (JPG/PNG até 2MB)</span>
                )}
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📝 NOME *</p>
                <Input
                  value={tshirtForm.name}
                  onChange={(e) => setTshirtForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Ex: Camiseta Preta Logo Freestyle"
                />
              </div>
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📄 DESCRIÇÃO *</p>
                <Textarea
                  value={tshirtForm.description}
                  onChange={(e) => setTshirtForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Ex: 100% algodão, confortável"
                />
              </div>
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">💰 PREÇO *</p>
                <Input
                  value={tshirtForm.price}
                  onChange={(e) => setTshirtForm((s) => ({ ...s, price: e.target.value }))}
                  placeholder="89,90"
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => (setAddTshirtOpen(false), resetTshirtForm())}>
              Cancelar
            </Button>
            <Button variant="hero" disabled={savingTshirt} onClick={() => void submitTshirt({ mode: "create" })}>
              {savingTshirt ? "Salvando…" : "Adicionar camiseta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDITAR CAMISETA */}
      <Dialog
        open={editTshirtOpen}
        onOpenChange={(v) => {
          if (v) setEditTshirtOpen(true);
          else {
            setEditTshirtOpen(false);
            setEditingTshirt(null);
            resetTshirtForm();
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:w-full border border-border bg-card text-foreground p-4 sm:p-6 sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-primary">✏️ EDITAR CAMISETA</DialogTitle>
            <DialogDescription className="text-muted-foreground">Atualize os dados e salve.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📷 IMAGEM DA CAMISETA *</p>
              <button
                type="button"
                onClick={handlePickImage}
                className="mt-3 flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background p-6 text-sm text-muted-foreground hover:border-primary"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-40 w-full rounded-md object-cover" />
                ) : (
                  <span>Clique para enviar (JPG/PNG até 2MB)</span>
                )}
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📝 NOME *</p>
                <Input value={tshirtForm.name} onChange={(e) => setTshirtForm((s) => ({ ...s, name: e.target.value }))} />
              </div>
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">📄 DESCRIÇÃO *</p>
                <Textarea value={tshirtForm.description} onChange={(e) => setTshirtForm((s) => ({ ...s, description: e.target.value }))} />
              </div>
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">💰 PREÇO *</p>
                <Input value={tshirtForm.price} onChange={(e) => setTshirtForm((s) => ({ ...s, price: e.target.value }))} />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button variant="danger" disabled={savingTshirt} onClick={() => void confirmDeleteTshirt()}>
              🗑️ Excluir
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => (setEditTshirtOpen(false), setEditingTshirt(null), resetTshirtForm())}>
                Cancelar
              </Button>
              <Button variant="hero" disabled={savingTshirt} onClick={() => void submitTshirt({ mode: "update" })}>
                {savingTshirt ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

