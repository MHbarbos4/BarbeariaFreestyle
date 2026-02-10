import { z } from "zod";
import { supabase } from "@/lib/supabase";

export type PlanType = "club-corte" | "club-combo" | "club-vip" | "custom";
export type PlanStatus = "pending" | "approved" | "rejected" | "deactivated";
export type DayCode = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";

// Definição dos planos fixos
export const FIXED_PLANS = {
  "club-corte": {
    id: "club-corte",
    name: "Club Corte",
    price: 120,
    description: "Cortes ilimitados para manter o estilo sempre em dia",
    features: [
      "Cortes ilimitados",
      "Agendamento Seg a Qui",
      "Prioridade normal",
    ],
    includes: {
      unlimitedCuts: true,
      unlimitedBeard: false,
      eyebrowIncluded: false,
      allowedDays: ["seg", "ter", "qua", "qui"] as DayCode[],
      priority: "normal" as const,
      productDiscount: 0,
      fixedSchedule: false,
    },
  },
  "club-combo": {
    id: "club-combo",
    name: "Club Combo",
    price: 180,
    description: "Cortes + Barba ilimitados para o visual completo",
    features: [
      "Cortes ilimitados",
      "Barba ilimitada",
      "Agendamento Seg a Sex",
      "5% desconto em produtos",
      "Prioridade média",
    ],
    includes: {
      unlimitedCuts: true,
      unlimitedBeard: true,
      eyebrowIncluded: false,
      allowedDays: ["seg", "ter", "qua", "qui", "sex"] as DayCode[],
      priority: "medium" as const,
      productDiscount: 5,
      fixedSchedule: false,
    },
  },
  "club-vip": {
    id: "club-vip",
    name: "Club VIP",
    price: 230,
    description: "O pacote completo com exclusividade total",
    features: [
      "Cortes ilimitados",
      "Barba ilimitada",
      "Sobrancelha grátis",
      "Todos os dias (incluindo Sábado)",
      "Horário fixo semanal",
      "10% desconto em produtos",
      "Prioridade máxima",
    ],
    includes: {
      unlimitedCuts: true,
      unlimitedBeard: true,
      eyebrowIncluded: true,
      allowedDays: ["seg", "ter", "qua", "qui", "sex", "sab"] as DayCode[],
      priority: "max" as const,
      productDiscount: 10,
      fixedSchedule: true,
    },
  },
};

// Opções para montar plano personalizado
export const CUSTOM_PLAN_OPTIONS = {
  base: { price: 80, label: "Base (4 cortes/mês)", included: true },
  services: {
    unlimitedCuts: { price: 50, label: "Cortes ilimitados" },
    unlimitedBeard: { price: 40, label: "Barba ilimitada" },
    eyebrowIncluded: { price: 15, label: "Sobrancelha incluída" },
  },
  days: {
    friday: { price: 15, label: "Adicionar Sexta-feira" },
    saturday: { price: 25, label: "Adicionar Sábado" },
  },
  benefits: {
    priorityMedium: { price: 10, label: "Prioridade média" },
    priorityMax: { price: 20, label: "Prioridade máxima" },
    fixedSchedule: { price: 25, label: "Horário fixo semanal" },
    discount5: { price: 10, label: "5% desconto em produtos" },
    discount10: { price: 20, label: "10% desconto em produtos" },
  },
} as const;

export type CustomPlanSelection = {
  unlimitedCuts: boolean;
  unlimitedBeard: boolean;
  eyebrowIncluded: boolean;
  addFriday: boolean;
  addSaturday: boolean;
  priority: "normal" | "medium" | "max";
  productDiscount: 0 | 5 | 10;
  fixedSchedule: boolean;
};

