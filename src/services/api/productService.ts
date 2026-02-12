import { supabase } from "@/lib/supabase";

export type TshirtProduct = {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: "camiseta";
  isActive: boolean;
};

export type ShopProduct = {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  category: "produto";
  subcategory: "cabelo" | "barba" | "bebida" | "comida";
  isActive: boolean;
};

export type Product = TshirtProduct | ShopProduct;

// =============================================================================
// HELPER: Conversão de snake_case do DB para camelCase do TypeScript
// =============================================================================

function mapProductFromDB(row: any): Product {
  const base = {
    id: row.id,
    name: row.name,
    description: row.description || "",
    price: parseFloat(row.price),
    image: row.image || "",
    category: row.category,
    isActive: row.is_active,
  };

  if (row.category === "camiseta") {
    return base as TshirtProduct;
  } else {
    return {
      ...base,
      stock: row.stock || 0,
      subcategory: row.subcategory,
    } as ShopProduct;
  }
}

// =============================================================================
// TSHIRT PRODUCTS (Camisetas)
// =============================================================================

/**
 * Retorna camisetas ativas (para público)
 */
export async function getTshirts(): Promise<TshirtProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category", "camiseta")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("[getTshirts] Error:", error);
    return [];
  }

  return (data || []).map(mapProductFromDB) as TshirtProduct[];
}

/**
 * Retorna todas as camisetas (incluindo inativas, para admin)
 */
export async function getAllTshirts(): Promise<TshirtProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category", "camiseta")
    .order("name");

  if (error) {
    console.error("[getAllTshirts] Error:", error);
    return [];
  }

  return (data || []).map(mapProductFromDB) as TshirtProduct[];
}

/**
 * Cria uma nova camiseta
 */
export async function createTshirt(
  input: Omit<TshirtProduct, "id" | "category" | "isActive">
): Promise<TshirtProduct> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name,
      description: input.description,
      price: input.price,
      image: input.image,
      category: "camiseta",
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("[createTshirt] Error:", error);
    throw new Error("Erro ao criar camiseta");
  }

  return mapProductFromDB(data) as TshirtProduct;
}

/**
 * Atualiza uma camiseta existente
 */
export async function updateTshirt(args: {
  id: number;
  patch: Partial<Omit<TshirtProduct, "id" | "category">>;
}): Promise<void> {
  const update: any = {};
  if (args.patch.name !== undefined) update.name = args.patch.name;
  if (args.patch.description !== undefined) update.description = args.patch.description;
  if (args.patch.price !== undefined) update.price = args.patch.price;
  if (args.patch.image !== undefined) update.image = args.patch.image;
  if (args.patch.isActive !== undefined) update.is_active = args.patch.isActive;

  const { error } = await supabase
    .from("products")
    .update(update)
    .eq("id", args.id)
    .eq("category", "camiseta");

  if (error) {
    console.error("[updateTshirt] Error:", error);
    throw new Error("Erro ao atualizar camiseta");
  }
}

/**
 * Deleta (soft delete) uma camiseta
 */
export async function deleteTshirt(args: { id: number }): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", args.id)
    .eq("category", "camiseta");

  if (error) {
    console.error("[deleteTshirt] Error:", error);
    throw new Error("Erro ao deletar camiseta");
  }
}

// =============================================================================
// SHOP PRODUCTS (Produtos de cabelo/barba)
// =============================================================================

/**
 * Retorna produtos ativos (para público)
 */
export async function getShopProducts(): Promise<ShopProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category", "produto")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("[getShopProducts] Error:", error);
    return [];
  }

  return (data || []).map(mapProductFromDB) as ShopProduct[];
}

/**
 * Retorna todos os produtos (incluindo inativos, para admin)
 */
export async function getAllShopProducts(): Promise<ShopProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category", "produto")
    .order("name");

  if (error) {
    console.error("[getAllShopProducts] Error:", error);
    return [];
  }

  return (data || []).map(mapProductFromDB) as ShopProduct[];
}

/**
 * Cria um novo produto
 */
export async function createShopProduct(
  input: Omit<ShopProduct, "id" | "category" | "isActive">
): Promise<ShopProduct> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name,
      description: input.description,
      price: input.price,
      image: input.image,
      stock: input.stock,
      category: "produto",
      subcategory: input.subcategory,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("[createShopProduct] Error:", error);
    throw new Error("Erro ao criar produto");
  }

  return mapProductFromDB(data) as ShopProduct;
}

/**
 * Atualiza um produto existente
 */
export async function updateShopProduct(args: {
  id: number;
  patch: Partial<Omit<ShopProduct, "id" | "category">>;
}): Promise<void> {
  const update: any = {};
  if (args.patch.name !== undefined) update.name = args.patch.name;
  if (args.patch.description !== undefined) update.description = args.patch.description;
  if (args.patch.price !== undefined) update.price = args.patch.price;
  if (args.patch.image !== undefined) update.image = args.patch.image;
  if (args.patch.stock !== undefined) update.stock = args.patch.stock;
  if (args.patch.subcategory !== undefined) update.subcategory = args.patch.subcategory;
  if (args.patch.isActive !== undefined) update.is_active = args.patch.isActive;

  const { error } = await supabase
    .from("products")
    .update(update)
    .eq("id", args.id)
    .eq("category", "produto");

  if (error) {
    console.error("[updateShopProduct] Error:", error);
    throw new Error("Erro ao atualizar produto");
  }
}

/**
 * Deleta (soft delete) um produto
 */
export async function deleteShopProduct(args: { id: number }): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", args.id)
    .eq("category", "produto");

  if (error) {
    console.error("[deleteShopProduct] Error:", error);
    throw new Error("Erro ao deletar produto");
  }
}

/**
 * Atualiza o estoque de um produto
 */
export async function updateShopProductStock(args: {
  id: number;
  newStock: number;
  operation: "add" | "remove";
  quantity: number;
  reason?: string;
}): Promise<void> {
  const finalStock = Math.max(0, Math.floor(args.newStock));

  const { error } = await supabase
    .from("products")
    .update({ stock: finalStock })
    .eq("id", args.id)
    .eq("category", "produto");

  if (error) {
    console.error("[updateShopProductStock] Error:", error);
    throw new Error("Erro ao atualizar estoque");
  }

  // TODO: Se quiser, pode criar uma tabela de histórico de estoque (stock_history)
  // para registrar todas as movimentações com motivo, data, etc.
}
