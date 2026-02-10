import { supabase } from '@/lib/supabase';
import type { GalleryPhoto } from '@/lib/supabase';

const BUCKET_NAME = 'gallery';

/**
 * Inicializa o bucket de galeria (executar uma vez no setup)
 */
export async function initGalleryBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET_NAME);
  
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
    });
    
    if (error) {
      console.error('Erro ao criar bucket:', error);
      return { success: false, error };
    }
  }
  
  return { success: true };
}

/**
 * Buscar todas as fotos da galeria
 */
export async function getAllGalleryPhotos(): Promise<GalleryPhoto[]> {
  const { data, error } = await supabase
    .from('gallery_photos')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Erro ao buscar fotos:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Buscar fotos por categoria
 */
export async function getPhotosByCategory(category: 'Cortes' | 'Luzes' | 'Quimica'): Promise<GalleryPhoto[]> {
  const { data, error } = await supabase
    .from('gallery_photos')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Erro ao buscar fotos por categoria:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Upload de uma foto para a galeria
 */
export async function uploadGalleryPhoto(
  file: File,
  category: 'Cortes' | 'Luzes' | 'Quimica'
): Promise<{ success: boolean; photo?: GalleryPhoto; error?: string }> {
  try {
    // Validação
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'Arquivo muito grande. Máximo 5MB.' };
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Formato inválido. Use JPG, PNG ou WEBP.' };
    }
    
    // Gerar nome único
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop();
    const filename = `${category.toLowerCase()}_${timestamp}_${randomStr}.${extension}`;
    const storagePath = `${category}/${filename}`;
    
    // Upload para o Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      return { success: false, error: 'Erro ao fazer upload da foto.' };
    }
    
    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);
    
    // Salvar no banco de dados
    const { data: photo, error: dbError } = await supabase
      .from('gallery_photos')
      .insert({
        category,
        filename: file.name,
        storage_path: storagePath,
        url: urlData.publicUrl,
      })
      .select()
      .single();
    
    if (dbError) {
      // Se erro no banco, deletar do storage
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      console.error('Erro ao salvar no banco:', dbError);
      return { success: false, error: 'Erro ao salvar informações da foto.' };
    }
    
    return { success: true, photo };
  } catch (error) {
    console.error('Erro geral no upload:', error);
    return { success: false, error: 'Erro inesperado no upload.' };
  }
}

/**
 * Remover uma foto da galeria
 */
export async function deleteGalleryPhoto(photoId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Buscar foto para obter o storage_path
    const { data: photo, error: fetchError } = await supabase
      .from('gallery_photos')
      .select('storage_path')
      .eq('id', photoId)
      .single();
    
    if (fetchError || !photo) {
      return { success: false, error: 'Foto não encontrada.' };
    }
    
    // Deletar do storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([photo.storage_path]);
    
    if (storageError) {
      console.error('Erro ao deletar do storage:', storageError);
    }
    
    // Deletar do banco
    const { error: dbError } = await supabase
      .from('gallery_photos')
      .delete()
      .eq('id', photoId);
    
    if (dbError) {
      console.error('Erro ao deletar do banco:', dbError);
      return { success: false, error: 'Erro ao remover foto.' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erro geral ao deletar:', error);
    return { success: false, error: 'Erro inesperado ao remover foto.' };
  }
}

/**
 * Mover foto entre categorias
 */
export async function moveGalleryPhoto(
  photoId: string,
  newCategory: 'Cortes' | 'Luzes' | 'Quimica'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Buscar foto atual
    const { data: photo, error: fetchError } = await supabase
      .from('gallery_photos')
      .select('*')
      .eq('id', photoId)
      .single();
    
    if (fetchError || !photo) {
      return { success: false, error: 'Foto não encontrada.' };
    }
    
    // Se já está na categoria destino
    if (photo.category === newCategory) {
      return { success: true };
    }
    
    const oldPath = photo.storage_path;
    const filename = oldPath.split('/').pop();
    const newPath = `${newCategory}/${filename}`;
    
    // Copiar para nova localização
    const { error: copyError } = await supabase.storage
      .from(BUCKET_NAME)
      .copy(oldPath, newPath);
    
    if (copyError) {
      console.error('Erro ao copiar arquivo:', copyError);
      return { success: false, error: 'Erro ao mover foto no storage.' };
    }
    
    // Deletar arquivo antigo
    await supabase.storage.from(BUCKET_NAME).remove([oldPath]);
    
    // Obter nova URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(newPath);
    
    // Atualizar banco
    const { error: updateError } = await supabase
      .from('gallery_photos')
      .update({
        category: newCategory,
        storage_path: newPath,
        url: urlData.publicUrl,
      })
      .eq('id', photoId);
    
    if (updateError) {
      console.error('Erro ao atualizar banco:', updateError);
      return { success: false, error: 'Erro ao atualizar informações da foto.' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erro geral ao mover:', error);
    return { success: false, error: 'Erro inesperado ao mover foto.' };
  }
}

/**
 * Verificar se Supabase está configurado
 */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url !== 'your-project-url-here');
}