export function calculateCustomPlanPrice(selection: CustomPlanSelection): number {
  let price = CUSTOM_PLAN_OPTIONS.base.price;

  if (selection.unlimitedCuts) price += CUSTOM_PLAN_OPTIONS.services.unlimitedCuts.price;
  if (selection.unlimitedBeard) price += CUSTOM_PLAN_OPTIONS.services.unlimitedBeard.price;
  if (selection.eyebrowIncluded) price += CUSTOM_PLAN_OPTIONS.services.eyebrowIncluded.price;
  if (selection.addFriday) price += CUSTOM_PLAN_OPTIONS.days.friday.price;
  if (selection.addSaturday) price += CUSTOM_PLAN_OPTIONS.days.saturday.price;
  if (selection.priority === "medium") price += CUSTOM_PLAN_OPTIONS.benefits.priorityMedium.price;
  if (selection.priority === "max") price += CUSTOM_PLAN_OPTIONS.benefits.priorityMax.price;
  if (selection.fixedSchedule) price += CUSTOM_PLAN_OPTIONS.benefits.fixedSchedule.price;
  if (selection.productDiscount === 5) price += CUSTOM_PLAN_OPTIONS.benefits.discount5.price;
  if (selection.productDiscount === 10) price += CUSTOM_PLAN_OPTIONS.benefits.discount10.price;

  return price;
}

export type PlanRecommendation = {
  planId: keyof typeof FIXED_PLANS;
  planName: string;
  planPrice: number;
  difference: number;
  extraBenefits: string[];
} | null;

/**
 * Verifica se um plano fixo ATENDE todos os requisitos selecionados pelo cliente.
 * O plano deve cobrir tudo que o cliente quer, não pode faltar nada.
 */
function planMeetsRequirements(
  plan: typeof FIXED_PLANS[keyof typeof FIXED_PLANS],
  selection: CustomPlanSelection
): boolean {
  // Se cliente quer cortes ilimitados, plano precisa ter
  if (selection.unlimitedCuts && !plan.includes.unlimitedCuts) return false;
  
  // Se cliente quer barba ilimitada, plano precisa ter
  if (selection.unlimitedBeard && !plan.includes.unlimitedBeard) return false;
  
  // Se cliente quer sobrancelha, plano precisa ter
  if (selection.eyebrowIncluded && !plan.includes.eyebrowIncluded) return false;
  
  // Se cliente quer sexta-feira, plano precisa incluir sexta
  if (selection.addFriday && !plan.includes.allowedDays.includes("sex")) return false;
  
  // Se cliente quer sábado, plano precisa incluir sábado
  if (selection.addSaturday && !plan.includes.allowedDays.includes("sab")) return false;
  
  // Se cliente quer horário fixo, plano precisa ter
  if (selection.fixedSchedule && !plan.includes.fixedSchedule) return false;
  
  // Se cliente quer desconto X%, plano precisa ter pelo menos X%
  if (selection.productDiscount > plan.includes.productDiscount) return false;
  
  // Se cliente quer prioridade média ou máxima, verifica
  if (selection.priority === "medium" && plan.includes.priority === "normal") return false;
  if (selection.priority === "max" && plan.includes.priority !== "max") return false;
  
  return true;
}

/**
 * Lista os benefícios EXTRAS que o plano fixo oferece além do que o cliente selecionou.
 */
function getExtraBenefits(
  plan: typeof FIXED_PLANS[keyof typeof FIXED_PLANS],
  selection: CustomPlanSelection
): string[] {
  const extras: string[] = [];
  
  if (plan.includes.unlimitedCuts && !selection.unlimitedCuts) {
    extras.push("Cortes ilimitados");
  }
  if (plan.includes.unlimitedBeard && !selection.unlimitedBeard) {
    extras.push("Barba ilimitada");
  }
  if (plan.includes.eyebrowIncluded && !selection.eyebrowIncluded) {
    extras.push("Sobrancelha grátis");
  }
  if (plan.includes.fixedSchedule && !selection.fixedSchedule) {
    extras.push("Horário fixo semanal");
  }
  if (plan.includes.productDiscount > selection.productDiscount) {
    extras.push(`${plan.includes.productDiscount}% desconto em produtos`);
  }
  if (plan.includes.allowedDays.includes("sab") && !selection.addSaturday) {
    extras.push("Sábado liberado");
  }
  if (plan.includes.allowedDays.includes("sex") && !selection.addFriday) {
    extras.push("Sexta-feira liberada");
  }
  if (plan.includes.priority === "max" && selection.priority !== "max") {
    extras.push("Prioridade máxima");
  } else if (plan.includes.priority === "medium" && selection.priority === "normal") {
    extras.push("Prioridade média");
  }
  
  return extras;
}

