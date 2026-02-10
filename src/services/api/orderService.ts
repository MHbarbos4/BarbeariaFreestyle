import type { TshirtProduct } from "@/services/api/productService";
import { supabase } from "@/lib/supabase";

export type OrderStatus = "pending" | "confirmed" | "ready" | "delivered";

export type TshirtOrder = {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  productId: number;
  productName: string;
  productImage: string;
  size: "P" | "M" | "G" | "GG";
  color: string;
  status: OrderStatus;
  createdAt: string; // ISO

  // Admin updates
  deliveryTime?: "7-10 dias úteis" | "10-15 dias úteis" | "15-20 dias úteis";
  observation?: string;
  deliveredAt?: string; // yyyy-MM-dd
  canceledReason?: string;
  canceledObservation?: string;
};

// =============================================================================
// HELPER: Conversão de snake_case do DB para camelCase do TypeScript
// =============================================================================

function mapOrderFromDB(row: any): TshirtOrder {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    productName: row.product_name,
    productImage: row.product_image,
    size: row.size,
    color: row.color,
    status: row.status,
    createdAt: row.created_at,
    deliveryTime: row.delivery_time || undefined,
    observation: row.observation || undefined,
    deliveredAt: row.delivered_at || undefined,
    canceledReason: row.canceled_reason || undefined,
    canceledObservation: row.canceled_observation || undefined,
  };
}

// =============================================================================
// GET: Buscar pedidos
// =============================================================================

/**
 * Retorna todos os pedidos de um usuário
 */
export async function getTshirtOrdersByUser(userId: string): Promise<TshirtOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getTshirtOrdersByUser] Error:", error);
    return [];
  }

  // Enriquecer com dados do usuário (userName e userPhone) via join manual
  const orders = (data || []).map(mapOrderFromDB);

  // Busca dados do usuário para preencher userName e userPhone
  if (orders.length > 0) {
    const { data: user } = await supabase
      .from("users")
      .select("id, name, phone_number")
      .eq("id", userId)
      .single();

    if (user) {
      orders.forEach((o) => {
        o.userName = user.name;
        o.userPhone = user.phone_number;
      });
    }
  }

  return orders;
}

/**
 * Retorna todos os pedidos (para admin)
 */
export async function getAllTshirtOrders(): Promise<TshirtOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAllTshirtOrders] Error:", error);
    return [];
  }

  const orders = (data || []).map(mapOrderFromDB);

  // Busca dados dos usuários para preencher userName e userPhone
  if (orders.length > 0) {
    const userIds = [...new Set(orders.map((o) => o.userId))];
    const { data: users } = await supabase
      .from("users")
      .select("id, name, phone_number")
      .in("id", userIds);

    if (users) {
      const userMap = new Map(users.map((u) => [u.id, u]));
      orders.forEach((o) => {
        const user = userMap.get(o.userId);
        if (user) {
          o.userName = user.name;
          o.userPhone = user.phone_number;
        }
      });
    }
  }

  return orders;
}

// =============================================================================
// CREATE: Criar novo pedido
// =============================================================================

/**
 * Cria um novo pedido de camiseta
 */
export async function createTshirtOrder(args: {
  userId: string;
  product: TshirtProduct;
  size: TshirtOrder["size"];
  color: string;
}): Promise<TshirtOrder> {
  // Busca dados do usuário
  const { data: user } = await supabase
    .from("users")
    .select("name, phone_number")
    .eq("id", args.userId)
    .single();

  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: args.userId,
      product_id: args.product.id,
      product_name: args.product.name,
      product_image: args.product.image,
      size: args.size,
      color: args.color,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("[createTshirtOrder] Error:", error);
    throw new Error("Erro ao criar pedido");
  }

  const order = mapOrderFromDB(data);
  if (user) {
    order.userName = user.name;
    order.userPhone = user.phone_number;
  }

  return order;
}

// =============================================================================
// UPDATE: Atualizar status e dados do pedido
// =============================================================================

/**
 * Confirma um pedido (admin)
 */
export async function confirmTshirtOrder(args: {
  id: string;
  deliveryTime: NonNullable<TshirtOrder["deliveryTime"]>;
  observation?: string;
}): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({
      status: "confirmed",
      delivery_time: args.deliveryTime,
      observation: args.observation?.trim() || null,
    })
    .eq("id", args.id);

  if (error) {
    console.error("[confirmTshirtOrder] Error:", error);
    throw new Error("Erro ao confirmar pedido");
  }
}

/**
 * Marca um pedido como pronto
 */
export async function markTshirtOrderReady(args: { id: string }): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ status: "ready" })
    .eq("id", args.id);

  if (error) {
    console.error("[markTshirtOrderReady] Error:", error);
    throw new Error("Erro ao marcar pedido como pronto");
  }
}

/**
 * Marca um pedido como entregue
 */
export async function markTshirtOrderDelivered(args: { id: string; deliveryDate: string }): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({
      status: "delivered",
      delivered_at: args.deliveryDate,
    })
    .eq("id", args.id);

  if (error) {
    console.error("[markTshirtOrderDelivered] Error:", error);
    throw new Error("Erro ao marcar pedido como entregue");
  }
}

/**
 * Cancela um pedido
 */
export async function cancelTshirtOrder(args: {
  id: string;
  reason: string;
  observation?: string;
}): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({
      status: "pending", // Volta para pending com razão de cancelamento
      canceled_reason: args.reason,
      canceled_observation: args.observation?.trim() || null,
    })
    .eq("id", args.id);

  if (error) {
    console.error("[cancelTshirtOrder] Error:", error);
    throw new Error("Erro ao cancelar pedido");
  }
}
