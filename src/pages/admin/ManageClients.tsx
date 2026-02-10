import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  Ban,
  Calendar,
  CalendarCheck,
  CheckCircle,
  Crown,
  Edit,
  Eye,
  MoreVertical,
  Phone,
  Search,
  Scissors,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import SectionHeading from "@/components/common/SectionHeading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  getAllClients,
  updateClient,
  deleteClient,
  suspendClient,
  unsuspendClient,
  type Client,
} from "@/services/api/authService";
import { getMyAppointments, type Appointment } from "@/services/api/appointmentService";
import { getMyPlan, type Plan } from "@/services/api/planService";

type ClientWithStats = Client & {
  totalAppointments: number;
  monthAppointments: number;
  noShowCount: number;
  completedCount: number;
  plan: Plan | null;
  lastAppointment: Appointment | null;
};

function formatPhone(phone: string) {
  return phone;
}

export default function ManageClients() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [clients, setClients] = React.useState<ClientWithStats[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  
  // Filtros
  const [filterPlan, setFilterPlan] = React.useState<"todos" | "com-plano" | "sem-plano" | "suspensos" | "com-faltas">("todos");
  
  // Paginação
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  // Modais
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [suspendOpen, setSuspendOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ClientWithStats | null>(null);
  
  // Form de edição
  const [editName, setEditName] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [mutating, setMutating] = React.useState(false);

  React.useEffect(() => {
    if (!isAdmin) navigate("/dashboard", { replace: true });
  }, [isAdmin, navigate]);

  React.useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim().toLowerCase()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Carrega clientes com estatísticas
  const loadClients = React.useCallback(async () => {
    setLoading(true);
    try {
      const rawClients = await getAllClients();
      
      // Para cada cliente, busca estatísticas
      const enriched = await Promise.all(
        rawClients.map(async (c) => {
          const [appointments, plan] = await Promise.all([
            getMyAppointments(c.userId).catch(() => []),
            getMyPlan(c.userId).catch(() => null),
          ]);
          
          const now = new Date();
          const monthStart = startOfMonth(now);
          const monthEnd = endOfMonth(now);
          
          const monthAppointments = appointments.filter(apt => {
            const aptDate = parseISO(apt.startsAt);
            return isWithinInterval(aptDate, { start: monthStart, end: monthEnd }) &&
                   apt.status !== "canceled";
          }).length;
          
          const completedAppointments = appointments.filter(a => 
            a.status === "completed" || a.status === "confirmed" || a.status === "pending"
          );
          
          const lastAppointment = completedAppointments.length > 0
            ? completedAppointments.sort((a, b) => 
                new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
              )[0]
            : null;
          
          // Contagem de faltas e atendimentos concluídos
          const noShowCount = appointments.filter(a => a.status === "no_show").length;
          const completedCount = appointments.filter(a => a.status === "completed").length;
          
          return {
            ...c,
            totalAppointments: appointments.filter(a => a.status !== "canceled").length,
            monthAppointments,
            noShowCount,
            completedCount,
            plan: plan?.status === "approved" ? plan : null,
            lastAppointment,
          };
        })
      );
      
      setClients(enriched);
    } catch {
      toast({ title: "Erro ao carregar clientes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Filtro
  const filtered = React.useMemo(() => {
    let list = [...clients];
    
    // Busca por nome ou telefone
    if (searchQuery) {
      list = list.filter(c => 
        c.name.toLowerCase().includes(searchQuery) ||
        c.phoneNumber.includes(searchQuery)
      );
    }
    
    // Filtro de plano
    if (filterPlan === "com-plano") {
      list = list.filter(c => c.plan !== null);
    } else if (filterPlan === "sem-plano") {
      list = list.filter(c => c.plan === null);
    } else if (filterPlan === "suspensos") {
      list = list.filter(c => c.suspended);
    } else if (filterPlan === "com-faltas") {
      list = list.filter(c => c.noShowCount > 0);
    }
    
    return list;
  }, [clients, searchQuery, filterPlan]);

  // Paginação
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  // Handlers
  const openDetails = (client: ClientWithStats) => {
    setSelected(client);
    setDetailsOpen(true);
  };

  const openEdit = (client: ClientWithStats) => {
    setSelected(client);
    setEditName(client.name);
    setEditPhone(client.phoneNumber);
    setEditOpen(true);
  };

  const openDelete = (client: ClientWithStats) => {
    setSelected(client);
    setDeleteOpen(true);
  };

  const openSuspend = (client: ClientWithStats) => {
    setSelected(client);
    setSuspendOpen(true);
  };

  const handleEdit = async () => {
    if (!selected) return;
    setMutating(true);
    try {
      await updateClient(selected.userId, { name: editName, phoneNumber: editPhone });
      toast({ title: "Cliente atualizado com sucesso!" });
      setEditOpen(false);
      loadClients();
    } catch (err) {
      toast({ 
        title: "Erro ao atualizar", 
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive" 
      });
    } finally {
      setMutating(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setMutating(true);
    try {
      await deleteClient(selected.userId);
      toast({ title: "Cliente removido com sucesso!" });
      setDeleteOpen(false);
      loadClients();
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      setMutating(false);
    }
  };

  const handleSuspendToggle = async () => {
    if (!selected) return;
    setMutating(true);
    try {
      if (selected.suspended) {
        await unsuspendClient(selected.userId);
        toast({ title: "Conta reativada com sucesso!" });
      } else {
        await suspendClient(selected.userId);
        toast({ title: "Conta suspensa com sucesso!" });
      }
      setSuspendOpen(false);
      loadClients();
    } catch {
      toast({ title: "Erro ao alterar status da conta", variant: "destructive" });
    } finally {
      setMutating(false);
    }
  };

  // Stats
  const stats = React.useMemo(() => {
    const total = clients.length;
    const withPlan = clients.filter(c => c.plan !== null).length;
    const activeThisMonth = clients.filter(c => c.monthAppointments > 0).length;
    const suspended = clients.filter(c => c.suspended).length;
    const totalNoShows = clients.reduce((sum, c) => sum + c.noShowCount, 0);
    const totalCompleted = clients.reduce((sum, c) => sum + c.completedCount, 0);
    return { total, withPlan, activeThisMonth, suspended, totalNoShows, totalCompleted };
  }, [clients]);

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <section className="bg-primary/5 px-4 py-10 sm:py-12 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading kicker="ADMIN" title="Clientes" description="Gerencie os clientes cadastrados." />
        </div>
      </section>

      {/* STATS */}
      <section className="px-4 py-6 sm:py-8 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-border bg-card p-6 shadow-card"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total de clientes</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-lg border border-border bg-card p-6 shadow-card"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                  <Crown className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-foreground">{stats.withPlan}</p>
                  <p className="text-sm text-muted-foreground">Com plano ativo</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-lg border border-border bg-card p-6 shadow-card"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10">
                  <CalendarCheck className="h-6 w-6 text-brand-green" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-foreground">{stats.activeThisMonth}</p>
                  <p className="text-sm text-muted-foreground">Ativos este mês</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-lg border border-border bg-card p-6 shadow-card"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <Ban className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-foreground">{stats.suspended}</p>
                  <p className="text-sm text-muted-foreground">Contas suspensas</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Linha adicional de stats */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-lg border border-border bg-card p-4 shadow-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green/10">
                    <CheckCircle className="h-5 w-5 text-brand-green" />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-brand-green">{stats.totalCompleted}</p>
                    <p className="text-xs text-muted-foreground">Total de atendimentos</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-lg border border-border bg-card p-4 shadow-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className={`text-xl font-extrabold ${stats.totalNoShows > 0 ? "text-destructive" : "text-muted-foreground"}`}>{stats.totalNoShows}</p>
                    <p className="text-xs text-muted-foreground">Total de faltas</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FILTROS */}
      <section className="px-4 py-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Busca */}
            <div className="relative w-full md:w-[360px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por nome ou telefone..."
                className="pl-9"
              />
            </div>

            {/* Filtro de plano */}
            <div className="flex flex-wrap gap-2">
              {(["todos", "com-plano", "sem-plano", "com-faltas", "suspensos"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => { setFilterPlan(f); setPage(1); }}
                  className={
                    "rounded-full border px-4 py-2 text-xs font-extrabold tracking-wide transition-colors " +
                    (filterPlan === f
                      ? f === "suspensos" || f === "com-faltas"
                        ? "border-destructive bg-destructive text-destructive-foreground"
                        : "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-primary hover:text-primary")
                  }
                >
                  {f === "todos" 
                    ? "TODOS" 
                    : f === "com-plano" 
                      ? "COM PLANO" 
                      : f === "sem-plano" 
                        ? "SEM PLANO" 
                        : f === "com-faltas"
                          ? `COM FALTAS${stats.totalNoShows > 0 ? ` (${clients.filter(c => c.noShowCount > 0).length})` : ""}`
                          : `SUSPENSOS${stats.suspended > 0 ? ` (${stats.suspended})` : ""}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LISTA */}
      <section className="px-4 py-8 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold text-foreground">Nenhum cliente encontrado</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchQuery ? "Tente buscar por outro nome ou telefone." : "Ainda não há clientes cadastrados."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop: Tabela */}
              <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-card md:block">
                <table className="w-full">
                  <thead className="border-b border-border bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                        Telefone
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                        Plano
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                        Atendimentos
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                        Faltas
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                        Último
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginated.map((client) => (
                      <tr key={client.userId} className={`hover:bg-muted/30 ${client.suspended ? "opacity-60 bg-destructive/5" : ""}`}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${client.suspended ? "bg-destructive/10" : "bg-primary/10"}`}>
                              <User className={`h-5 w-5 ${client.suspended ? "text-destructive" : "text-primary"}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground">{client.name}</p>
                                {client.suspended && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                                    <Ban className="h-3 w-3" />
                                    Suspenso
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">ID: {client.userId.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-foreground">{formatPhone(client.phoneNumber)}</p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {client.plan ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-600">
                              <Crown className="h-3 w-3" />
                              {client.plan.planType === "custom" ? "Personalizado" : client.plan.planType.replace("club-", "Club ").replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div>
                            <p className="font-semibold text-brand-green">{client.completedCount}</p>
                            <p className="text-xs text-muted-foreground">{client.monthAppointments} este mês</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {client.noShowCount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
                              {client.noShowCount}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {client.lastAppointment ? (
                            <p className="text-sm text-foreground">
                              {format(parseISO(client.lastAppointment.startsAt), "dd/MM/yyyy")}
                            </p>
                          ) : (
                            <span className="text-xs text-muted-foreground">Nunca</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetails(client)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(client)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openSuspend(client)}>
                                {client.suspended ? (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4 text-brand-green" />
                                    <span className="text-brand-green">Reativar conta</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="mr-2 h-4 w-4 text-yellow-600" />
                                    <span className="text-yellow-600">Suspender conta</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => openDelete(client)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: Cards */}
              <div className="space-y-4 md:hidden">
                {paginated.map((client) => (
                  <motion.div
                    key={client.userId}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-lg border bg-card p-4 shadow-card ${client.suspended ? "border-destructive/30 bg-destructive/5" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${client.suspended ? "bg-destructive/10" : "bg-primary/10"}`}>
                          <User className={`h-6 w-6 ${client.suspended ? "text-destructive" : "text-primary"}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{client.name}</p>
                            {client.suspended && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                                <Ban className="h-3 w-3" />
                                Suspenso
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{formatPhone(client.phoneNumber)}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetails(client)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(client)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openSuspend(client)}>
                            {client.suspended ? (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4 text-brand-green" />
                                <span className="text-brand-green">Reativar conta</span>
                              </>
                            ) : (
                              <>
                                <Ban className="mr-2 h-4 w-4 text-yellow-600" />
                                <span className="text-yellow-600">Suspender conta</span>
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDelete(client)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {client.suspended && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                          <Ban className="h-3 w-3" />
                          Conta suspensa
                        </span>
                      )}
                      {client.noShowCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                          {client.noShowCount} falta{client.noShowCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {client.plan && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-600">
                          <Crown className="h-3 w-3" />
                          {client.plan.planType === "custom" ? "Personalizado" : client.plan.planType.replace("club-", "Club ").replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-green">
                        <CheckCircle className="h-3 w-3" />
                        {client.completedCount} atendimentos
                      </span>
                    </div>

                    {client.lastAppointment && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Último: {format(parseISO(client.lastAppointment.startsAt), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* MODAL: Detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-extrabold text-primary">
              <User className="h-5 w-5" />
              Detalhes do Cliente
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6">
              {/* Info básica */}
              <div className="flex items-center gap-4">
                <div className={`flex h-16 w-16 items-center justify-center rounded-full ${selected.suspended ? "bg-destructive/10" : "bg-primary/10"}`}>
                  <User className={`h-8 w-8 ${selected.suspended ? "text-destructive" : "text-primary"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-foreground">{selected.name}</p>
                    {selected.suspended && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                        <Ban className="h-3 w-3" />
                        Suspenso
                      </span>
                    )}
                  </div>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {formatPhone(selected.phoneNumber)}
                  </p>
                </div>
              </div>

              {/* Status da conta */}
              {selected.suspended && (
                <div className="rounded-lg border-2 border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-destructive">Conta suspensa</p>
                      <p className="text-sm text-destructive/80">
                        Este cliente teve {selected.noShowCount} falta(s) registrada(s) e está impedido de fazer novos agendamentos.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Plano */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plano</p>
                {selected.plan ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <span className="font-semibold text-foreground">
                      {selected.plan.planType === "custom" ? "Plano Personalizado" : selected.plan.planType.replace("club-", "Club ").replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Sem plano ativo</p>
                )}
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                  <p className="text-2xl font-extrabold text-brand-green">{selected.completedCount}</p>
                  <p className="text-xs text-muted-foreground">Atendimentos</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                  <p className="text-2xl font-extrabold text-primary">{selected.monthAppointments}</p>
                  <p className="text-xs text-muted-foreground">Este mês</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                  <p className="text-2xl font-extrabold text-foreground">{selected.totalAppointments}</p>
                  <p className="text-xs text-muted-foreground">Total agendados</p>
                </div>
                <div className={`rounded-lg border p-4 text-center ${selected.noShowCount > 0 ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/30"}`}>
                  <p className={`text-2xl font-extrabold ${selected.noShowCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>{selected.noShowCount}</p>
                  <p className="text-xs text-muted-foreground">Faltas</p>
                </div>
              </div>

              {/* Último agendamento */}
              {selected.lastAppointment && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Último Atendimento</p>
                  <div className="mt-2">
                    <p className="font-semibold text-foreground">{selected.lastAppointment.serviceName}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(selected.lastAppointment.startsAt), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}

              {/* ID */}
              <p className="text-xs text-muted-foreground">
                ID: {selected.userId}
              </p>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {selected?.suspended ? (
              <Button 
                variant="outline" 
                onClick={() => { setDetailsOpen(false); openSuspend(selected!); }}
                className="text-brand-green border-brand-green hover:bg-brand-green/10"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Reativar Conta
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => { setDetailsOpen(false); openSuspend(selected!); }}
                className="text-yellow-600 border-yellow-500 hover:bg-yellow-500/10"
              >
                <Ban className="mr-2 h-4 w-4" />
                Suspender
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
            <Button variant="hero" onClick={() => { setDetailsOpen(false); openEdit(selected!); }}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-primary">
              Editar Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome completo</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do cliente"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={mutating}>
              Cancelar
            </Button>
            <Button variant="hero" onClick={handleEdit} disabled={mutating || !editName.trim() || !editPhone.trim()}>
              {mutating ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Excluir */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-destructive">
              Excluir Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir <strong>{selected?.name}</strong>?
            </p>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">
                ⚠️ Esta ação não pode ser desfeita. O cliente será removido permanentemente do sistema.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={mutating}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={mutating}>
              {mutating ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Suspender/Reativar */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={`text-xl font-extrabold ${selected?.suspended ? "text-brand-green" : "text-yellow-600"}`}>
              {selected?.suspended ? "Reativar Conta" : "Suspender Conta"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selected?.suspended 
                ? <>Tem certeza que deseja reativar a conta de <strong>{selected?.name}</strong>?</>
                : <>Tem certeza que deseja suspender a conta de <strong>{selected?.name}</strong>?</>
              }
            </p>
            <div className={`rounded-lg border p-4 ${selected?.suspended ? "border-brand-green/30 bg-brand-green/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
              {selected?.suspended ? (
                <div className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-brand-green flex-shrink-0" />
                  <div className="text-sm text-brand-green">
                    <p className="font-semibold">A conta será reativada</p>
                    <p className="mt-1 text-brand-green/80">O cliente poderá fazer login e agendar serviços novamente.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-semibold">O que acontece ao suspender:</p>
                    <ul className="mt-1 list-disc pl-4 text-yellow-600/80">
                      <li>O cliente poderá fazer login</li>
                      <li>Não poderá agendar novos serviços</li>
                      <li>Os dados serão mantidos no sistema</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)} disabled={mutating}>
              Cancelar
            </Button>
            {selected?.suspended ? (
              <Button variant="hero" onClick={handleSuspendToggle} disabled={mutating}>
                {mutating ? "Reativando..." : "Reativar conta"}
              </Button>
            ) : (
              <Button 
                onClick={handleSuspendToggle} 
                disabled={mutating}
                className="bg-yellow-500 text-white hover:bg-yellow-600"
              >
                {mutating ? "Suspendendo..." : "Suspender conta"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
