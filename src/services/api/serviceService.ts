export type ServiceCategory = "cortes" | "acabamentos" | "quimicas" | "luzes";

// Subcategorias para combos
export type ComboSubCategory = 
  | "acabamentos"
  | "corte-barba" 
  | "corte-quimica" 
  | "corte-luzes"
  | "corte-barba-sobrancelha"
  | "corte-quimica-sobrancelha"
  | "corte-luzes-sobrancelha";

export type ServiceItem = {
  id: string;
  name: string;
  price: number;
  minutes: number;
  category: ServiceCategory;
  kind: "avulso";
};

export type ComboType = "duplo" | "triplo";

export type ComboItem = {
  id: string;
  name: string;
  price: number;
  minutes: number;
  type: ComboType;
  category: ServiceCategory;
  subCategory: ComboSubCategory;
  kind: "combo";
};

export type AnyService = ServiceItem | ComboItem;

function delay<T>(value: T, ms = 450) {
  return new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
}

// Mock (hardcoded por enquanto). Depois substituímos por:
// GET /services, /services/combinations?type=duplo, /services/combinations?type=triplo

const AVULSOS: ServiceItem[] = [
  // Cortes
  { id: "barba", name: "Barba", price: 20, minutes: 15, category: "cortes", kind: "avulso" },
  { id: "social", name: "Social", price: 30, minutes: 30, category: "cortes", kind: "avulso" },
  { id: "degrade-navalhado", name: "Degradê Navalhado", price: 35, minutes: 45, category: "cortes", kind: "avulso" },
  { id: "contornado", name: "Contornado", price: 30, minutes: 30, category: "cortes", kind: "avulso" },
  { id: "infantil", name: "Infantil", price: 35, minutes: 30, category: "cortes", kind: "avulso" },
  // Acabamentos
  { id: "sobrancelha", name: "Sobrancelha", price: 8, minutes: 15, category: "acabamentos", kind: "avulso" },
  { id: "pezinho", name: "Pezinho", price: 20, minutes: 15, category: "acabamentos", kind: "avulso" },
  // Químicas
  { id: "pigmentacao", name: "Pigmentação", price: 50, minutes: 15, category: "quimicas", kind: "avulso" },
  { id: "alisamento-hidratacao", name: "Alisamento com Hidratação", price: 45, minutes: 30, category: "quimicas", kind: "avulso" },
  { id: "alisamento-laque", name: "Alisamento com Laque", price: 50, minutes: 30, category: "quimicas", kind: "avulso" },
  // Luzes / Cor
  { id: "luzes-cheia", name: "Luzes Cheia", price: 120, minutes: 60, category: "luzes", kind: "avulso" },
  { id: "luzes-alinhada", name: "Luzes Alinhada", price: 80, minutes: 60, category: "luzes", kind: "avulso" },
  { id: "luzes-parcial", name: "Luzes Parcial", price: 75, minutes: 60, category: "luzes", kind: "avulso" },
  { id: "platinado", name: "Platinado", price: 120, minutes: 60, category: "luzes", kind: "avulso" },
];