export function getRecommendation(customPrice: number, selection: CustomPlanSelection): PlanRecommendation {
  const plans = Object.values(FIXED_PLANS);
  
  // Primeiro: encontrar planos que ATENDEM os requisitos do cliente
  const compatiblePlans = plans.filter(plan => planMeetsRequirements(plan, selection));
  
  // Se não há planos compatíveis, não recomenda nada
  if (compatiblePlans.length === 0) return null;
  
  // Ordena por preço (mais barato primeiro)
  compatiblePlans.sort((a, b) => a.price - b.price);
  
  // Encontra o melhor plano para recomendar
  for (const plan of compatiblePlans) {
    const diff = plan.price - customPrice;
    const extraBenefits = getExtraBenefits(plan, selection);
    
    // Caso 1: Plano fixo custa MENOS ou igual - ótima recomendação!
    if (diff <= 0) {
      const benefitsList = [...extraBenefits];
      if (diff < 0) {
        benefitsList.unshift(`Economize R$ ${Math.abs(diff)}!`);
      }
      
      return {
        planId: plan.id as keyof typeof FIXED_PLANS,
        planName: plan.name,
        planPrice: plan.price,
        difference: diff,
        extraBenefits: benefitsList.length > 0 ? benefitsList : ["Mesmo preço, mais praticidade!"],
      };
    }
    
    // Caso 2: Plano fixo custa até R$ 40 a mais E oferece benefícios extras
    if (diff > 0 && diff <= 40 && extraBenefits.length > 0) {
      return {
        planId: plan.id as keyof typeof FIXED_PLANS,
        planName: plan.name,
        planPrice: plan.price,
        difference: diff,
        extraBenefits,
      };
    }
  }
  
  return null;
}

// ============ HELPERS PARA AGENDAMENTO ============

/**
 * Mapeia dia da semana (0=Dom, 1=Seg, ..., 6=Sáb) para o código usado nos planos
 */
const DAY_MAP: Record<number, string> = {
  0: "dom", // Domingo
  1: "seg",
  2: "ter",
  3: "qua",
  4: "qui",
  5: "sex",
  6: "sab",
};

/**
 * Retorna os dias permitidos para um plano
 * @param planType Tipo do plano
 * @param planIncludes Detalhes do plano (para customizados)
 */
export function getAllowedDaysForPlan(planType: PlanType | null, planIncludes?: PlanIncludes | null): string[] {
  if (!planType) return []; // Sem plano = não é assinante
  
  // Se tem includes do plano salvo, usa eles
  if (planIncludes?.allowedDays) {
    return [...planIncludes.allowedDays];
  }
  
  // Fallback para planos fixos
  if (planType !== "custom") {
    const plan = FIXED_PLANS[planType as keyof typeof FIXED_PLANS];
    return plan ? [...plan.includes.allowedDays] : [];
  }
  
  // Customizado sem includes: padrão Seg-Qui
  return ["seg", "ter", "qua", "qui"];
}

/**
 * Verifica se um dia específico é permitido para agendamento de plano
 * @param date Data a verificar
 * @param planType Tipo do plano do usuário
 * @param planIncludes Detalhes do plano (para customizados)
 * @returns true se o dia é permitido, false caso contrário
 */
export function isDayAllowedForPlan(date: Date, planType: PlanType | null, planIncludes?: PlanIncludes | null): boolean {
  if (!planType) return true; // Sem plano = cliente normal, qualquer dia
  
  const dayOfWeek = date.getDay();
  const dayCode = DAY_MAP[dayOfWeek];
  
  // Domingo sempre fechado
  if (dayCode === "dom") return false;
  
  const allowedDays = getAllowedDaysForPlan(planType, planIncludes);
  return allowedDays.includes(dayCode);
}

/**
 * Retorna a prioridade do plano (para ordenação de horários)
 * 0 = normal, 1 = média, 2 = máxima
 * @param planType Tipo do plano
 * @param planIncludes Detalhes do plano (para customizados)
 */
export function getPlanPriority(planType: PlanType | null, planIncludes?: PlanIncludes | null): number {
  if (!planType) return 0;
  
  // Se tem includes do plano salvo, usa a prioridade deles
  if (planIncludes?.priority) {
    switch (planIncludes.priority) {
      case "max": return 2;
      case "medium": return 1;
      default: return 0;
    }
  }
  
  // Fallback para planos fixos
  if (planType !== "custom") {
    const plan = FIXED_PLANS[planType as keyof typeof FIXED_PLANS];
    if (!plan) return 0;
    
    switch (plan.includes.priority) {
      case "max": return 2;
      case "medium": return 1;
      default: return 0;
    }
  }
  
  // Customizado sem includes: prioridade normal
  return 0;
}

