import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

import PlanStatusBadge, { planStatusMeta } from "@/components/admin/plans/PlanStatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { getUserById } from "@/services/api/authService";
import {
  approvePlan,
  deactivatePlan,
  getAllPlans,
  getPlanDetails,
  rejectPlan,
  type Plan,
  type PlanDetails,
  type PlanStatus,
  type PlanType,
  FIXED_PLANS,
  type PlanIncludes,
} from "@/services/api/planService";
import { cn } from "@/lib/utils";

type TabKey = "pending" | "approved" | "all";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

// Retorna o nome do plano baseado no tipo
function getPlanDisplayName(planType: PlanType): string {
  if (planType === "custom") return "Plano Personalizado";
  const plan = FIXED_PLANS[planType as keyof typeof FIXED_PLANS];
  return plan?.name ?? planType;
}

// Retorna os benefícios do plano baseado no includes
function getPlanBenefits(planType: PlanType, includes?: PlanIncludes | null): string[] {
  const benefits: string[] = [];
  
  // Se tem includes específicos, usa eles
  if (includes) {
    if (includes.unlimitedCuts) benefits.push("Cortes ilimitados");
    if (includes.unlimitedBeard) benefits.push("Barba ilimitada");
    if (includes.eyebrowIncluded) benefits.push("Sobrancelha incluída");
    
    // Dias
    if (includes.allowedDays?.includes("sab")) {
      benefits.push("Segunda a Sábado");
    } else if (includes.allowedDays?.includes("sex")) {
      benefits.push("Segunda a Sexta");
    } else if (includes.allowedDays?.length === 4) {
      benefits.push("Segunda a Quinta");
    }
    
    // Prioridade
    if (includes.priority === "max") benefits.push("Prioridade máxima");
    else if (includes.priority === "medium") benefits.push("Prioridade média");
    
    // Descontos
    if (includes.productDiscount > 0) benefits.push(`${includes.productDiscount}% desconto em produtos`);
    if (includes.fixedSchedule) benefits.push("Horário fixo semanal");
    
    return benefits;
  }
  
  // Fallback para planos fixos
  if (planType !== "custom") {
    const plan = FIXED_PLANS[planType as keyof typeof FIXED_PLANS];
    if (plan) {
      return plan.features;
    }
  }
  
  return ["Plano personalizado"];
}

// Retorna o preço do plano
function getPlanPrice(planType: PlanType, includes?: PlanIncludes | null): number {
  if (planType !== "custom") {
    const plan = FIXED_PLANS[planType as keyof typeof FIXED_PLANS];
    return plan?.price ?? 0;
  }
  // Para plano customizado, calcula baseado nos includes (simplificado)
  // O preço real deveria vir salvo no plano
  return 0; // Será mostrado como "Personalizado"
}

function canDeactivate(status: PlanStatus) {
  return status === "approved";
}

