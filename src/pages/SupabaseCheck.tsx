import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { slugify } from '../lib/utils';
import { CheckCircle2, XCircle, AlertTriangle, Database, ArrowLeft, Loader2, Copy, UserPlus, Plus } from 'lucide-react';

export function SupabaseCheck() {
  const [status, setStatus] = useState<{
    config: boolean;
    connection: 'loading' | 'ok' | 'error';
    tables: {
      profiles: 'ok' | 'error' | 'loading';
      properties: 'ok' | 'error' | 'loading';
      neighborhoods: 'ok' | 'error' | 'loading';
    };
    storage: {
      bucket: 'ok' | 'error' | 'loading';
    };
    error?: string;
  }>({
    config: isSupabaseConfigured(),
    connection: 'loading',
    tables: {
      profiles: 'loading',
      properties: 'loading',
      neighborhoods: 'loading',
    },
    storage: {
      bucket: 'loading'
    }
  });

  const [adminLoading, setAdminLoading] = useState(false);
  const [storageLoading, setStorageLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [storageMessage, setStorageMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [customUser, setCustomUser] = useState({ email: 'teste@imobiflow.com', password: 'admin123' });

  const fixStorage = async () => {
    setStorageLoading(true);
    setStorageMessage(null);
    try {
      const { data, error } = await supabase.storage.createBucket('property-images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        fileSizeLimit: 1024 * 1024 * 2 // 2MB
      });

      if (error) {
        if (error.message.includes('already exists')) {
          // Se já existe, tentamos apenas garantir que é público (embora o SDK não tenha um updateBucket simples acessível assim às vezes)
          setStorageMessage({ type: 'success', text: 'O bucket já existe. Verifique se ele está marcado como "Public" no painel.' });
          setStatus(prev => ({ ...prev, storage: { bucket: 'ok' } }));
        } else {
          throw error;
        }
      } else {
        setStorageMessage({ type: 'success', text: 'Bucket "property-images" criado com sucesso!' });
        setStatus(prev => ({ ...prev, storage: { bucket: 'ok' } }));
      }
    } catch (err: any) {
      setStorageMessage({ type: 'error', text: 'Erro ao criar bucket: ' + err.message + '. Você pode precisar criá-lo manualmente no painel Storage.' });
    } finally {
      setStorageLoading(false);
    }
  };

  const createAdminUser = async () => {
    setAdminLoading(true);
    setAdminMessage(null);
    try {
      // Tenta o Sign Up. Se o e-mail estiver desabilitado, ele cria o usuário já confirmado.
      const { data, error } = await supabase.auth.signUp({
        email: customUser.email,
        password: customUser.password,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setAdminMessage({ 
            type: 'error', 
            text: `O usuário ${customUser.email} já está registrado. Tente outro e-mail ou use a senha correta.` 
          });
        } else {
          throw error;
        }
      } else if (data.user) {
        setAdminMessage({ 
          type: 'success', 
          text: `Usuário ${customUser.email} criado com sucesso! Tente logar agora.` 
        });
      }
    } catch (err: any) {
      setAdminMessage({ type: 'error', text: 'Erro ao criar: ' + err.message });
    } finally {
      setAdminLoading(false);
    }
  };

  const checkDatabase = async () => {
    if (!isSupabaseConfigured()) {
      setStatus(prev => ({ ...prev, connection: 'error', error: 'Supabase não configurado no .env' }));
      return;
    }

    try {
      // Test connection
      const { error: connError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      
      setStatus(prev => ({ 
        ...prev, 
        connection: connError ? 'error' : 'ok',
        tables: {
          ...prev.tables,
          profiles: connError ? 'error' : 'ok'
        }
      }));

      // Check properties
      const { error: propError } = await supabase.from('properties').select('count', { count: 'exact', head: true });
      setStatus(prev => ({ 
        ...prev, 
        tables: {
          ...prev.tables,
          properties: propError ? 'error' : 'ok'
        }
      }));

      // Check neighborhoods
      const { error: neighError } = await supabase.from('neighborhoods').select('count', { count: 'exact', head: true });
      setStatus(prev => ({ 
        ...prev, 
        tables: {
          ...prev.tables,
          neighborhoods: neighError ? 'error' : 'ok'
        }
      }));

      // Check global_settings
      const { error: settingsError } = await supabase.from('global_settings').select('count', { count: 'exact', head: true });
      setStatus(prev => ({ 
        ...prev, 
        tables: {
          ...prev.tables,
          global_settings: settingsError ? 'error' : 'ok'
        }
      }));

      // Check Storage Bucket
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      const hasBucket = buckets?.some(b => b.name === 'property-images');
      
      setStatus(prev => ({ 
        ...prev, 
        storage: {
          bucket: (bucketError || !hasBucket) ? 'error' : 'ok'
        }
      }));

    } catch (err: any) {
      setStatus(prev => ({ ...prev, connection: 'error', error: err.message }));
    }
  };

  useEffect(() => {
    checkDatabase();
  }, []);

  const sqlCode = `-- 1. Tabelas (Só cria se não existirem)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  creci TEXT,
  whatsapp_number TEXT,
  gemini_api_key TEXT,
  must_change_password BOOLEAN DEFAULT TRUE,
  requires_password_change BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'broker',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.global_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.neighborhoods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cidade TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  descricao_seo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL NOT NULL,
  type TEXT NOT NULL,
  purpose TEXT NOT NULL,
  neighborhood TEXT,
  city TEXT,
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  parking_spots INTEGER DEFAULT 0,
  area_sqm DECIMAL DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 3. Políticas (Ignora erro se já existir)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Leitura pública de imóveis') THEN
        CREATE POLICY "Leitura pública de imóveis" ON public.properties FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Leitura pública de bairros') THEN
        CREATE POLICY "Leitura pública de bairros" ON public.neighborhoods FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Dono acessa próprio perfil') THEN
        CREATE POLICY "Dono acessa próprio perfil" ON public.profiles FOR ALL USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Dono gerencia próprios imóveis') THEN
        CREATE POLICY "Dono gerencia próprios imóveis" ON public.properties FOR ALL USING (auth.uid() = broker_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Leitura global de configurações') THEN
        CREATE POLICY "Leitura global de configurações" ON public.global_settings FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Escrita global de configurações') THEN
        CREATE POLICY "Escrita global de configurações" ON public.global_settings FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Atualização global de configurações') THEN
        CREATE POLICY "Atualização global de configurações" ON public.global_settings FOR UPDATE TO authenticated USING (true);
    END IF;
END $$;

-- 4. Configuração de Storage e Políticas de Imagem
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir upload para usuários autenticados') THEN
        CREATE POLICY "Permitir upload para usuários autenticados"
        ON storage.objects FOR INSERT 
        TO authenticated 
        WITH CHECK (bucket_id = 'property-images');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir visualização pública') THEN
        CREATE POLICY "Permitir visualização pública"
        ON storage.objects FOR SELECT 
        TO public 
        USING (bucket_id = 'property-images');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir exclusão para usuários autenticados') THEN
        CREATE POLICY "Permitir exclusão para usuários autenticados"
        ON storage.objects FOR DELETE 
        TO authenticated 
        USING (bucket_id = 'property-images');
    END IF;
END $$;
`;

  const [syncing, setSyncing] = useState(false);

  const syncNeighborhoods = async () => {
    if (!isSupabaseConfigured()) return;
    setSyncing(true);
    try {
      const { data: props, error: propsErr } = await supabase
        .from('properties')
        .select('neighborhood, city');
      
      if (propsErr) throw propsErr;

      const uniqueNBs = Array.from(new Set(props?.map(p => `${p.neighborhood}|${p.city}`)));
      let created = 0;

      for (const item of uniqueNBs) {
        const [nome, cidade] = item.split('|');
        if (!nome || !cidade) continue;

        const { data: existing } = await supabase
          .from('neighborhoods')
          .select('id')
          .eq('nome', nome)
          .eq('cidade', cidade)
          .maybeSingle();
        
        if (!existing) {
          const slug = slugify(`${nome}-${cidade}`);
          await supabase.from('neighborhoods').insert({
            nome,
            cidade,
            slug,
            meta_title: `Imóveis em ${nome} - ${cidade}`,
            meta_description: `Confira as melhores opções de imóveis no bairro ${nome} em ${cidade}.`,
            descricao_seo: `O bairro ${nome} em ${cidade} é uma excelente região para morar ou investir.`
          });
          created++;
        }
      }
      alert(`${created} novos bairros sincronizados com sucesso!`);
      checkDatabase();
    } catch (err: any) {
      alert('Erro na sincronização: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    alert('SQL copiado para a área de transferência!');
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link to="/login" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Login
        </Link>

        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-zinc-200/50 border border-zinc-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-emerald-50 rounded-2xl">
              <Database className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Diagnóstico Supabase</h1>
              <p className="text-zinc-500">Verifique a conexão e a estrutura do banco de dados.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-12">
            <button 
              onClick={checkDatabase}
              disabled={status.connection === 'loading'}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
            >
              {status.connection === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
              Verificar Agora
            </button>

            <button 
              onClick={syncNeighborhoods}
              disabled={syncing}
              className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Sincronizar Bairros
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-zinc-900">Status da Conexão</h2>
              
              <div className="space-y-4">
                <StatusItem 
                  label="Configuração (.env)" 
                  status={status.config ? 'ok' : 'error'} 
                  text={status.config ? 'Chaves encontradas' : 'Chaves ausentes'} 
                />
                <StatusItem 
                  label="Conexão com API" 
                  status={status.connection} 
                  text={status.connection === 'ok' ? 'Conectado com sucesso' : status.connection === 'loading' ? 'Testando...' : 'Falha na conexão'} 
                />
                <div className="text-[10px] text-zinc-400 font-mono break-all bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                  URL: {import.meta.env.VITE_SUPABASE_URL || 'Não configurada'}
                </div>
              </div>

              <h2 className="text-lg font-bold text-zinc-900 pt-4">Tabelas Necessárias</h2>
              <div className="space-y-4">
                <StatusItem label="profiles" status={status.tables.profiles} />
                <StatusItem label="properties" status={status.tables.properties} />
                <StatusItem label="neighborhoods" status={status.tables.neighborhoods} />
              </div>

              <h2 className="text-lg font-bold text-zinc-900 pt-4">Armazenamento (Storage)</h2>
              <div className="space-y-4">
                <StatusItem label="bucket: property-images" status={status.storage.bucket} />
                {status.storage.bucket === 'error' && (
                  <button 
                    onClick={fixStorage}
                    disabled={storageLoading}
                    className="w-full py-2 px-4 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-200 transition-all flex items-center justify-center gap-2"
                  >
                    {storageLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Tentar Criar Bucket Automaticamente
                  </button>
                )}
                {storageMessage && (
                  <p className={`text-[10px] font-bold ${storageMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {storageMessage.text}
                  </p>
                )}
              </div>

              <div className="pt-8 border-t border-zinc-100">
                <h2 className="text-lg font-bold text-zinc-900 mb-4">Acesso ao Painel</h2>
                <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
                  <p className="text-sm text-emerald-800 mb-4 leading-relaxed">
                    Crie um novo usuário para testar o acesso. Como você desabilitou a confirmação de e-mail, ele deve funcionar imediatamente.
                  </p>
                  
                  <div className="space-y-3 mb-4">
                    <input 
                      type="email"
                      value={customUser.email}
                      onChange={e => setCustomUser({...customUser, email: e.target.value})}
                      className="w-full p-2 text-sm rounded-lg border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="E-mail do novo usuário"
                    />
                    <input 
                      type="text"
                      value={customUser.password}
                      onChange={e => setCustomUser({...customUser, password: e.target.value})}
                      className="w-full p-2 text-sm rounded-lg border border-emerald-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Senha"
                    />
                  </div>

                  <button 
                    onClick={createAdminUser}
                    disabled={adminLoading}
                    className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {adminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Criar Novo Usuário de Teste
                  </button>
                  {adminMessage && (
                    <p className={`mt-3 text-xs font-medium text-center ${adminMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {adminMessage.text}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-3xl p-6 text-zinc-400 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Script SQL de Criação</h3>
                <button 
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                  title="Copiar SQL"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <pre className="text-[10px] font-mono leading-relaxed overflow-y-auto max-h-[400px] custom-scrollbar">
                {sqlCode}
              </pre>
            </div>
          </div>

          {(status.connection === 'error' || Object.values(status.tables).includes('error')) && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <h4 className="font-bold text-amber-900 mb-1">Ação Necessária</h4>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Algumas tabelas não foram encontradas ou a conexão falhou. 
                  Copie o script SQL ao lado e execute-o no <strong>SQL Editor</strong> do seu painel do Supabase para criar a estrutura correta.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, status, text }: { label: string, status: 'ok' | 'error' | 'loading', text?: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
      <span className="text-sm font-medium text-zinc-600">{label}</span>
      <div className="flex items-center gap-2">
        {text && <span className="text-xs text-zinc-400">{text}</span>}
        {status === 'ok' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
        {status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
        {status === 'loading' && <Loader2 className="w-5 h-5 text-zinc-300 animate-spin" />}
      </div>
    </div>
  );
}