/**
 * Retorna os horários "premium" que só assinantes com prioridade podem ver primeiro
 * Assinantes com prioridade máxima veem horários de pico (9h, 10h, 14h, 15h)
 * Assinantes com prioridade média veem alguns horários de pico
 */
export function getPrioritySlots(priority: number): { earlyAccess: string[], reserved: string[] } {
  if (priority >= 2) {
    // Prioridade máxima: acesso antecipado aos melhores horários
    return {
      earlyAccess: ["09:00", "09:30", "10:00", "14:00", "14:30", "15:00"],
      reserved: ["10:00", "15:00"], // Horários reservados exclusivamente
    };
  }
  if (priority >= 1) {
    // Prioridade média: acesso a alguns horários bons
    return {
      earlyAccess: ["09:30", "10:00", "14:30", "15:00"],
      reserved: [],
    };
  }
  // Sem prioridade
  return { earlyAccess: [], reserved: [] };
}

/**
 * Retorna label amigável para a prioridade
 */
export function getPriorityLabel(planType: PlanType | null, planIncludes?: PlanIncludes | null): string {
  const priority = getPlanPriority(planType, planIncludes);
  switch (priority) {
    case 2: return "Prioridade Máxima";
    case 1: return "Prioridade Média";
    default: return "Normal";
  }
}

/**
 * Retorna label amigável para os dias permitidos
 */
export function getAllowedDaysLabel(planType: PlanType | null, planIncludes?: PlanIncludes | null): string {
  if (!planType) return "Todos os dias";
  
  const allowedDays = getAllowedDaysForPlan(planType, planIncludes);
  
  const hasSex = allowedDays.includes("sex");
  const hasSab = allowedDays.includes("sab");
  
  // Segunda a Sábado (todos os dias úteis + sábado)
  if (hasSex && hasSab) return "Segunda a Sábado";
  
  // Segunda a Sexta (sem sábado)
  if (hasSex && !hasSab) return "Segunda a Sexta";
  
  // Segunda a Quinta + Sábado (sem sexta, com sábado)
  if (!hasSex && hasSab) return "Segunda a Quinta + Sábado";
  
  // Segunda a Quinta (padrão)
  if (allowedDays.length === 4 && allowedDays.includes("qui")) return "Segunda a Quinta";
  
  return allowedDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ");
}

/**
 * Calcula o período de validade do plano (mês vigente baseado no approvedAt)
 * O plano é válido do dia 1 ao último dia do mês corrente a partir da data de aprovação
 */
export function getPlanValidPeriod(plan: Plan): { start: Date; end: Date } | null {
  if (!plan.approvedAt) return null;
  
  const now = new Date();
  const approvedDate = new Date(plan.approvedAt);
  
  // O plano é válido para o mês atual
  // Início: primeiro dia do mês atual
  // Fim: último dia do mês atual
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  return { start, end };
}

/**
 * Verifica se uma data está dentro do período válido do plano
 */
export function isDateWithinPlanPeriod(date: Date, plan: Plan): boolean {
  const period = getPlanValidPeriod(plan);
  if (!period) return false;
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate >= period.start && checkDate <= period.end;
}

export type PlanUsage = {
  cuts: { used: number; limit: number | null; remaining: number | null }; // null = ilimitado
  beards: { used: number; limit: number | null; remaining: number | null };
  eyebrows: { used: number; limit: number | null; remaining: number | null };
  canUsePlan: boolean; // true se ainda pode usar o plano
  reason?: string; // Motivo se não pode usar
};

/**
 * Calcula o uso do plano baseado nos agendamentos do mês
 * @param plan O plano do usuário
 * @param appointments Lista de agendamentos do usuário
 */
