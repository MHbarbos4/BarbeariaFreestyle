import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase não configurado. Crie o arquivo .env com as chaves do Supabase.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Verifica se o Supabase está configurado corretamente
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.includes('supabase.co'));
}

// Database Types
export type GalleryPhoto = {
  id: string;
  category: 'Cortes' | 'Luzes' | 'Quimica';
  filename: string;
  storage_path: string;
  url: string;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      gallery_photos: {
        Row: GalleryPhoto;
        Insert: Omit<GalleryPhoto, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<GalleryPhoto, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
};