export default function ApprovePlans() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [tab, setTab] = React.useState<TabKey>("pending");
  const [loading, setLoading] = React.useState(true);
  const [plans, setPlans] = React.useState<Plan[]>([]);

  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  const [selected, setSelected] = React.useState<Plan | null>(null);
  const [details, setDetails] = React.useState<PlanDetails | null>(null);

  const [approveObs, setApproveObs] = React.useState("");
  const [rejectReason, setRejectReason] = React.useState("");
  const [rejectObs, setRejectObs] = React.useState("");
  const [deactivateReason, setDeactivateReason] = React.useState("");
  const [mutating, setMutating] = React.useState(false);

  React.useEffect(() => {
    if (!isAdmin) navigate("/dashboard", { replace: true });
  }, [isAdmin, navigate]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllPlans();
      setPlans(list);
    } catch {
      toast({ title: "Erro ao carregar planos", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const i = setInterval(() => load(), 120000);
    return () => clearInterval(i);
  }, [load]);

  const counters = React.useMemo(
    () => ({
      pending: plans.filter((p) => p.status === "pending").length,
      approved: plans.filter((p) => p.status === "approved").length,
      all: plans.length,
    }),
    [plans],
  );

  const filtered = React.useMemo(() => {
    if (tab === "pending") return plans.filter((p) => p.status === "pending");
    if (tab === "approved") return plans.filter((p) => p.status === "approved");
    return plans;
  }, [plans, tab]);

  const openApprove = (p: Plan) => {
    setSelected(p);
    setApproveObs("");
    setApproveOpen(true);
  };

  const openReject = (p: Plan) => {
    setSelected(p);
    setRejectReason("");
    setRejectObs("");
    setRejectOpen(true);
  };

  const openDeactivate = (p: Plan) => {
    setSelected(p);
    setDeactivateReason("");
    setDeactivateOpen(true);
  };

  const openDetails = async (p: Plan) => {
    setSelected(p);
    setDetails(null);
    setDetailsOpen(true);
    try {
      const d = await getPlanDetails({ id: p.id });
      setDetails(d);
    } catch {
      // Mantém modal aberto com fallback.
    }
  };

  const confirmApprove = async () => {
    if (!selected) return;
    setMutating(true);
    try {
      await approvePlan({ id: selected.id, observation: approveObs.trim() || undefined });
      toast({ title: "Plano aprovado", description: "Cliente será notificado (placeholder)." });
      setApproveOpen(false);
      setSelected(null);
      await load();
    } catch {
      toast({ title: "Erro ao aprovar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setMutating(false);
    }
  };

  const confirmReject = async () => {
    if (!selected) return;
    if (!rejectReason) {
      toast({ title: "Selecione um motivo", variant: "destructive" });
      return;
    }
    setMutating(true);
    try {
      await rejectPlan({ id: selected.id, reason: rejectReason, observation: rejectObs.trim() || undefined });
      toast({ title: "Solicitação reprovada", description: "Cliente será notificado (placeholder)." });
      setRejectOpen(false);
      setSelected(null);
      await load();
    } catch {
      toast({ title: "Erro ao reprovar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setMutating(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!selected) return;
    setMutating(true);
    try {
      await deactivatePlan({ id: selected.id, reason: deactivateReason.trim() || undefined });
      toast({ title: "Plano desativado", description: "Horário fixo liberado (placeholder)." });
      setDeactivateOpen(false);
      setSelected(null);
      await load();
    } catch {
      toast({ title: "Erro ao desativar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8">
      {/* HERO */}
      <section className="bg-background px-4 py-12 sm:py-16 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl md:text-5xl"
          >
            💎 PLANOS
          </motion.h1>
          <p className="mt-3 text-sm text-foreground sm:text-base md:text-lg">Aprove ou reprove solicitações de planos</p>
        </div>
      </section>

      {/* TABS */}
      <section className="bg-background px-4 py-6 sm:py-10 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            {(
              [
                { key: "pending" as const, label: "PENDENTES", count: counters.pending },
                { key: "approved" as const, label: "APROVADOS", count: counters.approved },
                { key: "all" as const, label: "TODOS", count: counters.all },
              ]
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  "flex items-center justify-center gap-2 sm:gap-3 rounded-lg border border-border px-4 sm:px-8 py-3 sm:py-4 text-xs sm:text-sm font-extrabold transition-colors " +
                  (tab === t.key ? "bg-primary text-primary-foreground" : "bg-transparent text-foreground hover:text-primary")
                }
                aria-label={`Abrir aba ${t.label}`}
              >
                <span>{t.label}</span>
                <span
                  className={cn(
                    "inline-flex min-w-7 sm:min-w-8 items-center justify-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-extrabold",
                    tab === t.key ? "bg-background text-foreground" : "bg-card text-muted-foreground",
                  )}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="bg-background px-4 py-16 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <div className={cn("grid gap-6", tab === "approved" ? "lg:grid-cols-3 md:grid-cols-2" : "md:grid-cols-2")}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-8 shadow-card">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="mt-6 h-6 w-2/3" />
                  <Skeleton className="mt-3 h-4 w-1/2" />
                  <Skeleton className="mt-10 h-28 w-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-20 text-center shadow-card">
              <p className="text-4xl font-extrabold text-brand-green">✅</p>
              <p className="mt-4 text-base font-extrabold text-foreground">Nenhuma solicitação pendente</p>
              <p className="mt-2 text-sm text-muted-foreground">Todas as solicitações foram processadas</p>
            </div>
          ) : (
            <div className={cn("grid gap-6", tab === "approved" ? "lg:grid-cols-3 md:grid-cols-2" : "md:grid-cols-2")}>
              {filtered.map((p, idx) => {
                const user = getUserById(p.userId);
                const name = user?.name ?? `Cliente (${p.userId.slice(0, 6)})`;
                const phone = user?.phoneNumber ?? "";
                const meta = planStatusMeta(p.status);
                const price = getPlanPrice(p.planType, p.includes);
                const displayName = getPlanDisplayName(p.planType);
                const benefits = getPlanBenefits(p.planType, p.includes);
                const compact = tab === "approved";

                return (
                  <motion.div
                    key={p.id}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.25, delay: reduce ? 0 : idx * 0.03 }}
                  >
                    <div
                      className={cn(
                        "relative rounded-lg border border-border bg-card shadow-card transition-all duration-300 hover:shadow-lg",
                        "border-l-4",
                        meta.leftBorder,
                        compact ? "p-6" : "p-8",
                        p.status === "rejected" || p.status === "deactivated" ? "opacity-80" : "",
                      )}
                    >
                      <div className="absolute right-4 top-4">
                        <PlanStatusBadge status={p.status} />
                      </div>

                      <p className={cn("text-lg font-extrabold text-foreground", compact ? "pr-24" : "pr-28")}>👤 {name}</p>
                      {phone ? (
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <a
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
                            href={`tel:${phone}`}
                          >
                            <Phone className="h-4 w-4" aria-hidden /> {phone}
                          </a>
                          <a
                            className="text-sm font-extrabold text-primary underline-offset-4 hover:underline"
                            href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            [WhatsApp]
                          </a>
                        </div>
                      ) : null}

                      <div className={cn("mt-6 border-t border-border", compact ? "pt-5" : "pt-6")}>
                        <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">💎 PLANO</p>
                        <p className={cn("mt-2 font-extrabold text-primary", compact ? "text-base" : "text-xl")}>⭐ {displayName}</p>
                        {!compact ? (
                          <ul className="mt-4 space-y-1 text-sm text-foreground">
                            {benefits.map((b) => (
                              <li key={b}>✓ {b}</li>
                            ))}
                          </ul>
                        ) : null}
                        <p className={cn("mt-4 font-extrabold text-brand-green", compact ? "text-base" : "text-xl")}>
                          {price > 0 ? `${formatBRL(price)}/mês` : "Personalizado"}
                        </p>
                      </div>

                      <div className="mt-6 border-t border-border pt-6">
                        <p className="text-xs text-muted-foreground">
                          📅 Solicitado em {format(parseISO(p.requestedAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}
                        </p>
                        {p.approvedAt ? (
                          <p className="mt-1 text-xs text-muted-foreground">Ativo desde: {format(parseISO(p.approvedAt), "dd/MM/yyyy")}</p>
                        ) : null}
                      </div>

                      {/* Actions */}
                      <div className={cn("mt-6 flex gap-3", compact ? "flex-col" : "flex-row")}> 
                        {p.status === "pending" ? (
                          <>
                            <Button
                              variant="outline"
                              className={cn("w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground", compact ? "h-11" : "h-12")}
                              onClick={() => openReject(p)}
                            >
                              ❌ REPROVAR
                            </Button>
                            <Button
                              variant="success"
                              className={cn("w-full", compact ? "h-11" : "h-12")}
                              onClick={() => openApprove(p)}
                            >
                              ✅ APROVAR
                            </Button>
                          </>
                        ) : p.status === "approved" ? (
                          <>
                            <Button
                              variant="outline"
                              className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => openDeactivate(p)}
                            >
                              🔴 DESATIVAR
                            </Button>
                            <Button variant="outline" className="w-full" onClick={() => openDetails(p)}>
                              📋 DETALHES
                            </Button>
                          </>
                        ) : (
                          <Button variant="outline" className="w-full" onClick={() => openDetails(p)}>
                            📋 DETALHES
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* MODAL APROVAR */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-2xl border-2 border-brand-green bg-card p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-brand-green">✅ APROVAR PLANO</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-5 text-sm text-foreground">
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">CLIENTE</p>
                <p className="mt-2 text-base font-extrabold">{getUserById(selected.userId)?.name ?? selected.userId}</p>
                {getUserById(selected.userId)?.phoneNumber ? (
                  <p className="mt-1 text-sm text-muted-foreground">📱 {getUserById(selected.userId)!.phoneNumber}</p>
                ) : null}
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">PLANO</p>
                <p className="mt-2 text-base font-extrabold text-primary">⭐ {getPlanDisplayName(selected.planType)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getPlanPrice(selected.planType, selected.includes) > 0 
                    ? `${formatBRL(getPlanPrice(selected.planType, selected.includes))}/mês` 
                    : "Personalizado"}
                </p>
                <p className="mt-3 text-xs font-extrabold tracking-[0.18em] text-muted-foreground">Benefícios</p>
                <ul className="mt-2 space-y-1">
                  {getPlanBenefits(selected.planType, selected.includes).map((b) => (
                    <li key={b}>✓ {b}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">AGENDAMENTO</p>
                <p className="mt-2 text-sm text-muted-foreground">O cliente poderá agendar livremente após aprovação, dentro das regras do plano.</p>
              </div>

              <div>
                <label className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">OBSERVAÇÕES (OPCIONAL)</label>
                <Input
                  value={approveObs}
                  onChange={(e) => setApproveObs(e.target.value)}
                  className="mt-2 h-11"
                  placeholder="Ex: Cliente antigo, pagamento OK"
                />
              </div>

              <div className="rounded-lg border border-primary bg-primary/10 p-4">
                <p className="text-sm font-extrabold text-primary">⚠️ IMPORTANTE:</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>• Cliente receberá confirmação automática (placeholder)</li>
                  <li>• Plano entra em vigor imediatamente</li>
                  <li>• Primeiro pagamento: presencial</li>
                </ul>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={mutating}>CANCELAR</Button>
            <Button variant="success" onClick={confirmApprove} disabled={mutating}>
              {mutating ? "CONFIRMANDO..." : "CONFIRMAR APROVAÇÃO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL REPROVAR */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-2xl border-2 border-destructive bg-card p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-destructive">❌ REPROVAR SOLICITAÇÃO</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-5 text-sm text-foreground">
              <div className="rounded-lg border border-border bg-background p-4">
                <p><span className="font-extrabold">Cliente:</span> {getUserById(selected.userId)?.name ?? selected.userId}</p>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-extrabold text-foreground">Plano:</span> {getPlanDisplayName(selected.planType)}
                  {getPlanPrice(selected.planType, selected.includes) > 0 
                    ? ` - ${formatBRL(getPlanPrice(selected.planType, selected.includes))}/mês` 
                    : " (Personalizado)"}
                </p>
              </div>

              <div>
                <label className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">MOTIVO DA REPROVAÇÃO *</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-border bg-card px-3 text-sm font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Selecione...</option>
                  <option value="Horário não disponível">Horário não disponível</option>
                  <option value="Cliente com histórico de faltas">Cliente com histórico de faltas</option>
                  <option value="Capacidade máxima atingida">Capacidade máxima atingida</option>
                  <option value="Outro motivo">Outro motivo</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">OBSERVAÇÃO (OPCIONAL)</label>
                <textarea
                  value={rejectObs}
                  onChange={(e) => setRejectObs(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={3}
                  placeholder="Detalhes sobre a reprovação"
                />
              </div>

              <p className="text-xs text-muted-foreground">ℹ️ Cliente será notificado da reprovação (placeholder)</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={mutating}>CANCELAR</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={mutating}>
              {mutating ? "CONFIRMANDO..." : "CONFIRMAR REPROVAÇÃO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DESATIVAR */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="max-w-2xl border-2 border-destructive bg-card p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-destructive">🔴 DESATIVAR PLANO</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-5 text-sm text-foreground">
              <div className="rounded-lg border border-border bg-background p-4">
                <p><span className="font-extrabold">Cliente:</span> {getUserById(selected.userId)?.name ?? selected.userId}</p>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-extrabold text-foreground">Plano:</span> {getPlanDisplayName(selected.planType)}
                  {getPlanPrice(selected.planType, selected.includes) > 0 
                    ? ` - ${formatBRL(getPlanPrice(selected.planType, selected.includes))}/mês` 
                    : " (Personalizado)"}
                </p>
                {selected.approvedAt ? (
                  <p className="mt-1 text-muted-foreground"><span className="font-extrabold text-foreground">Ativo desde:</span> {format(parseISO(selected.approvedAt), "dd/MM/yyyy")}</p>
                ) : null}
              </div>

              <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                <p className="text-sm font-extrabold text-destructive">⚠️ ATENÇÃO:</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>• O plano será cancelado imediatamente</li>
                  <li>• Horário fixo será liberado (placeholder)</li>
                  <li>• Cliente poderá solicitar novamente</li>
                </ul>
              </div>

              <div>
                <label className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">MOTIVO (OPCIONAL)</label>
                <textarea
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={3}
                  placeholder="Ex: Cliente solicitou cancelamento"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)} disabled={mutating}>VOLTAR</Button>
            <Button variant="destructive" onClick={confirmDeactivate} disabled={mutating}>
              {mutating ? "DESATIVANDO..." : "DESATIVAR PLANO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALHES */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl border-2 border-primary bg-card p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-primary">📋 DETALHES DO PLANO</DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="space-y-5 text-sm text-foreground">
              <div className="flex items-center justify-between gap-3">
                <PlanStatusBadge status={selected.status} />
                <p className="text-xs text-muted-foreground">ID: {selected.id.slice(-8)}</p>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">CLIENTE</p>
                <p className="mt-2 text-base font-extrabold">{getUserById(selected.userId)?.name ?? selected.userId}</p>
                {getUserById(selected.userId)?.phoneNumber ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <a className="text-sm text-primary underline-offset-4 hover:underline" href={`tel:${getUserById(selected.userId)!.phoneNumber}`}>📞 Ligar</a>
                    <a
                      className="text-sm text-primary underline-offset-4 hover:underline"
                      href={`https://wa.me/${getUserById(selected.userId)!.phoneNumber!.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      💬 WhatsApp
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">PLANO</p>
                <p className="mt-2 text-base font-extrabold text-primary">⭐ {getPlanDisplayName(selected.planType)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getPlanPrice(selected.planType, selected.includes) > 0 
                    ? `${formatBRL(getPlanPrice(selected.planType, selected.includes))}/mês` 
                    : "Personalizado"}
                </p>
                <ul className="mt-3 space-y-1">
                  {getPlanBenefits(selected.planType, selected.includes).map((b) => (
                    <li key={b}>✓ {b}</li>
                  ))}
                </ul>
                
                {/* Detalhes específicos do plano personalizado */}
                {selected.planType === "custom" && selected.includes && (
                  <div className="mt-4 rounded border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs font-extrabold tracking-[0.18em] text-primary">DETALHES DO PLANO PERSONALIZADO</p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <li>• Cortes: {selected.includes.unlimitedCuts ? "Ilimitados" : "4 por mês"}</li>
                      <li>• Barba: {selected.includes.unlimitedBeard ? "Ilimitada" : "Não incluída"}</li>
                      <li>• Sobrancelha: {selected.includes.eyebrowIncluded ? "Incluída" : "Não incluída"}</li>
                      <li>• Dias: {selected.includes.allowedDays?.includes("sab") ? "Seg a Sáb" : selected.includes.allowedDays?.includes("sex") ? "Seg a Sex" : "Seg a Qui"}</li>
                      <li>• Prioridade: {selected.includes.priority === "max" ? "Máxima" : selected.includes.priority === "medium" ? "Média" : "Normal"}</li>
                      <li>• Desconto em produtos: {selected.includes.productDiscount > 0 ? `${selected.includes.productDiscount}%` : "Sem desconto"}</li>
                      <li>• Horário fixo: {selected.includes.fixedSchedule ? "Sim" : "Não"}</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">AGENDAMENTO</p>
                <p className="mt-2 text-sm">Cliente agenda livremente dentro das regras do plano.</p>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">DATAS</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• Solicitado: {format(parseISO(selected.requestedAt), "dd/MM/yyyy")}</li>
                  {selected.approvedAt ? <li>• Aprovado: {format(parseISO(selected.approvedAt), "dd/MM/yyyy")}</li> : null}
                  {selected.deactivatedAt ? <li>• Desativado: {format(parseISO(selected.deactivatedAt), "dd/MM/yyyy")}</li> : null}
                  {selected.rejectedAt ? <li>• Reprovado: {format(parseISO(selected.rejectedAt), "dd/MM/yyyy")}</li> : null}
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">ESTATÍSTICAS</p>
                {details ? (
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Serviços realizados: {details.stats?.servicesCount ?? 0}</li>
                    <li>• Faltas: {details.stats?.missedCount ?? 0}</li>
                    <li>• Última visita: {details.stats?.lastVisit ?? "-"}</li>
                  </ul>
                ) : (
                  <div className="mt-2 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                )}
              </div>

              {selected.observation ? (
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="text-xs font-extrabold tracking-[0.18em] text-muted-foreground">OBSERVAÇÕES</p>
                  <p className="mt-2 text-sm text-muted-foreground">{selected.observation}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>FECHAR</Button>
            {selected && canDeactivate(selected.status) ? (
              <Button variant="destructive" onClick={() => { setDetailsOpen(false); openDeactivate(selected); }}>
                🔴 DESATIVAR PLANO
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