export function calculatePlanUsage(plan: Plan, appointments: Array<{ 
  startsAt: string; 
  serviceName?: string; 
  serviceId?: string;
  status: string;
  isPlanBooking?: boolean;
}>): PlanUsage {
  const includes = plan.includes;
  const period = getPlanValidPeriod(plan);
  
  if (!includes || !period) {
    return {
      cuts: { used: 0, limit: 4, remaining: 4 },
      beards: { used: 0, limit: 0, remaining: 0 },
      eyebrows: { used: 0, limit: 0, remaining: 0 },
      canUsePlan: true,
    };
  }
  
  // Filtra agendamentos do plano no período atual
  const planAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.startsAt);
    return apt.isPlanBooking && 
           apt.status !== "canceled" &&
           aptDate >= period.start && 
           aptDate <= period.end;
  });
  
  // Conta cortes usados
  const cutsUsed = planAppointments.filter(apt => {
    const name = apt.serviceName?.toLowerCase() ?? "";
    const id = apt.serviceId?.toLowerCase() ?? "";
    return name.includes("social") || 
           name.includes("degradê") || 
           name.includes("degrade") ||
           name.includes("contornado") ||
           name.includes("infantil") ||
           id.includes("social") ||
           id.includes("degrade") ||
           id.includes("contornado") ||
           id.includes("infantil");
  }).length;
  
  // Conta barbas usadas
  const beardsUsed = planAppointments.filter(apt => {
    const name = apt.serviceName?.toLowerCase() ?? "";
    const id = apt.serviceId ?? "";
    return (name === "barba" || id === "barba");
  }).length;
  
  // Conta sobrancelhas usadas
  const eyebrowsUsed = planAppointments.filter(apt => {
    const name = apt.serviceName?.toLowerCase() ?? "";
    const id = apt.serviceId ?? "";
    return (name === "sobrancelha" || id === "sobrancelha");
  }).length;
  
  // Define limites
  const cutsLimit = includes.unlimitedCuts ? null : 4; // Base é 4 cortes/mês
  const beardsLimit = includes.unlimitedBeard ? null : 0; // Sem barba ou ilimitado
  const eyebrowsLimit = includes.eyebrowIncluded ? null : 0; // Sem sobrancelha ou ilimitado
  
  const cutsRemaining = cutsLimit === null ? null : Math.max(0, cutsLimit - cutsUsed);
  const beardsRemaining = beardsLimit === null ? null : Math.max(0, beardsLimit - beardsUsed);
  const eyebrowsRemaining = eyebrowsLimit === null ? null : Math.max(0, eyebrowsLimit - eyebrowsUsed);
  
  // Verifica se pode usar o plano
  let canUsePlan = true;
  let reason: string | undefined;
  
  // Se não tem cortes ilimitados e usou todos os 4
  if (!includes.unlimitedCuts && cutsUsed >= 4) {
    // Verifica se tem barba ou sobrancelha disponível
    const hasBeardAvailable = includes.unlimitedBeard;
    const hasEyebrowAvailable = includes.eyebrowIncluded;
    
    if (!hasBeardAvailable && !hasEyebrowAvailable) {
      canUsePlan = false;
      reason = `Você já usou seus 4 cortes deste mês. Próximo mês você poderá usar novamente!`;
    }
  }
  
  return {
    cuts: { used: cutsUsed, limit: cutsLimit, remaining: cutsRemaining },
    beards: { used: beardsUsed, limit: beardsLimit, remaining: beardsRemaining },
    eyebrows: { used: eyebrowsUsed, limit: eyebrowsLimit, remaining: eyebrowsRemaining },
    canUsePlan,
    reason,
  };
}

/**
 * Back-compat: pedidos antigos (somente pendentes).
 */
export type PlanRequest = {
  id: string;
  userId: string;
  planType: PlanType;
  selectedSchedule: string;
  createdAt: string; // ISO
};

// Detalhes do plano (calculados a partir das seleções)
export type PlanIncludes = {
  unlimitedCuts: boolean;
  unlimitedBeard: boolean;
  eyebrowIncluded: boolean;
  allowedDays: string[];
  priority: "normal" | "medium" | "max";
  productDiscount: number;
  fixedSchedule: boolean;
};

export type Plan = {
  id: string;
  userId: string;
  planType: PlanType;
  selectedSchedule: string;

  status: PlanStatus;
  requestedAt: string; // ISO
  approvedAt?: string | null;
  rejectedAt?: string | null;
  deactivatedAt?: string | null;

  observation?: string | null;
  rejectReason?: string | null;
  rejectObservation?: string | null;
  deactivateReason?: string | null;

  // Detalhes do plano (para planos customizados ou cache dos fixos)
  includes?: PlanIncludes;
  // Seleção original do plano customizado (para recálculo se necessário)
  customSelection?: CustomPlanSelection;
};

