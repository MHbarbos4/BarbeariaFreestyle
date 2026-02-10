import { z } from "zod";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export type CheckPhoneResponse =
  | { exists: true; userId: string; name: string }
  | { exists: false };

export type RegisterResponse = { userId: string; name: string; phoneNumber: string };

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Digite um número de celular válido");

const nameSchema = z
  .string()
  .trim()
  .min(3, "Digite seu nome completo")
  .max(100, "Digite seu nome completo")
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Digite seu nome completo");

type StoredUser = { userId: string; name: string; phoneNumber: string; suspended?: boolean };

export type Client = StoredUser & {
  createdAt?: string;
  suspended?: boolean;
};

// =============================================================================
// HELPER: Buscar usuário por ID
// =============================================================================

export function getUserById(userId: string): StoredUser | null {
  // Esta função precisa ser síncrona para compatibilidade com código existente
  // Usa uma promise de forma síncrona (não ideal, mas necessário)
  console.warn("[getUserById] Synchronous call - consider refactoring to async");
  return null; // Fallback - o código que chama deve ser refatorado para usar getUserByIdAsync
}

/**
 * Versão assíncrona de getUserById (use esta!)
 */
export async function getUserByIdAsync(userId: string): Promise<StoredUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    userId: data.id,
    name: data.name,
    phoneNumber: data.phone_number,
    suspended: data.suspended || false,
  };
}

// =============================================================================
// AUTH: Check phone e register
// =============================================================================

/**
 * Verifica se um telefone já está cadastrado
 */
export async function checkPhone(phoneNumber: string): Promise<CheckPhoneResponse> {
  phoneSchema.parse(phoneNumber);

  const { data, error } = await supabase
    .from("users")
    .select("id, name")
    .eq("phone_number", phoneNumber)
    .single();

  if (error || !data) {
    return { exists: false };
  }

  return { exists: true, userId: data.id, name: data.name };
}

/**
 * Registra um novo usuário
 */
export async function register(phoneNumber: string, name: string): Promise<RegisterResponse> {
  phoneSchema.parse(phoneNumber);
  nameSchema.parse(name);

  // Verifica se já existe
  const existing = await checkPhone(phoneNumber);
  if (existing.exists) {
    return { userId: existing.userId, name: existing.name, phoneNumber };
  }

  // Cria novo usuário
  const { data, error } = await supabase
    .from("users")
    .insert({
      name: name.trim(),
      phone_number: phoneNumber,
      suspended: false,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[register] Error:", error);
    throw new Error("Erro ao registrar usuário");
  }

  return { userId: data.id, name: data.name, phoneNumber: data.phone_number };
}

// =============================================================================
// ADMIN FUNCTIONS: Gerenciamento de clientes
// =============================================================================

/**
 * Retorna todos os clientes cadastrados
 */
export async function getAllClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAllClients] Error:", error);
    return [];
  }

  return (data || []).map((u) => ({
    userId: u.id,
    name: u.name,
    phoneNumber: u.phone_number,
    suspended: u.suspended || false,
    createdAt: u.created_at,
  }));
}

/**
 * Atualiza dados de um cliente
 */
export async function updateClient(userId: string, data: { name: string; phoneNumber: string }): Promise<Client | null> {
  nameSchema.parse(data.name);
  phoneSchema.parse(data.phoneNumber);

  // Verifica se o telefone já está em uso por outro usuário
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("phone_number", data.phoneNumber)
    .neq("id", userId)
    .single();

  if (existing) {
    throw new Error("Este número de telefone já está cadastrado");
  }

  // Atualiza o usuário
  const { data: updated, error } = await supabase
    .from("users")
    .update({
      name: data.name.trim(),
      phone_number: data.phoneNumber,
    })
    .eq("id", userId)
    .select()
    .single();

  if (error || !updated) {
    console.error("[updateClient] Error:", error);
    return null;
  }

  return {
    userId: updated.id,
    name: updated.name,
    phoneNumber: updated.phone_number,
    suspended: updated.suspended || false,
    createdAt: updated.created_at,
  };
}

/**
 * Remove um cliente
 */
export async function deleteClient(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", userId);

  if (error) {
    console.error("[deleteClient] Error:", error);
    return false;
  }

  return true;
}

/**
 * Suspende uma conta de cliente
 */
export async function suspendClient(userId: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from("users")
    .update({ suspended: true })
    .eq("id", userId)
    .select()
    .single();

  if (error || !data) {
    console.error("[suspendClient] Error:", error);
    return null;
  }

  return {
    userId: data.id,
    name: data.name,
    phoneNumber: data.phone_number,
    suspended: data.suspended || false,
    createdAt: data.created_at,
  };
}

/**
 * Reativa uma conta de cliente suspensa
 */
export async function unsuspendClient(userId: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from("users")
    .update({ suspended: false })
    .eq("id", userId)
    .select()
    .single();

  if (error || !data) {
    console.error("[unsuspendClient] Error:", error);
    return null;
  }

  return {
    userId: data.id,
    name: data.name,
    phoneNumber: data.phone_number,
    suspended: data.suspended || false,
    createdAt: data.created_at,
  };
}

