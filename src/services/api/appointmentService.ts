import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { isDayOpen, getDayHours } from "./shopConfigService";

export type AppointmentStatus = "pending" | "confirmed" | "canceled" | "completed" | "no_show";

export type Appointment = {
  id: string;
  userId: string;
  startsAt: string; // ISO
  durationMinutes: number;
  serviceName: string;
  price: number;
  status: AppointmentStatus;
  // Para "Agendar novamente" (backward compatible com itens antigos)
  serviceType?: "avulso" | "duplo" | "triplo";
  serviceId?: string;
  // Se foi agendado usando o plano
  isPlanBooking?: boolean;
};

export type AvailableSlotsRequest = {
  date: string; // yyyy-MM-dd (local)
  duration: number; // minutes
};

export type AvailableSlotsResponse = {
  date: string; // yyyy-MM-dd
  slots: string[]; // ISO strings
};

export type CreateAppointmentInput = {
  userId: string;
  serviceType: "avulso" | "duplo" | "triplo";
  serviceId: string;
  serviceName: string;
  totalPrice: number;
  totalDuration: number;
  dateTime: string; // ISO
  isPlanBooking?: boolean;
};

const userIdSchema = z.string().trim().min(1).max(120);
const appointmentIdSchema = z.string().trim().min(1).max(120);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeISOSchema = z.string().datetime();

// =============================================================================
// HELPER: Conversão de snake_case do DB para camelCase do TypeScript
// =============================================================================

function mapAppointmentFromDB(row: any): Appointment {
  return {
    id: row.id,
    userId: row.user_id,
    startsAt: row.starts_at,
    durationMinutes: row.duration_minutes,
    serviceName: row.service_name,
    price: parseFloat(row.price),
    status: row.status,
    serviceType: row.service_type,
    serviceId: row.service_id,
    isPlanBooking: row.is_plan_booking || false,
  };
}

// =============================================================================
// AUTO-COMPLETE: Marca agendamentos expirados como completos
// =============================================================================

/**
 * Atualiza automaticamente os agendamentos para "completed" quando o horário já passou.
 * Considera o agendamento como concluído quando o horário de término (startsAt + durationMinutes) já passou.
 */
async function autoCompleteExpiredAppointments(): Promise<void> {
  const now = new Date().toISOString();

  // Busca agendamentos pendentes ou confirmados que já passaram
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .in("status", ["pending", "confirmed"])
    .lt("starts_at", now);

  if (error || !data || data.length === 0) return;

  // Filtra os que realmente já terminaram (starts_at + duration já passou)
  const nowTimestamp = Date.now();
  const toComplete = data.filter((appt) => {
    const endTime = new Date(appt.starts_at).getTime() + appt.duration_minutes * 60_000;
    return endTime < nowTimestamp;
  });

  if (toComplete.length === 0) return;

  // Atualiza todos de uma vez
  const ids = toComplete.map((a) => a.id);
  await supabase
    .from("appointments")
    .update({ status: "completed" })
    .in("id", ids);
}

// =============================================================================
// GET: Buscar agendamentos
// =============================================================================

/**
 * Busca o próximo agendamento do usuário (pendente ou confirmado, futuro)
 */
export async function getNextAppointmentByUser(userId: string): Promise<Appointment | null> {
  userIdSchema.parse(userId);

  // Autocompleta agendamentos expirados
  await autoCompleteExpiredAppointments();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", now)
    .order("starts_at", { ascending: true })
    .limit(1);

  if (error) {
    console.error("[getNextAppointmentByUser] Error:", error);
    return null;
  }

  return data && data.length > 0 ? mapAppointmentFromDB(data[0]) : null;
}

/**
 * Busca todos os agendamentos do usuário
 */
