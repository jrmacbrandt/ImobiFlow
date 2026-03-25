-- SQL para ser executado no Editor SQL do Supabase

-- 1. Tabela de Perfis (Corretores)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  creci TEXT NOT NULL,
  whatsapp_number TEXT,
  gemini_api_key TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Imóveis
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL,
  type TEXT CHECK (type IN ('Casa', 'Apartamento', 'Terreno', 'Comercial')),
  purpose TEXT CHECK (purpose IN ('Venda', 'Locação')),
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Rio de Janeiro',
  bedrooms INTEGER DEFAULT 0,
  parking_spots INTEGER DEFAULT 0,
  images TEXT[] DEFAULT '{}', -- Array de URLs das imagens
  property_code TEXT UNIQUE, -- Código de 4 dígitos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índice para busca rápida por código
CREATE INDEX IF NOT EXISTS idx_properties_code ON properties(property_code);

-- 4. Função para gerar código aleatório de 4 dígitos único
CREATE OR REPLACE FUNCTION generate_unique_property_code() 
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  done BOOLEAN DEFAULT FALSE;
BEGIN
  WHILE NOT done LOOP
    new_code := floor(random() * 9000 + 1000)::TEXT;
    IF NOT EXISTS (SELECT 1 FROM properties WHERE property_code = new_code) THEN
      done := TRUE;
    END IF;
  END LOOP;
  NEW.property_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para gerar código antes de inserir
CREATE TRIGGER trg_generate_property_code
BEFORE INSERT ON properties
FOR EACH ROW
WHEN (NEW.property_code IS NULL)
EXECUTE FUNCTION generate_unique_property_code();

-- 6. Tabela de Visualizações (Analytics)
CREATE TABLE IF NOT EXISTS property_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_views_property_id ON property_views(property_id);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_views ENABLE ROW LEVEL SECURITY;

-- 5. Políticas para Profiles
CREATE POLICY "Perfis são visíveis por todos" ON profiles FOR SELECT USING (true);
CREATE POLICY "Usuários podem editar seu próprio perfil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuários podem inserir seu próprio perfil" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. Políticas para Properties
CREATE POLICY "Imóveis são visíveis por todos" ON properties FOR SELECT USING (true);
CREATE POLICY "Corretores podem gerenciar seus próprios imóveis" ON properties 
  FOR ALL USING (auth.uid() = broker_id);

-- 7. Políticas para Property Views
CREATE POLICY "Visualizações podem ser inseridas por todos" ON property_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Corretores podem ver visualizações de seus próprios imóveis" ON property_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = property_views.property_id 
      AND properties.broker_id = auth.uid()
    )
  );
-- Política redundante para garantir acesso se a acima falhar por complexidade
-- CREATE POLICY "Permitir incremento de views" ON public.property_views FOR INSERT WITH CHECK (true);

-- 8. Bucket de Storage
-- Nota: O bucket 'property-images' deve ser criado manualmente no painel do Supabase
-- com acesso público para leitura.

-- 9. Tabela de Configurações Globais
CREATE TABLE IF NOT EXISTS global_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura global de configurações" ON global_settings FOR SELECT USING (true);
CREATE POLICY "Escrita global de configurações" ON global_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização global de configurações" ON global_settings FOR UPDATE USING (true);
