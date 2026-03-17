import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const isSupabaseConfigured = () => {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
};

// Se as chaves não estiverem configuradas, o cliente ainda será criado mas as chamadas falharão.
// No entanto, já guardamos as chamadas nos componentes.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: isSupabaseConfigured(), // Não tenta persistir se não estiver configurado
    autoRefreshToken: isSupabaseConfigured(),
  }
});