const COMBOS_DUPLOS: ComboItem[] = [
  // Acabamentos
  { id: "cb-pezinho-sobrancelha", name: "Pezinho + Sobrancelha", price: 25, minutes: 30, type: "duplo", category: "acabamentos", subCategory: "acabamentos", kind: "combo" },
  // Cortes + Barba / Sobrancelha
  { id: "cb-social-barba", name: "Social + Barba", price: 50, minutes: 45, type: "duplo", category: "cortes", subCategory: "corte-barba", kind: "combo" },
  { id: "cb-social-sobrancelha", name: "Social + Sobrancelha", price: 35, minutes: 45, type: "duplo", category: "cortes", subCategory: "corte-barba", kind: "combo" },
  { id: "cb-degrade-barba", name: "Degradê Navalhado + Barba", price: 55, minutes: 60, type: "duplo", category: "cortes", subCategory: "corte-barba", kind: "combo" },
  { id: "cb-degrade-sobrancelha", name: "Degradê Navalhado + Sobrancelha", price: 40, minutes: 60, type: "duplo", category: "cortes", subCategory: "corte-barba", kind: "combo" },
  { id: "cb-contornado-barba", name: "Contornado + Barba", price: 50, minutes: 45, type: "duplo", category: "cortes", subCategory: "corte-barba", kind: "combo" },
  { id: "cb-contornado-sobrancelha", name: "Contornado + Sobrancelha", price: 35, minutes: 45, type: "duplo", category: "cortes", subCategory: "corte-barba", kind: "combo" },
  { id: "cb-infantil-sobrancelha", name: "Infantil + Sobrancelha", price: 40, minutes: 45, type: "duplo", category: "cortes", subCategory: "corte-barba", kind: "combo" },
  // Cortes + Química
  { id: "cb-degrade-pigmentacao", name: "Degradê Navalhado + Pigmentação", price: 85, minutes: 60, type: "duplo", category: "quimicas", subCategory: "corte-quimica", kind: "combo" },
  { id: "cb-degrade-alisamento-hidratacao", name: "Degradê Navalhado + Alisamento com Hidratação", price: 80, minutes: 75, type: "duplo", category: "quimicas", subCategory: "corte-quimica", kind: "combo" },
  { id: "cb-degrade-alisamento-laque", name: "Degradê Navalhado + Alisamento com Laque", price: 85, minutes: 75, type: "duplo", category: "quimicas", subCategory: "corte-quimica", kind: "combo" },
  { id: "cb-contornado-pigmentacao", name: "Contornado + Pigmentação", price: 80, minutes: 45, type: "duplo", category: "quimicas", subCategory: "corte-quimica", kind: "combo" },
  { id: "cb-contornado-alisamento-hidratacao", name: "Contornado + Alisamento com Hidratação", price: 75, minutes: 60, type: "duplo", category: "quimicas", subCategory: "corte-quimica", kind: "combo" },
  { id: "cb-contornado-alisamento-laque", name: "Contornado + Alisamento com Laque", price: 80, minutes: 60, type: "duplo", category: "quimicas", subCategory: "corte-quimica", kind: "combo" },
  // Cortes + Luzes / Platinado
  { id: "cb-degrade-luzes-cheia", name: "Degradê Navalhado + Luzes Cheia", price: 155, minutes: 105, type: "duplo", category: "luzes", subCategory: "corte-luzes", kind: "combo" },
  { id: "cb-degrade-luzes-alinhada", name: "Degradê Navalhado + Luzes Alinhada", price: 115, minutes: 105, type: "duplo", category: "luzes", subCategory: "corte-luzes", kind: "combo" },
  { id: "cb-degrade-luzes-parcial", name: "Degradê Navalhado + Luzes Parcial", price: 100, minutes: 105, type: "duplo", category: "luzes", subCategory: "corte-luzes", kind: "combo" },
  { id: "cb-degrade-platinado", name: "Degradê Navalhado + Platinado", price: 155, minutes: 105, type: "duplo", category: "luzes", subCategory: "corte-luzes", kind: "combo" },
  { id: "cb-contornado-luzes-cheia", name: "Contornado + Luzes Cheia", price: 150, minutes: 90, type: "duplo", category: "luzes", subCategory: "corte-luzes", kind: "combo" },
  { id: "cb-contornado-luzes-alinhada", name: "Contornado + Luzes Alinhada", price: 110, minutes: 90, type: "duplo", category: "luzes", subCategory: "corte-luzes", kind: "combo" },
  { id: "cb-contornado-luzes-parcial", name: "Contornado + Luzes Parcial", price: 105, minutes: 90, type: "duplo", category: "luzes", subCategory: "corte-luzes", kind: "combo" },
  { id: "cb-contornado-platinado", name: "Contornado + Platinado", price: 150, minutes: 90, type: "duplo", category: "luzes", subCategory: "corte-luzes", kind: "combo" },
];

