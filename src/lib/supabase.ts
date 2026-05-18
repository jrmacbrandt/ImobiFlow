import { createClient } from '@supabase/supabase-js';

// Hardcoded para resolução definitiva de deploy sem depender de variáveis da Vercel
const supabaseUrl = 'https://kmhrotcgoocrunpoxqmu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttaHJvdGNnb29jcnVucG94cW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjgxMTQsImV4cCI6MjA5NDcwNDExNH0.pqa3izrzmNzdhsbOkrlkY2NT4QWp_NkXRL4kTgWVD9Y';

export const isSupabaseConfigured = () => {
  return true;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
