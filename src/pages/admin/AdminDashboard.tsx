import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { addMinutes, format, isSameDay, parseISO, startOfDay, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Clock,
  ClipboardList,
  DollarSign,
  Image,
  Package,
  Settings,
  Shield,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  getAllAppointmentsByDate,
  markAsAbsent,
  markAsCompleted,
  type Appointment,
} from "@/services/api/appointmentService";
import { getUserById } from "@/services/api/authService";
import { getAllPlanRequests } from "@/services/api/planService";
import { getAllTshirtOrders } from "@/services/api/orderService";
import {
  getShopConfig,
  updateDaySchedule,
  setSpecialDay,
  removeSpecialDay,
  type ShopConfig,
  type WeekDay,
  type SpecialDay,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
} from "@/services/api/shopConfigService";
import { getAllAppointments } from "@/services/api/appointmentService";
import {
  getAllGalleryPhotos,
  uploadGalleryPhoto,
  deleteGalleryPhoto,
  moveGalleryPhoto,
  isSupabaseConfigured,
  type GalleryPhoto,
} from "@/services/api/galleryService";

type Metric = {
  title: string;
  value: string;
  sub: string;
  toneTop: string;
  icon: React.ReactNode;
  link?: { label: string; href: string };
  delta?: { type: "up" | "down" | "same"; text: string };
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function ymd(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function sumRevenue(appointments: Appointment[]) {
  return appointments.filter((a) => a.status === "completed").reduce((acc, a) => acc + a.price, 0);
}

function deltaText(today: number, yesterday: number) {
  const diff = today - yesterday;
  if (diff > 0) return { type: "up" as const, text: `+${diff} desde ontem` };
  if (diff < 0) return { type: "down" as const, text: `${diff} desde ontem` };
  return { type: "same" as const, text: "= ontem" };
}

function deltaPercent(today: number, yesterday: number) {
  if (yesterday === 0) {
    if (today === 0) return { type: "same" as const, text: "= ontem" };
    return { type: "up" as const, text: "+∞ vs. ontem" };
  }
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  if (pct > 0) return { type: "up" as const, text: `+${pct}% vs. ontem` };
  if (pct < 0) return { type: "down" as const, text: `${pct}% vs. ontem` };
  return { type: "same" as const, text: "= ontem" };
}

function slotEnd(apt: Appointment) {
  return addMinutes(parseISO(apt.startsAt), apt.durationMinutes);
}

export default function AdminDashboard() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [todayAppointments, setTodayAppointments] = React.useState<Appointment[]>([]);
  const [yesterdayAppointments, setYesterdayAppointments] = React.useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = React.useState<Appointment[]>([]);
  const [pendingPlans, setPendingPlans] = React.useState(0);
  const [newOrders, setNewOrders] = React.useState(0);

  // Configurações da barbearia
  const [shopConfig, setShopConfig] = React.useState<ShopConfig | null>(null);
  const [configOpen, setConfigOpen] = React.useState(false);
  const [specialDayOpen, setSpecialDayOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [specialDayMode, setSpecialDayMode] = React.useState<"close" | "custom">("close");
  const [specialOpenTime, setSpecialOpenTime] = React.useState("09:00");
  const [specialCloseTime, setSpecialCloseTime] = React.useState("18:00");
  const [specialReason, setSpecialReason] = React.useState("");
  const [savingConfig, setSavingConfig] = React.useState(false);

  const [completeOpen, setCompleteOpen] = React.useState(false);
  const [absentOpen, setAbsentOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Appointment | null>(null);
  const [observation, setObservation] = React.useState("");
  const [mutating, setMutating] = React.useState(false);

  // Estados da galeria
  const [galleryOpen, setGalleryOpen] = React.useState(false);
  const [galleryCategory, setGalleryCategory] = React.useState<"Cortes" | "Luzes" | "Quimica">("Cortes");
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [selectedPhoto, setSelectedPhoto] = React.useState<GalleryPhoto | null>(null);
  const [movePhotoOpen, setMovePhotoOpen] = React.useState(false);
  const [targetCategory, setTargetCategory] = React.useState<"Cortes" | "Luzes" | "Quimica">("Cortes");
  const [supabasePhotos, setSupabasePhotos] = React.useState<GalleryPhoto[]>([]);
  const [loadingGallery, setLoadingGallery] = React.useState(false);
  
  const isSupabaseReady = isSupabaseConfigured();

  // Carregar fotos do Supabase
  const loadGalleryPhotos = React.useCallback(async () => {
    if (!isSupabaseReady) return;
    
    setLoadingGallery(true);
    try {
      const photos = await getAllGalleryPhotos();
      setSupabasePhotos(photos);
    } catch (error) {
      console.error('Erro ao carregar fotos:', error);
    } finally {
      setLoadingGallery(false);
    }
  }, [isSupabaseReady]);

  // Carregar fotos ao abrir modal
  React.useEffect(() => {
    if (galleryOpen && isSupabaseReady) {
      loadGalleryPhotos();
    }
  }, [galleryOpen, isSupabaseReady, loadGalleryPhotos]);

  // Organizar fotos por categoria
  const galleryImages = React.useMemo(() => {
    return {
      Cortes: supabasePhotos.filter(p => p.category === 'Cortes'),
      Luzes: supabasePhotos.filter(p => p.category === 'Luzes'),
      Quimica: supabasePhotos.filter(p => p.category === 'Quimica'),
    };
  }, [supabasePhotos]);

  const currentCategoryImages = galleryImages[galleryCategory];

  // Função para upload de fotos
  const handleUploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (!isSupabaseReady) {
      toast({
        title: "⚠️ Supabase não configurado",
        description: "Configure o Supabase para fazer upload de fotos. Veja o arquivo .env.example",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);
    const filesArray = Array.from(files);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const file of filesArray) {
        const result = await uploadGalleryPhoto(file, galleryCategory);
        
        if (result.success) {
          successCount++;
          if (result.photo) {
            setSupabasePhotos(prev => [result.photo!, ...prev]);
          }
        } else {
          errorCount++;
          toast({
            title: "Erro no upload",
            description: result.error || `Erro ao fazer upload de ${file.name}`,
            variant: "destructive",
          });
        }
      }

      if (successCount > 0) {
        toast({
          title: "✅ Upload concluído!",
          description: `${successCount} foto(s) adicionada(s) com sucesso${errorCount > 0 ? `. ${errorCount} falharam.` : ''}`,
        });
      }

    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Erro inesperado ao fazer upload das fotos",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Função para remover foto
  const handleRemovePhoto = async (photo: GalleryPhoto) => {
    if (!isSupabaseReady) {
      toast({
        title: "⚠️ Supabase não configurado",
        description: "Configure o Supabase para remover fotos",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await deleteGalleryPhoto(photo.id);
      
      if (result.success) {
        setSupabasePhotos(prev => prev.filter(p => p.id !== photo.id));
        toast({
          title: "✅ Foto removida!",
          description: `"${photo.filename}" foi deletada permanentemente.`,
        });
      } else {
        toast({
          title: "Erro ao remover",
          description: result.error || "Não foi possível remover a foto",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao remover",
        description: "Erro inesperado ao remover a foto",
        variant: "destructive",
      });
    }
  };

  // Função para abrir modal de mover foto
  const openMovePhoto = (photo: GalleryPhoto) => {
    setSelectedPhoto(photo);
    const otherCategories = ["Cortes", "Luzes", "Quimica"].filter(c => c !== photo.category) as ("Cortes" | "Luzes" | "Quimica")[];
    setTargetCategory(otherCategories[0]);
    setMovePhotoOpen(true);
  };

  // Função para mover foto entre categorias
  const handleMovePhoto = async () => {
    if (!selectedPhoto) return;

    if (!isSupabaseReady) {
      toast({
        title: "⚠️ Supabase não configurado",
        description: "Configure o Supabase para mover fotos",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const result = await moveGalleryPhoto(selectedPhoto.id, targetCategory);
      
      if (result.success) {
        // Atualizar estado local
        setSupabasePhotos(prev => 
          prev.map(p => 
            p.id === selectedPhoto.id 
              ? { ...p, category: targetCategory }
              : p
          )
        );
        
        toast({
          title: "✅ Foto movida!",
          description: `"${selectedPhoto.filename}" foi movida de ${selectedPhoto.category} para ${targetCategory}`,
        });
      } else {
        toast({
          title: "Erro ao mover",
          description: result.error || "Não foi possível mover a foto",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao mover",
        description: "Erro inesperado ao mover a foto",
        variant: "destructive",
      });
    } finally {
      setMovePhotoOpen(false);
      setSelectedPhoto(null);
    }
  };

  const today = React.useMemo(() => new Date(), []);
  const todayKey = ymd(today);
  const yesterdayKey = ymd(new Date(Date.now() - 24 * 60 * 60 * 1000));

  React.useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, navigate]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [reduce]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [tA, yA, allA, plans, orders, config] = await Promise.all([
        getAllAppointmentsByDate({ date: todayKey }),
        getAllAppointmentsByDate({ date: yesterdayKey }),
        getAllAppointments(),
        getAllPlanRequests(),
        getAllTshirtOrders(),
        getShopConfig(),
      ]);

      setTodayAppointments(tA);
      setYesterdayAppointments(yA);
      setAllAppointments(allA);
      setPendingPlans(plans.length);
      setNewOrders(orders.filter((o) => o.status === "pending").length);
      setShopConfig(config);
    } catch {
      toast({ title: "Erro ao carregar painel", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, todayKey, yesterdayKey]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const i = setInterval(() => {
      load();
    }, 60000);
    return () => clearInterval(i);
  }, [load]);

  const revenueToday = React.useMemo(() => sumRevenue(todayAppointments), [todayAppointments]);
  const revenueYesterday = React.useMemo(() => sumRevenue(yesterdayAppointments), [yesterdayAppointments]);
  const appointmentsDelta = deltaText(todayAppointments.length, yesterdayAppointments.length);
  const revenueDelta = deltaPercent(revenueToday, revenueYesterday);

  // Dados para gráficos mensais
  const monthlyChartData = React.useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const days = eachDayOfInterval({ start, end });
    
    return days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayAppointments = allAppointments.filter((a) => 
        new Date(a.startsAt).toISOString().slice(0, 10) === dateStr
      );
      const completedAppointments = dayAppointments.filter((a) => a.status === "completed");
      const revenue = completedAppointments.reduce((acc, a) => acc + a.price, 0);
      
      return {
        date: format(day, "dd"),
        fullDate: format(day, "dd/MM", { locale: ptBR }),
        cortes: dayAppointments.length,
        ganhos: revenue,
      };
    });
  }, [allAppointments]);

  // Totais do mês
  const monthlyTotals = React.useMemo(() => {
    const now = new Date();
    const monthStr = format(now, "yyyy-MM");
    const monthAppointments = allAppointments.filter((a) => 
      new Date(a.startsAt).toISOString().slice(0, 7) === monthStr
    );
    const completed = monthAppointments.filter((a) => a.status === "completed");
    return {
      totalCortes: monthAppointments.length,
      totalCompletados: completed.length,
      totalGanhos: completed.reduce((acc, a) => acc + a.price, 0),
    };
  }, [allAppointments]);

  // Chart configs
  const revenueChartConfig: ChartConfig = {
    ganhos: { label: "Ganhos", color: "hsl(var(--brand-green))" },
  };

  const cutsChartConfig: ChartConfig = {
    cortes: { label: "Cortes", color: "hsl(var(--primary))" },
  };

  const upcoming1h = React.useMemo(() => {
    const now = Date.now();
    const in1h = now + 60 * 60 * 1000;
    return todayAppointments
      .filter((a) => a.status === "pending" || a.status === "confirmed")
      .filter((a) => {
        const t = new Date(a.startsAt).getTime();
        return t >= now && t <= in1h;
      }).length;
  }, [todayAppointments]);

  const metrics: Metric[] = [
    {
      title: "Agendamentos Hoje",
      value: String(todayAppointments.length),
      sub: "Agendamentos Hoje",
      toneTop: "border-t-primary",
      icon: <CalendarDays className="h-12 w-12 text-primary" aria-hidden />,
      delta: appointmentsDelta,
    },
    {
      title: "Planos Pendentes",
      value: String(pendingPlans),
      sub: "Planos Pendentes",
      toneTop: "border-t-brand-green",
      icon: <Shield className="h-12 w-12 text-brand-green" aria-hidden />,
      link: { label: "Aprovar Agora →", href: "/admin/planos" },
    },
    {
      title: "Encomendas Novas",
      value: String(newOrders),
      sub: "Encomendas Novas",
      toneTop: "border-t-destructive",
      icon: <Package className="h-12 w-12 text-destructive" aria-hidden />,
      link: { label: "Gerenciar →", href: "/admin/encomendas" },
    },
    {
      title: "Faturamento Hoje",
      value: formatBRL(revenueToday),
      sub: "Faturamento Hoje",
      toneTop: "border-t-brand-green",
      icon: <DollarSign className="h-12 w-12 text-brand-green" aria-hidden />,
      delta: revenueDelta,
    },
  ];

  const notifications = React.useMemo(() => {
    const list: Array<{ tone: "danger" | "warn" | "ok"; text: string; cta?: { label: string; href: string } }>
      = [];
    if (pendingPlans > 0) list.push({ tone: "danger", text: `🔴 ${pendingPlans} planos aguardando aprovação`, cta: { label: "Aprovar Agora", href: "/admin/planos" } });
    if (newOrders > 0) list.push({ tone: "warn", text: `🟡 ${newOrders} encomendas novas`, cta: { label: "Gerenciar", href: "/admin/encomendas" } });
    if (upcoming1h > 0) list.push({ tone: "ok", text: `🟢 ${upcoming1h} agendamentos daqui a 1 hora`, cta: { label: "Ver Agenda", href: "/admin/agendamentos" } });
    return list;
  }, [newOrders, pendingPlans, upcoming1h]);

  const timeline = React.useMemo(() => {
    // Janela 09:00–18:00
    const start = new Date(today);
    start.setHours(9, 0, 0, 0);
    const end = new Date(today);
    end.setHours(18, 0, 0, 0);

    const sorted = [...todayAppointments]
      .filter((a) => {
        const d = parseISO(a.startsAt);
        return isSameDay(d, startOfDay(today));
      })
      .sort((a, b) => parseISO(a.startsAt).getTime() - parseISO(b.startsAt).getTime());

    const items: Array<
      | { kind: "free"; from: Date; to: Date }
      | { kind: "apt"; apt: Appointment }
    > = [];

    let cursor = start;
    for (const apt of sorted) {
      const s = parseISO(apt.startsAt);
      const e = slotEnd(apt);
      if (s > cursor) items.push({ kind: "free", from: cursor, to: s });
      items.push({ kind: "apt", apt });
      cursor = e > cursor ? e : cursor;
    }
    if (cursor < end) items.push({ kind: "free", from: cursor, to: end });
    return items;
  }, [today, todayAppointments]);

  const openComplete = (apt: Appointment) => {
    setSelected(apt);
    setCompleteOpen(true);
  };

  const openAbsent = (apt: Appointment) => {
    setSelected(apt);
    setObservation("");
    setAbsentOpen(true);
  };

  const onConfirmComplete = async () => {
    if (!selected) return;
    setMutating(true);
    try {
      await markAsCompleted({ id: selected.id });
      toast({ title: "Agendamento concluído", description: "Marcado como concluído." });
      setCompleteOpen(false);
      setSelected(null);
      await load();
    } catch {
      toast({ title: "Erro ao concluir", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setMutating(false);
    }
  };

  const onConfirmAbsent = async () => {
    if (!selected) return;
    setMutating(true);
    try {
      const result = await markAsAbsent({ id: selected.id, observation: observation.trim() || undefined });
      toast({ 
        title: "Falta registrada", 
        description: result ? "Cliente marcado como falta e conta suspensa automaticamente." : "Cliente marcado como falta."
      });
      setAbsentOpen(false);
      setSelected(null);
      await load();
    } catch {
      toast({ title: "Erro ao marcar falta", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setMutating(false);
    }
  };

  // Funções de configuração
  const onToggleDayOpen = async (day: WeekDay, isOpen: boolean) => {
    if (!shopConfig) return;
    setSavingConfig(true);
    try {
      const updated = await updateDaySchedule(day, { isOpen });
      setShopConfig(updated);
      toast({ title: "Configuração salva", description: `${WEEKDAY_LABELS[day]} ${isOpen ? "aberto" : "fechado"}` });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSavingConfig(false);
    }
  };

  const onUpdateDayTime = async (day: WeekDay, field: "openTime" | "closeTime", value: string) => {
    if (!shopConfig) return;
    setSavingConfig(true);
    try {
      const updated = await updateDaySchedule(day, { [field]: value });
      setShopConfig(updated);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSavingConfig(false);
    }
  };

  const onOpenSpecialDay = (date: Date) => {
    setSelectedDate(date);
    setSpecialDayMode("close");
    setSpecialOpenTime("09:00");
    setSpecialCloseTime("18:00");
    setSpecialReason("");
    setSpecialDayOpen(true);
  };

  const onSaveSpecialDay = async () => {
    if (!selectedDate) return;
    setSavingConfig(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const special: SpecialDay = {
        date: dateStr,
        isClosed: specialDayMode === "close",
        openTime: specialDayMode === "custom" ? specialOpenTime : undefined,
        closeTime: specialDayMode === "custom" ? specialCloseTime : undefined,
        reason: specialReason.trim() || undefined,
      };
      const updated = await setSpecialDay(special);
      setShopConfig(updated);
      toast({ 
        title: specialDayMode === "close" ? "Dia fechado" : "Horário especial salvo",
        description: format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
      });
      setSpecialDayOpen(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSavingConfig(false);
    }
  };

  const onRemoveSpecialDay = async (date: string) => {
    setSavingConfig(true);
    try {
      const updated = await removeSpecialDay(date);
      setShopConfig(updated);
      toast({ title: "Dia removido", description: "Voltou ao horário normal" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      setSavingConfig(false);
    }
  };

  const dayLabel = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8">
      {/* HERO */}
      <section className="bg-background px-4 pb-8 pt-4 sm:pb-12 sm:pt-6 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl md:text-5xl"
          >
            🛠️ PAINEL
          </motion.h1>
          <p className="mt-3 text-sm text-foreground sm:text-base md:text-lg">Olá, Admin! Hoje é {dayLabel}</p>
        </div>
      </section>

      {/* METRICS */}
      <section className="bg-background px-4 py-16 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-4 sm:p-6 md:p-8 shadow-card">
                  <Skeleton className="h-12 w-12" />
                  <Skeleton className="mt-6 h-10 w-2/3" />
                  <Skeleton className="mt-4 h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((m, idx) => (
                <motion.div
                  key={m.title}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.28, delay: reduce ? 0 : idx * 0.04 }}
                >
                  <div className={"rounded-lg border border-border bg-card p-4 sm:p-6 md:p-8 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border-t-4 " + m.toneTop}>
                    {m.icon}
                    <div className="mt-4 sm:mt-6">
                      <p className="text-3xl sm:text-4xl font-extrabold text-foreground">{m.value}</p>
                      <p className="mt-2 text-xs sm:text-sm font-semibold text-foreground">{m.sub}</p>
                    </div>
                    <div className="mt-4">
                      {m.delta ? (
                        <p className={
                          "inline-flex items-center gap-2 text-xs font-bold " +
                          (m.delta.type === "up" ? "text-brand-green" : m.delta.type === "down" ? "text-destructive" : "text-muted-foreground")
                        }>
                          {m.delta.type === "up" ? <TrendingUp className="h-4 w-4" aria-hidden /> : null}
                          {m.delta.type === "down" ? <TrendingDown className="h-4 w-4" aria-hidden /> : null}
                          {m.delta.text}
                        </p>
                      ) : m.link ? (
                        <button
                          type="button"
                          onClick={() => navigate(m.link!.href)}
                          className="text-xs font-extrabold text-primary underline-offset-4 hover:underline"
                        >
                          {m.link.label}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* GRÁFICOS MENSAIS */}
      <section className="bg-background px-4 py-16 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl border-t border-border pt-16">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">📊 RELATÓRIO MENSAL - {format(new Date(), "MMMM yyyy", { locale: ptBR }).toUpperCase()}</h2>
          
          {/* Resumo do mês */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-3 sm:p-4 shadow-card">
              <p className="text-xs sm:text-sm text-muted-foreground">Total de Cortes</p>
              <p className="mt-1 text-xl sm:text-2xl font-extrabold text-primary">{monthlyTotals.totalCortes}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 sm:p-4 shadow-card">
              <p className="text-xs sm:text-sm text-muted-foreground">Cortes Concluídos</p>
              <p className="mt-1 text-xl sm:text-2xl font-extrabold text-brand-green">{monthlyTotals.totalCompletados}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 sm:p-4 shadow-card">
              <p className="text-xs sm:text-sm text-muted-foreground">Faturamento do Mês</p>
              <p className="mt-1 text-xl sm:text-2xl font-extrabold text-brand-green">{formatBRL(monthlyTotals.totalGanhos)}</p>
            </div>
          </div>

          {loading ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-[300px]" />
              <Skeleton className="h-[300px]" />
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {/* Gráfico de Ganhos */}
              <div className="rounded-lg border border-border bg-card p-4 sm:p-6 shadow-card">
                <h3 className="text-sm sm:text-lg font-extrabold text-foreground">💰 Ganhos Diários</h3>
                <ChartContainer config={revenueChartConfig} className="mt-4 h-[200px] sm:h-[250px] w-full">
                  <AreaChart data={monthlyChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillGanhos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--brand-green))" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(var(--brand-green))" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent labelKey="fullDate" />}
                      formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Ganhos"]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="ganhos" 
                      stroke="hsl(var(--brand-green))" 
                      fill="url(#fillGanhos)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>

              {/* Gráfico de Cortes */}
              <div className="rounded-lg border border-border bg-card p-4 sm:p-6 shadow-card">
                <h3 className="text-sm sm:text-lg font-extrabold text-foreground">✂️ Cortes Diários</h3>
                <ChartContainer config={cutsChartConfig} className="mt-4 h-[200px] sm:h-[250px] w-full">
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent labelKey="fullDate" />}
                      formatter={(value) => [value, "Cortes"]}
                    />
                    <Bar 
                      dataKey="cortes" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* NOTIFICATIONS */}
      <section className="bg-background px-4 py-16 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl border-t border-border pt-16">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">🔔 NOTIFICAÇÕES</h2>
          <div className="mt-6 space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            ) : notifications.length === 0 ? (
              <div className="rounded-lg border border-brand-green bg-brand-green/10 p-4 sm:p-6 text-center">
                <p className="text-xs sm:text-sm font-extrabold text-brand-green">✅ Tudo em ordem!</p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Nenhuma ação pendente</p>
              </div>
            ) : (
              notifications.map((n, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => (n.cta ? navigate(n.cta.href) : undefined)}
                  className={
                    "w-full rounded-lg border border-border bg-card p-3 sm:p-5 text-left shadow-card transition-colors hover:bg-accent " +
                    (n.tone === "danger" ? "border-l-4 border-l-destructive" : n.tone === "warn" ? "border-l-4 border-l-primary" : "border-l-4 border-l-brand-green")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">{n.text}</p>
                    {n.cta ? <span className="text-xs font-extrabold text-primary">[{n.cta.label}]</span> : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      {/* AGENDA */}
      <section className="bg-background px-4 py-20 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl border-t border-border pt-16">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">📅 AGENDA DE HOJE - {format(new Date(), "dd/MM/yyyy")}</h2>
            <Button variant="outline" onClick={load} disabled={loading} className="w-full sm:w-auto">Atualizar</Button>
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : todayAppointments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-6 sm:p-10 text-center shadow-card">
                <p className="text-xs sm:text-sm font-extrabold text-foreground">📅 Nenhum agendamento para hoje</p>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground">Aproveite para organizar!</p>
              </div>
            ) : (
              <div className="relative pl-4 sm:pl-6 overflow-x-auto">
                <div className="absolute left-[9px] sm:left-[11px] top-0 h-full w-[2px] bg-primary" aria-hidden />

                <div className="space-y-6 min-w-[320px]">
                  {timeline.map((t, idx) => {
                    if (t.kind === "free") {
                      const from = format(t.from, "HH:mm");
                      const to = format(t.to, "HH:mm");
                      return (
                        <div key={`free-${idx}`} className="flex items-start gap-4">
                          <div className="relative mt-1">
                            <div className="h-3 w-3 rounded-full bg-primary" aria-hidden />
                          </div>
                          <div className="w-full">
                            <p className="text-xs sm:text-sm font-semibold text-muted-foreground">{from} - {to}</p>
                            <div className="mt-3 rounded-lg border border-border bg-transparent p-3 sm:p-5 text-center">
                              <p className="text-xs sm:text-sm italic text-muted-foreground">⏸️ LIVRE</p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const apt = t.apt;
                    const user = getUserById(apt.userId);
                    const name = user?.name ?? `Cliente (${apt.userId.slice(0, 6)})`;
                    const phone = user?.phoneNumber ?? "";
                    const start = format(parseISO(apt.startsAt), "HH:mm");
                    const end = format(slotEnd(apt), "HH:mm");
                    const status = apt.status;
                    const isDone = status === "completed";
                    const isAbsent = status === "no_show";

                    return (
                      <div key={apt.id} className="flex items-start gap-4">
                        <div className="relative mt-1">
                          <div className="h-3 w-3 rounded-full bg-primary" aria-hidden />
                        </div>
                        <div className="w-full">
                          <p className="text-xs sm:text-sm font-semibold text-muted-foreground">{start} - {end}</p>
                          <div className="mt-3 rounded-lg border border-border bg-card p-3 sm:p-4 md:p-5 shadow-card">
                            <div className="flex flex-col gap-4">
                              <div>
                                <p className="text-sm sm:text-base font-extrabold text-foreground">{name}</p>
                                {phone ? (
                                  <a className="mt-1 block text-xs sm:text-sm text-muted-foreground underline-offset-4 hover:underline" href={`tel:${phone}`}>
                                    {phone}
                                  </a>
                                ) : (
                                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Telefone não cadastrado</p>
                                )}

                                <p className="mt-3 text-xs sm:text-sm font-semibold text-foreground">{apt.serviceName}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{apt.durationMinutes}min • {formatBRL(apt.price)}</p>
                              </div>

                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Button
                                  variant="outline"
                                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  disabled={isAbsent || status === "canceled"}
                                  onClick={() => openAbsent(apt)}
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <XCircle className="h-4 w-4" /> Falta
                                  </span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* RESUMO */}
                <div className="mt-10 rounded-lg border border-primary bg-card p-4 sm:p-6 shadow-card">
                  <p className="text-sm sm:text-base font-extrabold text-primary">📊 RESUMO DO DIA</p>
                  <ul className="mt-4 space-y-2 text-xs sm:text-sm text-foreground">
                    <li>• {todayAppointments.length} agendamentos</li>
                    <li>• {todayAppointments.reduce((acc, a) => acc + a.durationMinutes, 0)} min ocupados</li>
                    <li>• Faturamento estimado: {formatBRL(revenueToday)}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="bg-background px-4 py-20 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl border-t border-border pt-16">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">⚡ ACESSO RÁPIDO</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-6">
            {[
              { icon: <CalendarDays className="h-10 sm:h-12 w-10 sm:w-12 text-primary" aria-hidden />, title: "GERENCIAR\nAGENDAMENTOS", href: "/admin/agendamentos" },
              { icon: <Shield className="h-10 sm:h-12 w-10 sm:w-12 text-brand-green" aria-hidden />, title: "APROVAR\nPLANOS", href: "/admin/planos" },
              { icon: <Package className="h-10 sm:h-12 w-10 sm:w-12 text-destructive" aria-hidden />, title: "GERENCIAR\nENCOMENDAS", href: "/admin/encomendas" },
              { icon: <Users className="h-10 sm:h-12 w-10 sm:w-12 text-primary" aria-hidden />, title: "CLIENTES", href: "/admin/clientes" },
            ].map((a) => (
              <button
                key={a.href}
                type="button"
                onClick={() => navigate(a.href)}
                className="rounded-lg border border-border bg-card p-4 sm:p-6 md:p-8 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary"
              >
                <div className="mx-auto w-fit">{a.icon}</div>
                <p className="mt-3 sm:mt-5 whitespace-pre-line text-xs sm:text-sm font-extrabold tracking-wide text-foreground">{a.title}</p>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="rounded-lg border border-border bg-card p-4 sm:p-6 md:p-8 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary"
            >
              <div className="mx-auto w-fit"><Image className="h-10 sm:h-12 w-10 sm:w-12 text-primary" aria-hidden /></div>
              <p className="mt-3 sm:mt-5 whitespace-pre-line text-xs sm:text-sm font-extrabold tracking-wide text-foreground">{"GERENCIAR\nGALERIA"}</p>
            </button>
            <button
              type="button"
              onClick={() => setConfigOpen(true)}
              className="rounded-lg border border-border bg-card p-4 sm:p-6 md:p-8 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary"
            >
              <div className="mx-auto w-fit"><Settings className="h-10 sm:h-12 w-10 sm:w-12 text-muted-foreground" aria-hidden /></div>
              <p className="mt-3 sm:mt-5 whitespace-pre-line text-xs sm:text-sm font-extrabold tracking-wide text-foreground">{"CONFIGURAR\nHORÁRIOS"}</p>
            </button>
          </div>
        </div>
      </section>

      {/* CONFIGURAÇÕES DA BARBEARIA */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[95vh] w-[95vw] sm:w-full overflow-y-auto border-2 border-primary bg-card p-4 sm:p-6 md:p-8">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl md:text-2xl font-extrabold text-primary">⚙️ CONFIGURAÇÕES DA BARBEARIA</DialogTitle>
          </DialogHeader>

          {shopConfig && (
            <div className="space-y-8">
              {/* Horário Semanal */}
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-foreground">📅 Horário Semanal</h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Configure os dias e horários de funcionamento</p>
                
                <div className="mt-4 space-y-3">
                  {shopConfig.weekSchedule.map((day) => (
                    <div key={day.day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg border border-border bg-background p-3 sm:p-4">
                      <div className="w-full sm:w-28 flex sm:block items-center justify-between">
                        <p className="text-sm font-extrabold text-foreground">{WEEKDAY_LABELS[day.day]}</p>
                        <div className="sm:hidden">
                          <Switch
                            checked={day.isOpen}
                            onCheckedChange={(checked) => onToggleDayOpen(day.day, checked)}
                            disabled={savingConfig}
                          />
                        </div>
                      </div>
                      <div className="hidden sm:block">
                        <Switch
                          checked={day.isOpen}
                          onCheckedChange={(checked) => onToggleDayOpen(day.day, checked)}
                          disabled={savingConfig}
                        />
                      </div>
                      {day.isOpen ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                          <Input
                            type="time"
                            value={day.openTime}
                            onChange={(e) => onUpdateDayTime(day.day, "openTime", e.target.value)}
                            className="w-full sm:w-28"
                            disabled={savingConfig}
                          />
                          <span className="text-sm text-muted-foreground text-center sm:text-left">às</span>
                          <Input
                            type="time"
                            value={day.closeTime}
                            onChange={(e) => onUpdateDayTime(day.day, "closeTime", e.target.value)}
                            className="w-full sm:w-28"
                            disabled={savingConfig}
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Fechado</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dias Especiais */}
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-foreground">🚫 Dias Especiais / Fechar Dia</h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Feche dias específicos ou configure horários especiais</p>
                
                <div className="mt-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <CalendarOff className="mr-2 h-4 w-4" />
                        Adicionar Dia Especial
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && onOpenSpecialDay(date)}
                        disabled={(date) => date < new Date()}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Lista de dias especiais */}
                {shopConfig.specialDays.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {shopConfig.specialDays.map((special) => (
                      <div key={special.date} className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                        <div>
                          <p className="text-sm font-extrabold text-foreground">
                            {format(parseISO(special.date), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {special.isClosed 
                              ? `Fechado${special.reason ? ` - ${special.reason}` : ""}`
                              : `Horário especial: ${special.openTime} - ${special.closeTime}${special.reason ? ` (${special.reason})` : ""}`
                            }
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveSpecialDay(special.date)}
                          disabled={savingConfig}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              FECHAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL GERENCIAR GALERIA */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] w-[95vw] sm:w-full overflow-y-auto border-2 border-primary bg-card p-4 sm:p-6 md:p-8">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl md:text-2xl font-extrabold text-primary">📷 GERENCIAR GALERIA</DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Adicione fotos à galeria organizadas por categoria • 
              Total: {Object.values(galleryImages).flat().length} fotos
            </p>
          </DialogHeader>

          <Tabs value={galleryCategory} onValueChange={(v) => setGalleryCategory(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="Cortes" className="text-xs sm:text-sm">
                ✂️ Cortes ({galleryImages.Cortes.length})
              </TabsTrigger>
              <TabsTrigger value="Luzes" className="text-xs sm:text-sm">
                ✨ Luzes ({galleryImages.Luzes.length})
              </TabsTrigger>
              <TabsTrigger value="Quimica" className="text-xs sm:text-sm">
                🧪 Química ({galleryImages.Quimica.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={galleryCategory} className="space-y-6">
              {/* Aviso se Supabase não estiver configurado */}
              {!isSupabaseReady && (
                <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4">
                  <p className="text-sm font-extrabold text-destructive mb-2">⚠️ SUPABASE NÃO CONFIGURADO</p>
                  <p className="text-xs text-muted-foreground">
                    Para gerenciar a galeria, configure o Supabase:
                  </p>
                  <ol className="text-xs text-muted-foreground mt-2 space-y-1 ml-4 list-decimal">
                    <li>Crie uma conta grátis em <a href="https://supabase.com" target="_blank" rel="noopener" className="text-primary underline">supabase.com</a></li>
                    <li>Crie um novo projeto</li>
                    <li>Execute o SQL em <code className="text-primary">supabase-setup.sql</code></li>
                    <li>Copie as chaves para o arquivo <code className="text-primary">.env</code></li>
                  </ol>
                </div>
              )}

              {/* Área de Upload */}
              <div className="rounded-lg border-2 border-dashed border-primary bg-primary/5 p-6 sm:p-8 text-center">
                <Input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  onChange={(e) => handleUploadPhotos(e.target.files)}
                  className="hidden"
                  id="gallery-upload"
                  disabled={uploadingPhoto}
                />
                <label
                  htmlFor="gallery-upload"
                  className={`cursor-pointer flex flex-col items-center gap-4 ${uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploadingPhoto ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-extrabold text-primary">Enviando...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-primary" />
                      <div>
                        <p className="text-sm font-extrabold text-foreground">
                          Clique para adicionar fotos
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG ou WEBP • Máximo 5MB por foto
                        </p>
                      </div>
                    </>
                  )}
                </label>
              </div>

              {/* Preview de Fotos */}
              <div>
                <h3 className="text-sm font-extrabold text-foreground mb-4">
                  📁 Fotos em {galleryCategory} ({currentCategoryImages.length})
                  {loadingGallery && <span className="ml-2 text-xs text-muted-foreground animate-pulse">Carregando...</span>}
                </h3>
                {currentCategoryImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {currentCategoryImages.map((img, idx) => {
                      const fileName = img.filename || 'Sem nome';
                      return (
                        <div key={img.id || idx} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                          <img
                            src={img.url}
                            alt={fileName}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 p-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openMovePhoto(img)}
                              className="w-full max-w-[140px]"
                              disabled={!isSupabaseReady}
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Mover
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemovePhoto(img)}
                              className="w-full max-w-[140px]"
                              disabled={!isSupabaseReady}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Deletar
                            </Button>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <p className="text-[10px] text-white truncate" title={fileName}>
                              {fileName}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-background p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma foto encontrada nesta categoria
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Adicione fotos manualmente em: <code className="text-primary">src/assets/Galeria/{galleryCategory}</code>
                    </p>
                  </div>
                )}
              </div>

              {/* Instruções */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs font-extrabold text-primary mb-2">💡 COMO GERENCIAR AS FOTOS:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Adicionar:</strong> Clique no botão de upload acima - máx 5MB, formatos JPG/PNG/WEBP</li>
                  <li>• <strong>Remover:</strong> Clique em "Remover" na foto - será deletada permanentemente do Supabase</li>
                  <li>• <strong>Mover:</strong> Clique em "Mover" para trocar a categoria da foto (Cortes ↔ Luzes ↔ Química)</li>
                  <li>• <strong>Storage:</strong> Arquivos salvos no Supabase Storage (bucket gallery)</li>
                  <li>• <strong>Backup:</strong> Fotos ficam no cloud, acessíveis de qualquer dispositivo</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setGalleryOpen(false)}>
              FECHAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL MOVER FOTO */}
      <Dialog open={movePhotoOpen} onOpenChange={setMovePhotoOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full border-2 border-primary bg-card p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-extrabold text-primary">📦 MOVER FOTO</DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Escolha a categoria de destino
            </p>
          </DialogHeader>

          {selectedPhoto && (
            <div className="space-y-4">
              {/* Preview da foto */}
              <div className="rounded-lg border border-border overflow-hidden">
                <img
                  src={selectedPhoto.url}
                  alt="Preview"
                  className="w-full h-48 object-cover"
                />
                <div className="p-3 bg-background">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {selectedPhoto.filename}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Categoria atual: <span className="font-semibold">{selectedPhoto.category}</span>
                  </p>
                </div>
              </div>

              {/* Seletor de categoria */}
              <div className="space-y-3">
                <Label className="text-sm font-extrabold">Mover para:</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Cortes", "Luzes", "Quimica"] as const)
                    .filter(cat => cat !== selectedPhoto.category)
                    .map((cat) => (
                      <Button
                        key={cat}
                        variant={targetCategory === cat ? "default" : "outline"}
                        onClick={() => setTargetCategory(cat)}
                        className="h-auto py-3 flex flex-col gap-1"
                        disabled={!isSupabaseReady}
                      >
                        <span className="text-lg">
                          {cat === "Cortes" ? "✂️" : cat === "Luzes" ? "✨" : "🧪"}
                        </span>
                        <span className="text-xs">{cat}</span>
                      </Button>
                    ))}
                </div>
              </div>

              {/* Alerta de instrução */}
              <div className="rounded-lg border border-brand-green/30 bg-brand-green/5 p-3">
                <p className="text-xs text-muted-foreground">
                  ✅ <strong>A foto será movida:</strong> O arquivo será copiado para a nova categoria e o registro atualizado no banco de dados
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setMovePhotoOpen(false);
                setSelectedPhoto(null);
                setTargetCategory('Cortes');
              }}
              className="w-full sm:w-auto"
            >
              CANCELAR
            </Button>
            <Button 
              variant="default"
              onClick={handleMovePhoto}
              className="w-full sm:w-auto"
              disabled={!isSupabaseReady || !targetCategory || (selectedPhoto && targetCategory === selectedPhoto.category)}
            >
              CONFIRMAR MUDANÇA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DIA ESPECIAL */}
      <Dialog open={specialDayOpen} onOpenChange={setSpecialDayOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full border-2 border-destructive bg-card p-4 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-destructive">
              📅 {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant={specialDayMode === "close" ? "destructive" : "outline"}
                className="flex-1"
                onClick={() => setSpecialDayMode("close")}
              >
                Fechar Dia
              </Button>
              <Button
                variant={specialDayMode === "custom" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setSpecialDayMode("custom")}
              >
                Horário Especial
              </Button>
            </div>

            {specialDayMode === "custom" && (
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2">
                <div className="flex-1 w-full">
                  <Label className="text-xs">Abertura</Label>
                  <Input
                    type="time"
                    value={specialOpenTime}
                    onChange={(e) => setSpecialOpenTime(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex-1 w-full">
                  <Label className="text-xs">Fechamento</Label>
                  <Input
                    type="time"
                    value={specialCloseTime}
                    onChange={(e) => setSpecialCloseTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">Motivo (opcional)</Label>
              <Input
                placeholder="Ex: Feriado, Compromisso pessoal..."
                value={specialReason}
                onChange={(e) => setSpecialReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setSpecialDayOpen(false)} disabled={savingConfig}>
              CANCELAR
            </Button>
            <Button variant="destructive" onClick={onSaveSpecialDay} disabled={savingConfig}>
              {savingConfig ? "SALVANDO..." : "CONFIRMAR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CONCLUIR */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full border-2 border-brand-green bg-card p-4 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-brand-green">✅ CONCLUIR AGENDAMENTO</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-xs sm:text-sm text-foreground">
              <p>
                <span className="font-extrabold">Cliente:</span> {getUserById(selected.userId)?.name ?? selected.userId}
              </p>
              <p>
                <span className="font-extrabold">Serviço:</span> {selected.serviceName}
              </p>
              <p>
                <span className="font-extrabold">Horário:</span> {format(parseISO(selected.startsAt), "HH:mm")} - {format(slotEnd(selected), "HH:mm")}
              </p>
              <p>
                <span className="font-extrabold">Valor:</span> {formatBRL(selected.price)}
              </p>
              <div className="rounded-lg border border-border bg-background p-3 sm:p-4">
                <p className="text-xs sm:text-sm font-semibold">Confirmar que o serviço foi realizado?</p>
              </div>
            </div>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setCompleteOpen(false)} disabled={mutating} className="w-full sm:w-auto">
              CANCELAR
            </Button>
            <Button variant="success" onClick={onConfirmComplete} disabled={mutating} className="w-full sm:w-auto">
              {mutating ? "SALVANDO..." : "SIM, CONCLUIR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL FALTA */}
      <Dialog open={absentOpen} onOpenChange={setAbsentOpen}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full border-2 border-destructive bg-card p-4 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-destructive">⚠️ MARCAR FALTA</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-xs sm:text-sm text-foreground">
              <div className="rounded-lg border border-border bg-background p-3 sm:p-4">
                <p>
                  <span className="font-extrabold">Cliente:</span> {getUserById(selected.userId)?.name ?? selected.userId}
                </p>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-extrabold text-foreground">Serviço:</span> {selected.serviceName}
                </p>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-extrabold text-foreground">Horário:</span> {format(parseISO(selected.startsAt), "HH:mm")} - {format(slotEnd(selected), "HH:mm")}
                </p>
              </div>

              <div className="rounded-lg border border-destructive bg-destructive/10 p-3 sm:p-4">
                <p className="text-xs sm:text-sm font-extrabold text-destructive">⚠️ ATENÇÃO:</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>• O cliente será SUSPENSO automaticamente (placeholder)</li>
                  <li>• Não poderá fazer novos agendamentos (placeholder)</li>
                  <li>• Apenas você pode liberar (placeholder)</li>
                </ul>
              </div>

              <div>
                <label className="text-xs font-extrabold tracking-[0.16em] text-muted-foreground">OBSERVAÇÃO (OPCIONAL)</label>
                <textarea
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={3}
                  placeholder="Ex: Cliente não atendeu ligações"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setAbsentOpen(false)} disabled={mutating} className="w-full sm:w-auto">
              CANCELAR
            </Button>
            <Button variant="destructive" onClick={onConfirmAbsent} disabled={mutating} className="w-full sm:w-auto">
              {mutating ? "SALVANDO..." : "CONFIRMAR FALTA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