const COMBOS_TRIPLOS: ComboItem[] = [
  // Cortes + Barba + Sobrancelha
  { id: "ct-social-barba-sobrancelha", name: "Social + Barba + Sobrancelha", price: 55, minutes: 60, type: "triplo", category: "cortes", subCategory: "corte-barba-sobrancelha", kind: "combo" },
  { id: "ct-degrade-barba-sobrancelha", name: "Degradê Navalhado + Barba + Sobrancelha", price: 60, minutes: 75, type: "triplo", category: "cortes", subCategory: "corte-barba-sobrancelha", kind: "combo" },
  { id: "ct-contornado-barba-sobrancelha", name: "Contornado + Barba + Sobrancelha", price: 55, minutes: 60, type: "triplo", category: "cortes", subCategory: "corte-barba-sobrancelha", kind: "combo" },
  // Cortes + Química + Sobrancelha
  { id: "ct-degrade-pigmentacao-sobrancelha", name: "Degradê Navalhado + Pigmentação + Sobrancelha", price: 90, minutes: 75, type: "triplo", category: "quimicas", subCategory: "corte-quimica-sobrancelha", kind: "combo" },
  { id: "ct-degrade-alisamento-hidratacao-sobrancelha", name: "Degradê Navalhado + Alisamento com Hidratação + Sobrancelha", price: 85, minutes: 90, type: "triplo", category: "quimicas", subCategory: "corte-quimica-sobrancelha", kind: "combo" },
  { id: "ct-degrade-alisamento-laque-sobrancelha", name: "Degradê Navalhado + Alisamento com Laque + Sobrancelha", price: 90, minutes: 90, type: "triplo", category: "quimicas", subCategory: "corte-quimica-sobrancelha", kind: "combo" },
  { id: "ct-contornado-pigmentacao-sobrancelha", name: "Contornado + Pigmentação + Sobrancelha", price: 85, minutes: 60, type: "triplo", category: "quimicas", subCategory: "corte-quimica-sobrancelha", kind: "combo" },
  { id: "ct-contornado-alisamento-hidratacao-sobrancelha", name: "Contornado + Alisamento com Hidratação + Sobrancelha", price: 80, minutes: 75, type: "triplo", category: "quimicas", subCategory: "corte-quimica-sobrancelha", kind: "combo" },
  { id: "ct-contornado-alisamento-laque-sobrancelha", name: "Contornado + Alisamento com Laque + Sobrancelha", price: 85, minutes: 75, type: "triplo", category: "quimicas", subCategory: "corte-quimica-sobrancelha", kind: "combo" },
  // Cortes + Luzes / Platinado + Sobrancelha
  { id: "ct-degrade-luzes-cheia-sobrancelha", name: "Degradê Navalhado + Luzes Cheia + Sobrancelha", price: 160, minutes: 120, type: "triplo", category: "luzes", subCategory: "corte-luzes-sobrancelha", kind: "combo" },
  { id: "ct-degrade-luzes-alinhada-sobrancelha", name: "Degradê Navalhado + Luzes Alinhada + Sobrancelha", price: 120, minutes: 120, type: "triplo", category: "luzes", subCategory: "corte-luzes-sobrancelha", kind: "combo" },
  { id: "ct-degrade-luzes-parcial-sobrancelha", name: "Degradê Navalhado + Luzes Parcial + Sobrancelha", price: 105, minutes: 120, type: "triplo", category: "luzes", subCategory: "corte-luzes-sobrancelha", kind: "combo" },
  { id: "ct-degrade-platinado-sobrancelha", name: "Degradê Navalhado + Platinado + Sobrancelha", price: 160, minutes: 120, type: "triplo", category: "luzes", subCategory: "corte-luzes-sobrancelha", kind: "combo" },
  { id: "ct-contornado-luzes-cheia-sobrancelha", name: "Contornado + Luzes Cheia + Sobrancelha", price: 155, minutes: 105, type: "triplo", category: "luzes", subCategory: "corte-luzes-sobrancelha", kind: "combo" },
  { id: "ct-contornado-luzes-alinhada-sobrancelha", name: "Contornado + Luzes Alinhada + Sobrancelha", price: 115, minutes: 105, type: "triplo", category: "luzes", subCategory: "corte-luzes-sobrancelha", kind: "combo" },
  { id: "ct-contornado-luzes-parcial-sobrancelha", name: "Contornado + Luzes Parcial + Sobrancelha", price: 110, minutes: 105, type: "triplo", category: "luzes", subCategory: "corte-luzes-sobrancelha", kind: "combo" },
  { id: "ct-contornado-platinado-sobrancelha", name: "Contornado + Platinado + Sobrancelha", price: 155, minutes: 105, type: "triplo", category: "luzes", subCategory: "corte-luzes-sobrancelha", kind: "combo" },
];

export async function getServices() {
  return delay(AVULSOS);
}

export async function getServiceCombinations(type: ComboType) {
  return delay(type === "duplo" ? COMBOS_DUPLOS : COMBOS_TRIPLOS);
}