/**
 * Verifica se um cliente está suspenso
 */
export async function isClientSuspended(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .select("suspended")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.suspended === true;
}

/**
 * Busca um cliente por ID
 */
export async function getClientById(userId: string): Promise<Client | null> {
  return await getUserByIdAsync(userId);
}

// =============================================================================
// ADMIN AUTH: Login de administrador (hard-coded para simplicidade)
// =============================================================================

export type AdminLoginResponse = {
  success: boolean;
  admin?: { id: string; name: string; phoneNumber: string };
  error?: string;
};

/**
 * Login de admin com celular + senha (busca no banco de dados)
 */
export async function loginAdmin(phoneNumber: string, password: string): Promise<AdminLoginResponse> {
  phoneSchema.parse(phoneNumber);

  // Busca admin no banco
  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("*")
    .eq("phone_number", phoneNumber)
    .eq("is_active", true)
    .single();

  if (error || !admin) {
    return { success: false, error: "Número não cadastrado como admin" };
  }

  // Verifica senha (bcrypt hash)
  // NOTA: Em produção, use uma lib como bcryptjs para verificar o hash
  // Por enquanto, fazemos comparação simples (inseguro, apenas para demonstração)
  const isPasswordValid = await verifyPassword(password, admin.password_hash);

  if (!isPasswordValid) {
    return { success: false, error: "Senha incorreta" };
  }

  return {
    success: true,
    admin: {
      id: admin.id,
      name: admin.name,
      phoneNumber: admin.phone_number,
    },
  };
}

/**
 * Verifica senha com bcrypt
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error("[verifyPassword] Error:", error);
    return false;
  }
}

// =============================================================================
// ADMIN REGISTRATION: Cadastro de novos administradores
// =============================================================================

export type RegisterAdminData = {
  phoneNumber: string;
  name: string;
  password: string;
};

export type RegisterAdminResponse = {
  success: boolean;
  admin?: { id: string; name: string; phoneNumber: string };
  error?: string;
};

/**
 * Cadastra um novo administrador
 * Uso: await registerAdmin("(11) 98888-8888", "João Silva", "senhaSegura123")
 */
export async function registerAdmin(
  phoneNumber: string,
  name: string,
  password: string
): Promise<RegisterAdminResponse> {
  try {
    // Valida dados
    phoneSchema.parse(phoneNumber);
    nameSchema.parse(name);

    if (password.length < 6) {
      return { success: false, error: "Senha deve ter no mínimo 6 caracteres" };
    }

    // Verifica se telefone já está cadastrado
    const { data: existing } = await supabase
      .from("admin_users")
      .select("id")
      .eq("phone_number", phoneNumber)
      .single();

    if (existing) {
      return { success: false, error: "Este telefone já está cadastrado como admin" };
    }

    // Gera hash da senha (bcrypt com 10 rounds)
    const passwordHash = await bcrypt.hash(password, 10);

    // Insere no banco
    const { data: admin, error } = await supabase
      .from("admin_users")
      .insert({
        phone_number: phoneNumber,
        name: name.trim(),
        password_hash: passwordHash,
        is_active: true,
      })
      .select()
      .single();

    if (error || !admin) {
      console.error("[registerAdmin] Error:", error);
      return { success: false, error: "Erro ao cadastrar admin" };
    }

    return {
      success: true,
      admin: {
        id: admin.id,
        name: admin.name,
        phoneNumber: admin.phone_number,
      },
    };
  } catch (error: any) {
    console.error("[registerAdmin] Error:", error);
    return { success: false, error: error.message || "Erro ao cadastrar admin" };
  }
}

/**
 * Lista todos os administradores
 */
export async function getAllAdmins() {
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, phone_number, name, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAllAdmins] Error:", error);
    return [];
  }

  return (data || []).map((a) => ({
    id: a.id,
    phoneNumber: a.phone_number,
    name: a.name,
    isActive: a.is_active,
    createdAt: a.created_at,
  }));
}

/**
 * Desativa um administrador
 */
export async function deactivateAdmin(adminId: string): Promise<boolean> {
  const { error } = await supabase
    .from("admin_users")
    .update({ is_active: false })
    .eq("id", adminId);

  if (error) {
    console.error("[deactivateAdmin] Error:", error);
    return false;
  }

  return true;
}

/**
 * Reativa um administrador
 */
export async function activateAdmin(adminId: string): Promise<boolean> {
  const { error } = await supabase
    .from("admin_users")
    .update({ is_active: true })
    .eq("id", adminId);

  if (error) {
    console.error("[activateAdmin] Error:", error);
    return false;
  }

  return true;
}

/**
 * Altera senha de um administrador
 */
export async function changeAdminPassword(
  adminId: string,
  newPassword: string
): Promise<boolean> {
  try {
    if (newPassword.length < 6) {
      return false;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from("admin_users")
      .update({ password_hash: passwordHash })
      .eq("id", adminId);

    if (error) {
      console.error("[changeAdminPassword] Error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[changeAdminPassword] Error:", error);
    return false;
  }
}