export type PlanDetails = Plan & {
  stats?: {
    servicesCount: number;
    missedCount: number;
    lastVisit?: string | null; // yyyy-MM-dd
  };
};

const STORAGE_REQUESTS_KEY = "bf_plan_requests";
const STORAGE_PLANS_KEY = "bf_plans";

const payloadSchema = z.object({
  userId: z.string().trim().min(1).max(120),
  planType: z.enum(["club-corte", "club-combo", "club-vip", "custom"]),
  selectedSchedule: z.string().trim().min(1).max(80),
});

// =============================================================================
// DATABASE HELPERS: Conversão entre DB e App
// =============================================================================

function mapPlanFromDB(row: any): Plan {
  return {
    id: row.id,
    userId: row.user_id,
    planType: row.plan_type,
    selectedSchedule: "", // NÃO ARMAZENADO NO DB (deprecated)
    status: row.status,
    requestedAt: row.created_at,
    approvedAt: row.approved_at || null,
    rejectedAt: null, // NÃO ARMAZENADO (não usado)
    deactivatedAt: null, // NÃO ARMAZENADO (não usado)
    observation: null,
    rejectReason: row.rejection_reason || null,
    rejectObservation: null,
    deactivateReason: null,
    includes: {
      unlimitedCuts: row.unlimited_cuts,
      unlimitedBeard: row.unlimited_beard,
      eyebrowIncluded: row.eyebrow_included,
      allowedDays: row.allowed_days,
      priority: row.priority,
      productDiscount: row.product_discount,
      fixedSchedule: row.fixed_schedule,
    },
    customSelection: row.custom_options || undefined,
  };
}

// =============================================================================
// STORAGE FUNCTIONS (Supabase)
// =============================================================================

async function readAll(): Promise<PlanRequest[]> {
  // Legacy - não mais usado (migrada para readPlans)
  return [];
}

async function writeAll(next: PlanRequest[]): Promise<void> {
  // Legacy - não mais usado
}

async function readPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[readPlans] Error:", error);
    return [];
  }

  return (data || []).map(mapPlanFromDB);
}

async function writePlans(next: Plan[]): Promise<void> {
  // Nota: Esta função não é mais usada diretamente - cada operação (create, approve, reject)
  // agora faz update/insert direto no Supabase
  console.warn("[writePlans] Deprecated - use direct Supabase operations");
}

