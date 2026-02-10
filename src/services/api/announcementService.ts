import { z } from "zod";
import { supabase } from "@/lib/supabase";

export type AnnouncementIcon = "⚠️" | "📢" | "🎉" | "ℹ️" | "🚫" | "✅";

export type Announcement = {
  id: string;
  icon: AnnouncementIcon;
  title: string;
  content: string;
  imageUrl?: string | null; // URL da imagem (opcional)
  isActive: boolean;
  createdAt: string; // ISO
  createdBy: string;
  updatedAt?: string | null;
};

const iconSchema = z.enum(["⚠️", "📢", "🎉", "ℹ️", "🚫", "✅"]);
const titleSchema = z.string().trim().min(1, "Título é obrigatório").max(100, "Título deve ter no máximo 100 caracteres");
const contentSchema = z.string().trim().max(500, "Conteúdo deve ter no máximo 500 caracteres");
const imageUrlSchema = z.string().url("URL inválida").optional().or(z.literal(""));

// =============================================================================
// HELPER: Conversão de snake_case do DB para camelCase do TypeScript
// =============================================================================

function mapAnnouncementFromDB(row: any): Announcement {
  return {
    id: row.id,
    icon: row.icon,
    title: row.title,
    content: row.content,
    imageUrl: row.image_url || null,
    isActive: row.is_active,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at || null,
  };
}

// =============================================================================
// GET: Buscar avisos
// =============================================================================

/**
 * Retorna apenas avisos ativos (para Home/Dashboard público)
 */
export async function getAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAnnouncements] Error:", error);
    return [];
  }

  return (data || []).map(mapAnnouncementFromDB);
}

/**
 * Retorna todos os avisos (incluindo inativos, para admin)
 */
export async function getAllAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAllAnnouncements] Error:", error);
    return [];
  }

  return (data || []).map(mapAnnouncementFromDB);
}

// =============================================================================
// CREATE: Criar novo aviso
// =============================================================================

/**
 * Cria um novo aviso
 */
export async function createAnnouncement(input: {
  icon: AnnouncementIcon;
  title: string;
  content: string;
  imageUrl?: string | null;
  isActive: boolean;
  createdBy?: string;
}): Promise<Announcement> {
  iconSchema.parse(input.icon);
  titleSchema.parse(input.title);
  contentSchema.parse(input.content);
  if (input.imageUrl) imageUrlSchema.parse(input.imageUrl);

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      icon: input.icon,
      title: input.title.trim(),
      content: input.content.trim(),
      image_url: input.imageUrl?.trim() || null,
      is_active: Boolean(input.isActive),
      created_by: input.createdBy?.trim() || "Admin",
    })
    .select()
    .single();

  if (error) {
    console.error("[createAnnouncement] Error:", error);
    throw new Error("Erro ao criar aviso");
  }

  return mapAnnouncementFromDB(data);
}

// =============================================================================
// UPDATE: Atualizar aviso
// =============================================================================

/**
 * Atualiza um aviso existente
 */
export async function updateAnnouncement(args: {
  id: string;
  patch: Pick<Announcement, "icon" | "title" | "content" | "isActive"> & { imageUrl?: string | null };
}): Promise<void> {
  z.string().trim().min(1).parse(args.id);
  iconSchema.parse(args.patch.icon);
  titleSchema.parse(args.patch.title);
  contentSchema.parse(args.patch.content);
  if (args.patch.imageUrl) imageUrlSchema.parse(args.patch.imageUrl);

  const { error } = await supabase
    .from("announcements")
    .update({
      icon: args.patch.icon,
      title: args.patch.title.trim(),
      content: args.patch.content.trim(),
      image_url: args.patch.imageUrl?.trim() || null,
      is_active: Boolean(args.patch.isActive),
    })
    .eq("id", args.id);

  if (error) {
    console.error("[updateAnnouncement] Error:", error);
    throw new Error("Erro ao atualizar aviso");
  }
}

/**
 * Ativa/desativa um aviso
 */
export async function toggleAnnouncementStatus(args: { id: string; isActive: boolean }): Promise<void> {
  z.string().trim().min(1).parse(args.id);

  const { error } = await supabase
    .from("announcements")
    .update({ is_active: Boolean(args.isActive) })
    .eq("id", args.id);

  if (error) {
    console.error("[toggleAnnouncementStatus] Error:", error);
    throw new Error("Erro ao alterar status do aviso");
  }
}

// =============================================================================
// DELETE: Deletar aviso
// =============================================================================

/**
 * Deleta um aviso permanentemente
 */
export async function deleteAnnouncement(args: { id: string }): Promise<void> {
  z.string().trim().min(1).parse(args.id);

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", args.id);

  if (error) {
    console.error("[deleteAnnouncement] Error:", error);
    throw new Error("Erro ao deletar aviso");
  }
}