export async function getMyAppointments(userId: string): Promise<Appointment[]> {
  userIdSchema.parse(userId);

  // Validação: verifica se userId é UUID válido
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    console.error('[getMyAppointments] Invalid UUID:', userId, '- User needs to logout and login again');
    return [];
  }

  // Autocompleta agendamentos expirados
  await autoCompleteExpiredAppointments();

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", userId)
    .order("starts_at", { ascending: false });

  if (error) {
    console.error("[getMyAppointments] Error:", error);
    return [];
  }

  return (data || []).map(mapAppointmentFromDB);
}

/**
 * Busca todos os agendamentos de uma data específica
 */
export async function getAllAppointmentsByDate(args: { date: string }): Promise<Appointment[]> {
  dateSchema.parse(args.date);

  // Autocompleta agendamentos expirados
  await autoCompleteExpiredAppointments();

  // Busca agendamentos cuja starts_at esteja no dia especificado
  const startOfDay = `${args.date}T00:00:00.000Z`;
  const endOfDay = `${args.date}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .gte("starts_at", startOfDay)
    .lte("starts_at", endOfDay)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("[getAllAppointmentsByDate] Error:", error);
    return [];
  }

  return (data || []).map(mapAppointmentFromDB);
}

/**
 * Retorna todos os agendamentos (para gráficos e relatórios)
 */
export async function getAllAppointments(): Promise<Appointment[]> {
  // Autocompleta expirados
  await autoCompleteExpiredAppointments();

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("[getAllAppointments] Error:", error);
    return [];
  }

  return (data || []).map(mapAppointmentFromDB);
}

// =============================================================================
// UPDATE: Atualizar status de agendamentos
// =============================================================================

/**
 * Cancela um agendamento do usuário
 */
export async function cancelAppointment(args: { id: string; userId: string }): Promise<void> {
  appointmentIdSchema.parse(args.id);
  userIdSchema.parse(args.userId);

  const { error } = await supabase
    .from("appointments")
    .update({ status: "canceled" })
    .eq("id", args.id)
    .eq("user_id", args.userId);

  if (error) {
    console.error("[cancelAppointment] Error:", error);
    throw new Error("Erro ao cancelar agendamento");
  }
}

/**
 * Marca um agendamento como completo
 */
export async function markAsCompleted(args: { id: string }): Promise<void> {
  appointmentIdSchema.parse(args.id);

  const { error } = await supabase
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", args.id);

  if (error) {
    console.error("[markAsCompleted] Error:", error);
    throw new Error("Erro ao marcar como completo");
  }
}

/**
 * Marca um agendamento como ausente (no_show) e suspende o cliente
 */
export async function markAsAbsent(args: { id: string; observation?: string }): Promise<{ userId: string } | null> {
  appointmentIdSchema.parse(args.id);
  z.string().max(240).optional().parse(args.observation);

  // Busca o agendamento para pegar o user_id
  const { data: appt, error: fetchError } = await supabase
    .from("appointments")
    .select("user_id")
    .eq("id", args.id)
    .single();

  if (fetchError || !appt) {
    console.error("[markAsAbsent] Error:", fetchError);
    return null;
  }

  // Marca como no_show
  const { error } = await supabase
    .from("appointments")
    .update({ status: "no_show" })
    .eq("id", args.id);

  if (error) {
    console.error("[markAsAbsent] Error:", error);
    throw new Error("Erro ao marcar ausência");
  }

  // Suspende o cliente
  await supabase
    .from("users")
    .update({ suspended: true })
    .eq("id", appt.user_id);

  return { userId: appt.user_id };
}

// =============================================================================
// AVAILABLE SLOTS: Horários disponíveis
// =============================================================================

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISO(date: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map((v) => Number(v));
  const dt = new Date(date);
  dt.setHours(h, m, 0, 0);
  return dt.toISOString();
}

/**
 * Retorna os horários disponíveis para agendamento em uma data específica
 */
export async function getAvailableSlots(req: AvailableSlotsRequest): Promise<AvailableSlotsResponse> {
  dateSchema.parse(req.date);
  z.number().int().min(10).max(8 * 60).parse(req.duration);

  const [y, mo, d] = req.date.split("-").map((v) => Number(v));
  const base = new Date(y, mo - 1, d);

  // Verifica se a barbearia está aberta neste dia
  const dayStatus = isDayOpen(base);
  if (!dayStatus.isOpen) {
    return { date: req.date, slots: [] };
  }

  // Pega os horários de funcionamento do dia
  const hours = getDayHours(base);
  if (!hours) {
    return { date: req.date, slots: [] };
  }

  const times: string[] = [];
  const pushRange = (startH: number, startM: number, endH: number, endM: number) => {
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;
    for (let t = start; t <= end - req.duration; t += 30) {
      const hh = Math.floor(t / 60);
      const mm = t % 60;
      times.push(`${pad2(hh)}:${pad2(mm)}`);
    }
  };

  // Parse horários de abertura e fechamento
  const [openH, openM] = hours.openTime.split(":").map(Number);
  const [closeH, closeM] = hours.closeTime.split(":").map(Number);

  // Gera slots respeitando horário de almoço (12:00-13:00) se aplicável
  if (closeH <= 12) {
    // Fecha antes do almoço
    pushRange(openH, openM, closeH, closeM);
  } else if (openH >= 13) {
    // Abre depois do almoço
    pushRange(openH, openM, closeH, closeM);
  } else {
    // Horário normal com pausa de almoço
    pushRange(openH, openM, 12, 0);
    pushRange(13, 0, closeH, closeM);
  }

  // Buscar agendamentos existentes para esta data do Supabase
  const startOfDay = `${req.date}T00:00:00.000Z`;
  const endOfDay = `${req.date}T23:59:59.999Z`;

  const { data: dateAppointments } = await supabase
    .from("appointments")
    .select("starts_at, status")
    .gte("starts_at", startOfDay)
    .lte("starts_at", endOfDay)
    .neq("status", "canceled");

  // Criar set de horários já ocupados
  const bookedSlots = new Set<string>();
  (dateAppointments || []).forEach((apt) => {
    const startTime = new Date(apt.starts_at);
    const hh = pad2(startTime.getHours());
    const mm = pad2(startTime.getMinutes());
    bookedSlots.add(`${hh}:${mm}`);
  });

  // Filtrar horários que já passaram (apenas para hoje)
  const now = new Date();
  const isToday = base.toDateString() === now.toDateString();

  const availableTimes = times.filter((t) => {
    // Verificar se o horário já está ocupado
    if (bookedSlots.has(t)) return false;

    // Se é hoje, remover horários que já passaram
    if (isToday) {
      const [hh, mm] = t.split(":").map(Number);
      const slotTime = new Date(now);
      slotTime.setHours(hh, mm, 0, 0);
      // Adiciona uma margem de 15 minutos
      if (slotTime.getTime() <= now.getTime() + 15 * 60 * 1000) {
        return false;
      }
    }

    return true;
  });

  const slots = availableTimes.map((t) => toISO(base, t));

  return { date: req.date, slots };
}

// =============================================================================
// CREATE: Criar novo agendamento
// =============================================================================

/**
 * Cria um novo agendamento
 */
export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  userIdSchema.parse(input.userId);
  z.enum(["avulso", "duplo", "triplo"]).parse(input.serviceType);
  z.string().min(1).max(240).parse(input.serviceId);
  z.string().min(1).max(240).parse(input.serviceName);
  z.number().min(0).parse(input.totalPrice);
  z.number().int().min(1).max(8 * 60).parse(input.totalDuration);
  timeISOSchema.parse(input.dateTime);

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      user_id: input.userId,
      starts_at: input.dateTime,
      duration_minutes: input.totalDuration,
      service_name: input.serviceName,
      price: input.totalPrice,
      status: "pending",
      service_type: input.serviceType,
      service_id: input.serviceId,
      is_plan_booking: input.isPlanBooking ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error("[createAppointment] Error:", error);
    throw new Error("Erro ao criar agendamento");
  }

  return mapAppointmentFromDB(data);
}
