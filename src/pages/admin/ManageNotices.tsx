import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SectionHeading from "@/components/common/SectionHeading";
import EmptyState from "@/components/common/EmptyState";
import SkeletonCard from "@/components/common/SkeletonCard";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AnnouncementStatusBadge from "@/components/admin/notices/AnnouncementStatusBadge";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAllAnnouncements,
  toggleAnnouncementStatus,
  updateAnnouncement,
  type Announcement,
  type AnnouncementIcon,
} from "@/services/api/announcementService";

type TabKey = "ativos" | "inativos" | "todos";

const availableIcons: AnnouncementIcon[] = ["⚠️", "📢", "🎉", "ℹ️", "🚫", "✅"];

const iconEnum = z.enum(["⚠️", "📢", "🎉", "ℹ️", "🚫", "✅"] as const);

const formSchema = z.object({
  icon: iconEnum,
  title: z.string().trim().min(1, "Título é obrigatório").max(100, "Título deve ter no máximo 100 caracteres"),
  content: z.string().trim().max(500, "Conteúdo deve ter no máximo 500 caracteres"),
  imageUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  isActive: z.boolean(),
});

type AnnouncementForm = {
  icon: AnnouncementIcon;
  title: string;
  content: string;
  imageUrl: string;
  isActive: boolean;
};

function formatDateTimeBR(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function counterTone(current: number, limit: number) {
  if (current > limit) return "text-destructive";
  if (current > limit * 0.8) return "text-primary";
  return "text-muted-foreground";
}

function IconPicker({ value, onChange }: { value: AnnouncementIcon; onChange: (v: AnnouncementIcon) => void }) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
      {availableIcons.map((ic) => {
        const active = value === ic;
        return (
          <button
            key={ic}
            type="button"
            onClick={() => onChange(ic)}
            className={cn(
              "flex h-14 items-center justify-center rounded-md border-2 bg-background text-2xl transition-transform",
              active ? "border-primary bg-accent" : "border-transparent hover:bg-accent",
            )}
            aria-label={`Selecionar ícone ${ic}`}
          >
            {ic}
          </button>
        );
      })}
    </div>
  );
}

function NoticeCard({
  a,
  onEdit,
  onToggle,
  onDelete,
}: {
  a: Announcement;
  onEdit: (a: Announcement) => void;
  onToggle: (a: Announcement) => void;
  onDelete: (a: Announcement) => void;
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "relative rounded-lg border border-border bg-card p-8 shadow-card transition-shadow",
        a.isActive ? "" : "opacity-70",
      )}
      style={{ borderLeftWidth: 4, borderLeftColor: a.isActive ? "hsl(var(--primary))" : "hsl(var(--border))" }}
    >
      <div className="absolute right-4 top-4">
        <AnnouncementStatusBadge isActive={a.isActive} />
      </div>

      <h3 className="flex items-center gap-3 text-2xl font-extrabold text-primary">
        <span className="text-4xl" aria-hidden>
          {a.icon}
        </span>
        <span className="text-foreground">{a.title}</span>
      </h3>

      <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-foreground">{a.content}</p>

      {/* Imagem do aviso */}
      {a.imageUrl ? (
        <div className="mt-4 overflow-hidden rounded-lg">
          <img
            src={a.imageUrl}
            alt={a.title}
            className="h-auto max-h-64 w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-xs text-muted-foreground">📅 Criado em: {formatDateTimeBR(a.createdAt)}</p>
        <p className="mt-1 text-xs text-muted-foreground">👤 Por: {a.createdBy || "Admin"}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => onEdit(a)}>
          ✏️ Editar
        </Button>
        <Button variant="danger" onClick={() => onToggle(a)}>
          {a.isActive ? "🔴 Desativar" : "✅ Reativar"}
        </Button>
        <Button variant="secondary" onClick={() => onDelete(a)}>
          🗑️ Excluir
        </Button>
      </div>
    </motion.article>
  );
}