function migrateLegacyRequestsToPlans() {
  // Não necessário mais - dados já migrados ou virão do Supabase
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Calcula os includes de um plano baseado no tipo e seleção customizada
 */
export function calculatePlanIncludes(planType: PlanType, customSelection?: CustomPlanSelection): PlanIncludes {
  if (planType !== "custom") {
    const fixedPlan = FIXED_PLANS[planType as keyof typeof FIXED_PLANS];
    return {
      unlimitedCuts: fixedPlan.includes.unlimitedCuts,
      unlimitedBeard: fixedPlan.includes.unlimitedBeard,
      eyebrowIncluded: fixedPlan.includes.eyebrowIncluded,
      allowedDays: [...fixedPlan.includes.allowedDays],
      priority: fixedPlan.includes.priority,
      productDiscount: fixedPlan.includes.productDiscount,
      fixedSchedule: fixedPlan.includes.fixedSchedule,
    };
  }
  
  // Plano customizado
  if (!customSelection) {
    // Fallback padrão
    return {
      unlimitedCuts: false,
      unlimitedBeard: false,
      eyebrowIncluded: false,
      allowedDays: ["seg", "ter", "qua", "qui"],
      priority: "normal",
      productDiscount: 0,
      fixedSchedule: false,
    };
  }
  
  const allowedDays = ["seg", "ter", "qua", "qui"];
  if (customSelection.addFriday) allowedDays.push("sex");
  if (customSelection.addSaturday) allowedDays.push("sab");
  
  return {
    unlimitedCuts: customSelection.unlimitedCuts,
    unlimitedBeard: customSelection.unlimitedBeard,
    eyebrowIncluded: customSelection.eyebrowIncluded,
    allowedDays,
    priority: customSelection.priority,
    productDiscount: customSelection.productDiscount,
    fixedSchedule: customSelection.fixedSchedule,
  };
}

export async function createPlanRequest(input: {
  userId: string;
  planType: PlanType;
  selectedSchedule: string;
  customSelection?: CustomPlanSelection;
}): Promise<PlanRequest> {
  const parsed = payloadSchema.parse(input);

  // Calcula os includes do plano ANTES de salvar
  const includes = calculatePlanIncludes(parsed.planType, input.customSelection);

  // Determina o preço
  let price: number;
  if (parsed.planType === "custom" && input.customSelection) {
    price = calculateCustomPlanPrice(input.customSelection);
  } else {
    price = FIXED_PLANS[parsed.planType]?.price || 0;
  }

  // Insere no Supabase
  const { data, error } = await supabase
    .from("plans")
    .insert({
      user_id: parsed.userId,
      plan_type: parsed.planType,
      status: "pending",
      price,
      unlimited_cuts: includes.unlimitedCuts,
      unlimited_beard: includes.unlimitedBeard,
      eyebrow_included: includes.eyebrowIncluded,
      allowed_days: includes.allowedDays,
      priority: includes.priority,
      product_discount: includes.productDiscount,
      fixed_schedule: includes.fixedSchedule,
      custom_options: input.customSelection || null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[createPlanRequest] Error:", error);
    throw new Error("Erro ao criar solicitação de plano");
  }

  return {
    id: data.id,
    userId: data.user_id,
    planType: data.plan_type,
    selectedSchedule: parsed.selectedSchedule,
    createdAt: data.created_at,
  };
}

export async function getAllPlanRequests(): Promise<PlanRequest[]> {
  // Legacy - retorna vazio (migrado para getAllPlans)
  return [];
}

export async function getAllPlans(): Promise<Plan[]> {
  return await readPlans();
}

export async function approvePlan(args: { id: string; observation?: string }): Promise<void> {
  z.string().trim().min(1).parse(args.id);
  z.string().max(500).optional().parse(args.observation);

  const { error } = await supabase
    .from("plans")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", args.id);

  if (error) {
    console.error("[approvePlan] Error:", error);
    throw new Error("Erro ao aprovar plano");
  }
}

export async function rejectPlan(args: { id: string; reason: string; observation?: string }): Promise<void> {
  z.string().trim().min(1).parse(args.id);
  z.string().trim().min(1).max(120).parse(args.reason);
  z.string().max(500).optional().parse(args.observation);

  const { error } = await supabase
    .from("plans")
    .update({
      status: "rejected",
      rejection_reason: args.reason,
    })
    .eq("id", args.id);

  if (error) {
    console.error("[rejectPlan] Error:", error);
    throw new Error("Erro ao rejeitar plano");
  }
}

export async function deactivatePlan(args: { id: string; reason?: string }): Promise<void> {
  z.string().trim().min(1).parse(args.id);
  z.string().max(500).optional().parse(args.reason);

  const { error } = await supabase
    .from("plans")
    .update({ status: "deactivated" })
    .eq("id", args.id);

  if (error) {
    console.error("[deactivatePlan] Error:", error);
    throw new Error("Erro ao desativar plano");
  }
}

export async function getPlanDetails(args: { id: string }): Promise<PlanDetails | null> {
  z.string().trim().min(1).parse(args.id);

  const plans = await readPlans();
  const plan = plans.find((p) => p.id === args.id);
  if (!plan) return null;

  // Placeholder de estatísticas (sem backend real)
  const details: PlanDetails = {
    ...plan,
    stats: {
      servicesCount: plan.status === "approved" ? 8 : 0,
      missedCount: 0,
      lastVisit: plan.status === "approved" ? "2026-02-26" : null,
    },
  };
  return details;
}

export async function getMyPlan(userId: string): Promise<Plan | null> {
  z.string().trim().min(1).parse(userId);

  // Retorna o plano mais recente do usuário (aprovado ou pendente)
  const plans = (await readPlans()).filter((p) => p.userId === userId);

  // Prioriza plano aprovado
  let plan = plans.find((p) => p.status === "approved");
  if (!plan) {
    // Depois pendente
    plan = plans.find((p) => p.status === "pending");
  }
  
  return plan || null;
}

export async function hasActivePlan(userId: string): Promise<boolean> {
  const plan = await getMyPlan(userId);
  return plan?.status === "approved";
}

export async function hasPendingRequest(userId: string): Promise<boolean> {
  const plan = await getMyPlan(userId);
  return plan?.status === "pending";
}
