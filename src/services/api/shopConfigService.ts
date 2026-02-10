/**
 * Serviço de configuração da barbearia
 * Gerencia dias de funcionamento, horários, dias fechados, etc.
 */

import { supabase } from "@/lib/supabase";

export type WeekDay = "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";

export type DayConfig = {
  day: WeekDay;
  isOpen: boolean;
  openTime: string; // HH:mm
  closeTime: string; // HH:mm
};

export type SpecialDay = {
  date: string; // yyyy-MM-dd
  isClosed: boolean;
  openTime?: string; // HH:mm (se não fechado)
  closeTime?: string; // HH:mm (se não fechado)
  reason?: string;
};

export type ShopConfig = {
  shopName: string;
  weekSchedule: DayConfig[];
  specialDays: SpecialDay[];
  slotDurationMinutes: number; // duração padrão dos slots
};

const DEFAULT_WEEK_SCHEDULE: DayConfig[] = [
  { day: "dom", isOpen: false, openTime: "09:00", closeTime: "18:00" },
  { day: "seg", isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { day: "ter", isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { day: "qua", isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { day: "qui", isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { day: "sex", isOpen: true, openTime: "09:00", closeTime: "18:00" },
  { day: "sab", isOpen: true, openTime: "09:00", closeTime: "14:00" },
];

const DEFAULT_CONFIG: ShopConfig = {
  shopName: "Barbearia Freestyle",
  weekSchedule: DEFAULT_WEEK_SCHEDULE,
  specialDays: [],
  slotDurationMinutes: 30,
};

// Cache em memória (para evitar múltiplas leituras)
let cachedConfig: ShopConfig | null = null;

// =============================================================================
// HELPERS: Conversão de DB para app
// =============================================================================

function mapSpecialDayFromDB(row: any): SpecialDay {
  return {
    date: row.date,
    isClosed: row.is_closed,
    openTime: row.open_time || undefined,
    closeTime: row.close_time || undefined,
    reason: row.reason || undefined,
  };
}

// =============================================================================
// GET: Buscar configuração
// =============================================================================

/**
 * Retorna a configuração atual da barbearia
 */
export async function getShopConfig(): Promise<ShopConfig> {
  // Retorna do cache se disponível
  if (cachedConfig) return cachedConfig;

  // Busca shop_config (sempre id=1)
  const { data: configRow, error: configError } = await supabase
    .from("shop_config")
    .select("*")
    .eq("id", 1)
    .single();

  if (configError || !configRow) {
    console.error("[getShopConfig] Error:", configError);
    return DEFAULT_CONFIG;
  }

  // Busca special_days
  const { data: specialDaysRows, error: specialError } = await supabase
    .from("special_days")
    .select("*")
    .order("date");

  if (specialError) {
    console.error("[getShopConfig] Special days error:", specialError);
  }

  const config: ShopConfig = {
    shopName: configRow.shop_name,
    weekSchedule: configRow.week_schedule as DayConfig[],
    specialDays: (specialDaysRows || []).map(mapSpecialDayFromDB),
    slotDurationMinutes: configRow.slot_duration_minutes,
  };

  cachedConfig = config;
  return config;
}

/**
 * Limpa o cache (para forçar reload na próxima consulta)
 */
function clearCache() {
  cachedConfig = null;
}

// =============================================================================
// UPDATE: Atualizar configuração
// =============================================================================

/**
 * Atualiza a configuração da barbearia
 */
export async function updateShopConfig(config: Partial<ShopConfig>): Promise<ShopConfig> {
  const update: any = {};
  if (config.shopName !== undefined) update.shop_name = config.shopName;
  if (config.slotDurationMinutes !== undefined) update.slot_duration_minutes = config.slotDurationMinutes;
  if (config.weekSchedule !== undefined) update.week_schedule = config.weekSchedule;

  const { error } = await supabase
    .from("shop_config")
    .update(update)
    .eq("id", 1);

  if (error) {
    console.error("[updateShopConfig] Error:", error);
    throw new Error("Erro ao atualizar configuração");
  }

  clearCache();
  return await getShopConfig();
}

/**
 * Atualiza o horário de um dia da semana
 */
export async function updateDaySchedule(day: WeekDay, update: Partial<Omit<DayConfig, "day">>): Promise<ShopConfig> {
  const current = await getShopConfig();
  const idx = current.weekSchedule.findIndex((d) => d.day === day);

  if (idx !== -1) {
    current.weekSchedule[idx] = { ...current.weekSchedule[idx], ...update };

    const { error } = await supabase
      .from("shop_config")
      .update({ week_schedule: current.weekSchedule })
      .eq("id", 1);

    if (error) {
      console.error("[updateDaySchedule] Error:", error);
      throw new Error("Erro ao atualizar horário");
    }
  }

  clearCache();
  return await getShopConfig();
}

// =============================================================================
// SPECIAL DAYS: Dias especiais
// =============================================================================

/**
 * Adiciona ou atualiza um dia especial (fechado ou com horário diferente)
 */
export async function setSpecialDay(specialDay: SpecialDay): Promise<ShopConfig> {
  const { error } = await supabase
    .from("special_days")
    .upsert({
      date: specialDay.date,
      is_closed: specialDay.isClosed,
      open_time: specialDay.openTime || null,
      close_time: specialDay.closeTime || null,
      reason: specialDay.reason || null,
    }, { onConflict: "date" });

  if (error) {
    console.error("[setSpecialDay] Error:", error);
    throw new Error("Erro ao definir dia especial");
  }

  clearCache();
  return await getShopConfig();
}

/**
 * Remove um dia especial (volta ao horário normal)
 */
export async function removeSpecialDay(date: string): Promise<ShopConfig> {
  const { error } = await supabase
    .from("special_days")
    .delete()
    .eq("date", date);

  if (error) {
    console.error("[removeSpecialDay] Error:", error);
    throw new Error("Erro ao remover dia especial");
  }

  clearCache();
  return await getShopConfig();
}

// =============================================================================
// HELPERS: Verificações de horário
// =============================================================================

/**
 * Verifica se um dia específico está aberto
 * Considera dias especiais e horário semanal padrão
 */
export function isDayOpen(date: Date): { isOpen: boolean; openTime?: string; closeTime?: string; reason?: string } {
  // Nota: Esta função é síncrona e usa o cache. Certifique-se de chamar getShopConfig() antes.
  if (!cachedConfig) {
    // Fallback: usa configuração padrão se não houver cache
    console.warn("[isDayOpen] No cached config, using defaults");
    const dateStr = date.toISOString().split("T")[0];
    const dayIndex = date.getDay();
    const dayMap: WeekDay[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
    const weekDay = dayMap[dayIndex];
    const dayConfig = DEFAULT_WEEK_SCHEDULE.find((d) => d.day === weekDay);

    if (!dayConfig || !dayConfig.isOpen) {
      return { isOpen: false, reason: "Não abrimos neste dia" };
    }

    return { isOpen: true, openTime: dayConfig.openTime, closeTime: dayConfig.closeTime };
  }

  const dateStr = date.toISOString().split("T")[0];

  // Verifica se é um dia especial
  const special = cachedConfig.specialDays.find((s) => s.date === dateStr);
  if (special) {
    if (special.isClosed) {
      return { isOpen: false, reason: special.reason ?? "Dia fechado" };
    }
    return { isOpen: true, openTime: special.openTime, closeTime: special.closeTime };
  }

  // Verifica o dia da semana
  const dayIndex = date.getDay();
  const dayMap: WeekDay[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  const weekDay = dayMap[dayIndex];
  const dayConfig = cachedConfig.weekSchedule.find((d) => d.day === weekDay);

  if (!dayConfig || !dayConfig.isOpen) {
    return { isOpen: false, reason: "Não abrimos neste dia" };
  }

  return { isOpen: true, openTime: dayConfig.openTime, closeTime: dayConfig.closeTime };
}

/**
 * Retorna os horários de funcionamento de um dia
 */
export function getDayHours(date: Date): { openTime: string; closeTime: string } | null {
  const result = isDayOpen(date);
  if (!result.isOpen) return null;
  return { openTime: result.openTime ?? "09:00", closeTime: result.closeTime ?? "18:00" };
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Helper para mapear dia da semana para label
 */
export const WEEKDAY_LABELS: Record<WeekDay, string> = {
  dom: "Domingo",
  seg: "Segunda-feira",
  ter: "Terça-feira",
  qua: "Quarta-feira",
  qui: "Quinta-feira",
  sex: "Sexta-feira",
  sab: "Sábado",
};

/**
 * Helper para mapear dia da semana para label curto
 */
export const WEEKDAY_SHORT: Record<WeekDay, string> = {
  dom: "Dom",
  seg: "Seg",
  ter: "Ter",
  qua: "Qua",
  qui: "Qui",
  sex: "Sex",
  sab: "Sáb",
};