export default function ManageNotices() {
  const reduce = useReducedMotion();

  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<TabKey>("ativos");
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [toggleOpen, setToggleOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const [working, setWorking] = React.useState(false);
  const [selected, setSelected] = React.useState<Announcement | null>(null);
  const [toggleAction, setToggleAction] = React.useState<"deactivate" | "reactivate">("deactivate");
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");

  const [form, setForm] = React.useState({
    icon: "⚠️" as AnnouncementIcon,
    title: "",
    content: "",
    imageUrl: "",
    isActive: true,
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllAnnouncements();
      setAnnouncements(list);
    } catch {
      toast({ title: "Erro ao carregar avisos", description: "Tente novamente." });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const counters = React.useMemo(
    () => ({
      ativos: announcements.filter((a) => a.isActive).length,
      inativos: announcements.filter((a) => !a.isActive).length,
      todos: announcements.length,
    }),
    [announcements],
  );

  const filtered = React.useMemo(() => {
    if (tab === "ativos") return announcements.filter((a) => a.isActive);
    if (tab === "inativos") return announcements.filter((a) => !a.isActive);
    return announcements;
  }, [announcements, tab]);

  const titleLen = form.title.length;
  const contentLen = form.content.length;

  const resetForm = () => {
    setForm({ icon: "⚠️", title: "", content: "", imageUrl: "", isActive: true });
  };

  const openCreate = () => {
    resetForm();
    setSelected(null);
    setCreateOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setSelected(a);
    setForm({ icon: a.icon, title: a.title, content: a.content, imageUrl: a.imageUrl || "", isActive: a.isActive });
    setEditOpen(true);
  };

  const submitCreate = async () => {
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Campos inválidos", description: parsed.error.issues[0]?.message ?? "Revise o formulário." });
      return;
    }
    const data = parsed.data as unknown as AnnouncementForm;
    setWorking(true);
    try {
      await createAnnouncement({ ...data, createdBy: "Admin" });
      toast({ title: "Aviso publicado", description: "Publicado com sucesso." });
      setCreateOpen(false);
      resetForm();
      await load();
    } catch {
      toast({ title: "Erro ao criar aviso", description: "Tente novamente." });
    } finally {
      setWorking(false);
    }
  };

  const submitEdit = async () => {
    if (!selected) return;
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Campos inválidos", description: parsed.error.issues[0]?.message ?? "Revise o formulário." });
      return;
    }
    const data = parsed.data as unknown as AnnouncementForm;
    setWorking(true);
    try {
      await updateAnnouncement({ id: selected.id, patch: data });
      toast({ title: "Aviso atualizado", description: "Alterações salvas." });
      setEditOpen(false);
      setSelected(null);
      resetForm();
      await load();
    } catch {
      toast({ title: "Erro ao atualizar aviso", description: "Tente novamente." });
    } finally {
      setWorking(false);
    }
  };

  const openToggle = (a: Announcement) => {
    setSelected(a);
    setToggleAction(a.isActive ? "deactivate" : "reactivate");
    setToggleOpen(true);
  };

  const confirmToggle = async () => {
    if (!selected) return;
    setWorking(true);
    try {
      await toggleAnnouncementStatus({ id: selected.id, isActive: toggleAction === "reactivate" });
      toast({
        title: toggleAction === "reactivate" ? "Aviso reativado" : "Aviso desativado",
        description: "Status atualizado.",
      });
      setToggleOpen(false);
      setSelected(null);
      await load();
    } catch {
      toast({ title: "Erro", description: "Não foi possível alterar o status." });
    } finally {
      setWorking(false);
    }
  };

  const openDelete = (a: Announcement) => {
    setSelected(a);
    setDeleteConfirmation("");
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selected) return;
    if (deleteConfirmation !== "EXCLUIR") {
      toast({ title: 'Digite "EXCLUIR" para confirmar', description: "Confirmação obrigatória." });
      return;
    }
    setWorking(true);
    try {
      await deleteAnnouncement({ id: selected.id });
      toast({ title: "Aviso excluído", description: "Excluído permanentemente." });
      setDeleteOpen(false);
      setSelected(null);
      await load();
    } catch {
      toast({ title: "Erro ao excluir", description: "Tente novamente." });
    } finally {
      setWorking(false);
    }
  };

  const tabButtonClass = (active: boolean) =>
    cn(
      "flex-1 rounded-lg border px-2 sm:px-4 md:px-6 py-3 sm:py-4 text-center sm:text-left text-xs font-extrabold uppercase tracking-[0.16em] transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-background text-foreground hover:border-primary hover:text-primary",
    );

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8">
      {/* HERO */}
      <header className="bg-background px-4 py-12 sm:py-16 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:gap-6">
            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl md:text-5xl"
            >
              📢 AVISOS
            </motion.h1>
            <p className="text-sm text-foreground sm:text-base md:text-lg">Criar e publicar avisos importantes</p>
            <Button variant="hero" size="lg" onClick={openCreate} className="w-full sm:w-auto sm:self-start">
              + Criar novo aviso
            </Button>
          </div>
        </div>
      </header>

      {/* TABS */}
      <section className="bg-background px-4 py-6 sm:py-10 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex justify-center">
            <div className="flex w-full max-w-4xl gap-2 sm:gap-3">
              {(
                [
                  { key: "ativos", label: "ATIVOS", count: counters.ativos },
                  { key: "inativos", label: "INATIVOS", count: counters.inativos },
                  { key: "todos", label: "TODOS", count: counters.todos },
                ] as const
              ).map((t) => {
                const active = tab === t.key;
                return (
                  <button key={t.key} type="button" onClick={() => setTab(t.key)} className={tabButtonClass(active)}>
                    <div className="flex flex-col items-center justify-center gap-1 sm:flex-row sm:justify-between sm:gap-3">
                      <span className="text-[10px] sm:text-xs">{t.label}</span>
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

      {/* LISTA */}
      <section className="bg-background px-4 pb-24 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading kicker="ADMIN" title="Avisos" description="Ativos aparecem para todos os clientes." />

          <div className="mt-8 space-y-6">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon="📢"
                title={`Nenhum aviso ${tab === "ativos" ? "ativo" : "encontrado"}`}
                description={tab === "ativos" ? "Crie um aviso para informar os clientes." : "Ajuste a aba para ver outros avisos."}
                actionLabel={tab === "ativos" ? "+ Criar primeiro aviso" : undefined}
                onAction={tab === "ativos" ? openCreate : undefined}
              />
            ) : (
              <AnimatePresence mode="popLayout">
                {filtered.map((a) => (
                  <NoticeCard key={a.id} a={a} onEdit={openEdit} onToggle={openToggle} onDelete={openDelete} />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </section>

      {/* MODAL: CRIAR */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          if (v) setCreateOpen(true);
          else {
            setCreateOpen(false);
            setPreviewOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] w-[95vw] sm:w-full overflow-y-auto border border-border bg-card text-foreground p-4 sm:p-6 sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-primary">📢 CRIAR NOVO AVISO</DialogTitle>
            <DialogDescription className="text-muted-foreground">Preencha os dados e publique.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <p className="text-xs font-extrabold tracking-[0.16em] text-primary">😊 ÍCONE DO AVISO *</p>
              <IconPicker value={form.icon} onChange={(v) => setForm((s) => ({ ...s, icon: v }))} />
            </div>

            <div>
              <div className="flex items-end justify-between gap-4">
                <p className="text-xs font-extrabold tracking-[0.16em] text-foreground">📝 TÍTULO DO AVISO *</p>
                <span className={cn("text-xs", counterTone(titleLen, 100))}>{titleLen}/100</span>
              </div>
              <Input
                className="mt-3"
                value={form.title}
                onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                placeholder="Ex: Fechado no dia 15/02"
                maxLength={120}
              />
            </div>

            <div>
              <div className="flex items-end justify-between gap-4">
                <p className="text-xs font-extrabold tracking-[0.16em] text-foreground">📄 CONTEÚDO DO AVISO</p>
                <span className={cn("text-xs", counterTone(contentLen, 500))}>{contentLen}/500</span>
              </div>
              <Textarea
                className="mt-3"
                rows={5}
                value={form.content}
                onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
                placeholder="Escreva os detalhes do aviso (opcional se tiver imagem)..."
              />
            </div>

            <div>
              <p className="text-xs font-extrabold tracking-[0.16em] text-foreground">🖼️ IMAGEM (OPCIONAL)</p>
              <input
                type="file"
                accept="image/*"
                className="mt-3 block w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    toast({ title: "Imagem muito grande", description: "Máximo 2MB" });
                    e.target.value = "";
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    setForm((s) => ({ ...s, imageUrl: reader.result as string }));
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                📷 Formatos aceitos: JPG, PNG, GIF (máx. 2MB)
              </p>
              {form.imageUrl && (
                <div className="mt-3 space-y-2">
                  <div className="mx-auto max-w-xs overflow-hidden rounded-lg border border-border bg-black/30">
                    <img
                      src={form.imageUrl}
                      alt="Preview"
                      className="mx-auto h-auto max-h-32 object-contain"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((s) => ({ ...s, imageUrl: "" }))}
                  >
                    🗑️ Remover imagem
                  </Button>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-extrabold tracking-[0.16em] text-foreground">🔔 STATUS INICIAL</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, isActive: true }))}
                  className={cn(
                    "rounded-lg border px-5 py-3 text-xs font-extrabold uppercase tracking-[0.16em]",
                    form.isActive ? "border-brand-green bg-brand-green text-background" : "border-border bg-background text-foreground",
                  )}
                >
                  ✓ ATIVO
                </button>
                <button
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, isActive: false }))}
                  className={cn(
                    "rounded-lg border px-5 py-3 text-xs font-extrabold uppercase tracking-[0.16em]",
                    !form.isActive ? "border-muted bg-muted text-foreground" : "border-border bg-background text-foreground",
                  )}
                >
                  INATIVO
                </button>
              </div>
              <p className="mt-2 text-sm italic text-muted-foreground">ℹ️ Avisos ativos aparecem no site para todos os clientes.</p>
            </div>
          </div>

          <DialogFooter className="mt-2 gap-3 sm:gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              👁️ Preview
            </Button>
            <div className="flex gap-3 sm:ml-auto">
              <Button variant="outline" onClick={() => (setCreateOpen(false), resetForm())}>
                Cancelar
              </Button>
              <Button variant="hero" disabled={working} onClick={() => void submitCreate()}>
                {working ? "Publicando…" : "Publicar aviso"}
              </Button>
            </div>
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
            setPreviewOpen(false);
            setSelected(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:w-full border border-border bg-card text-foreground p-4 sm:p-6 sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-primary">✏️ EDITAR AVISO</DialogTitle>
            <DialogDescription className="text-muted-foreground">Atualize os dados e salve.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-extrabold tracking-[0.16em] text-primary">😊 ÍCONE DO AVISO *</p>
              <IconPicker value={form.icon} onChange={(v) => setForm((s) => ({ ...s, icon: v }))} />
            </div>

            <div>
              <div className="flex items-end justify-between gap-4">
                <p className="text-xs font-extrabold tracking-[0.16em] text-foreground">📝 TÍTULO DO AVISO *</p>
                <span className={cn("text-xs", counterTone(titleLen, 100))}>{titleLen}/100</span>
              </div>
              <Input className="mt-3" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
            </div>

            <div>
              <div className="flex items-end justify-between gap-4">
                <p className="text-xs font-extrabold tracking-[0.16em] text-foreground">📄 CONTEÚDO DO AVISO</p>
                <span className={cn("text-xs", counterTone(contentLen, 500))}>{contentLen}/500</span>
              </div>
              <Textarea
                className="mt-3"
                rows={5}
                value={form.content}
                onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
              />
            </div>

            <div>
              <p className="text-xs font-extrabold tracking-[0.16em] text-foreground">🖼️ IMAGEM (OPCIONAL)</p>
              <input
                type="file"
                accept="image/*"
                className="mt-3 block w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    toast({ title: "Imagem muito grande", description: "Máximo 2MB" });
                    e.target.value = "";
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    setForm((s) => ({ ...s, imageUrl: reader.result as string }));
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                📷 Formatos aceitos: JPG, PNG, GIF (máx. 2MB)
              </p>
              {form.imageUrl && (
                <div className="mt-3 space-y-2">
                  <div className="mx-auto max-w-xs overflow-hidden rounded-lg border border-border bg-black/30">
                    <img
                      src={form.imageUrl}
                      alt="Preview"
                      className="mx-auto h-auto max-h-32 object-contain"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((s) => ({ ...s, imageUrl: "" }))}
                  >
                    🗑️ Remover imagem
                  </Button>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-extrabold tracking-[0.16em] text-foreground">🔔 STATUS</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, isActive: true }))}
                  className={cn(
                    "rounded-lg border px-5 py-3 text-xs font-extrabold uppercase tracking-[0.16em]",
                    form.isActive ? "border-brand-green bg-brand-green text-background" : "border-border bg-background text-foreground",
                  )}
                >
                  ✓ ATIVO
                </button>
                <button
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, isActive: false }))}
                  className={cn(
                    "rounded-lg border px-5 py-3 text-xs font-extrabold uppercase tracking-[0.16em]",
                    !form.isActive ? "border-muted bg-muted text-foreground" : "border-border bg-background text-foreground",
                  )}
                >
                  INATIVO
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2 gap-3 sm:gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              👁️ Preview
            </Button>
            <Button variant="danger" onClick={() => (selected ? openDelete(selected) : null)}>
              🗑️ Excluir
            </Button>
            <div className="flex gap-3 sm:ml-auto">
              <Button variant="outline" onClick={() => (setEditOpen(false), setSelected(null), resetForm())}>
                Cancelar
              </Button>
              <Button variant="hero" disabled={working} onClick={() => void submitEdit()}>
                {working ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: PREVIEW */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-[95vw] sm:w-full border border-border bg-card text-foreground p-4 sm:p-6 sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-primary">👁️ PRÉVIA</DialogTitle>
            <DialogDescription className="text-muted-foreground">Como aparecerá no site.</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-background p-6">
            <p className="text-xl font-extrabold text-foreground">
              <span className="mr-2" aria-hidden>
                {form.icon}
              </span>
              {form.title.trim() || "(sem título)"}
            </p>
            {form.content.trim() && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {form.content.trim()}
              </p>
            )}
            {form.imageUrl && (
              <div className="mt-4 overflow-hidden rounded-lg">
                <img
                  src={form.imageUrl}
                  alt="Imagem do aviso"
                  className="h-auto max-h-64 w-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: TOGGLE */}
      <Dialog
        open={toggleOpen}
        onOpenChange={(v) => {
          if (v) setToggleOpen(true);
          else {
            setToggleOpen(false);
            setSelected(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:w-full border border-border bg-card text-foreground p-4 sm:p-6 sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className={cn("text-xl sm:text-2xl font-extrabold", toggleAction === "reactivate" ? "text-brand-green" : "text-destructive")}>
              {toggleAction === "reactivate" ? "✅ REATIVAR AVISO" : "🔴 DESATIVAR AVISO"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">Confirme a ação.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-foreground">Aviso: “{selected?.title}”</p>
            <p className="text-sm text-muted-foreground">
              {toggleAction === "reactivate"
                ? "Este aviso voltará a aparecer no site."
                : "Este aviso deixará de aparecer no site. Você poderá reativá-lo a qualquer momento."}
            </p>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => (setToggleOpen(false), setSelected(null))}>
              Cancelar
            </Button>
            <Button
              variant={toggleAction === "reactivate" ? "success" : "danger"}
              disabled={working}
              onClick={() => void confirmToggle()}
            >
              {working ? "Processando…" : toggleAction === "reactivate" ? "Reativar aviso" : "Desativar aviso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: EXCLUIR */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(v) => {
          if (v) setDeleteOpen(true);
          else {
            setDeleteOpen(false);
            setDeleteConfirmation("");
            setSelected(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:w-full border border-border bg-card text-foreground p-4 sm:p-6 sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-destructive">🗑️ EXCLUIR AVISO</DialogTitle>
            <DialogDescription className="text-muted-foreground">Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <p className="text-sm text-foreground">Aviso: “{selected?.title}”</p>
            <div className="rounded-lg border border-border bg-background p-5">
              <p className="text-sm font-extrabold text-destructive">⚠️ ATENÇÃO:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-destructive">
                <li>Esta ação não pode ser desfeita</li>
                <li>O aviso será excluído permanentemente</li>
                <li>Clientes não verão mais este aviso</li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-extrabold tracking-[0.16em] text-foreground">Digite “EXCLUIR” para confirmar:</p>
              <Input className="mt-3" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => (setDeleteOpen(false), setSelected(null))}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={working || deleteConfirmation !== "EXCLUIR"} onClick={() => void confirmDelete()}>
              {working ? "Excluindo…" : "Excluir permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
