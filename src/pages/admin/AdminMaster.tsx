import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Settings, 
  Key, 
  Save,
  Loader2,
  AlertCircle,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export function AdminMaster() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [brokerProfile, setBrokerProfile] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Factory Reset State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetStats, setResetStats] = useState<{
    properties: number;
    views: number;
    neighborhoods: number;
    files: number;
  } | null>(null);

  useEffect(() => {
    // Verify if actually master admin
    if (localStorage.getItem('master_admin') !== 'true') {
      navigate('/login');
      return;
    }

    fetchData();
  }, []);

  async function fetchData() {
    const isDemoMode = localStorage.getItem('demo_mode') === 'true';
    if (isDemoMode) {
      setGeminiKey('AI_DEMO_KEY_123456789');
      setBrokerProfile({
        full_name: 'Corretor de Demonstração',
        creci: '12345-F',
        whatsapp_number: '21999999999'
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch global settings (Gemini Key)
      const { data: settingsData } = await supabase
        .from('global_settings')
        .select('*')
        .eq('key', 'gemini_api_key')
        .maybeSingle();
      
      if (settingsData && settingsData.value) {
        setGeminiKey(settingsData.value);
      }

      // 2. Fetch the broker profile for recovery
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (profilesData) {
        setBrokerProfile(profilesData);
        
        // If global key is empty, try this profile's key
        if (!geminiKey && profilesData.gemini_api_key) {
          setGeminiKey(profilesData.gemini_api_key);
        }
      }

      // 3. If still no key, search ALL profiles for any key (robust fallback)
      if (!geminiKey && !settingsData?.value && (!profilesData || !profilesData.gemini_api_key)) {
        const { data: anyProfileWithKey } = await supabase
          .from('profiles')
          .select('gemini_api_key')
          .not('gemini_api_key', 'is', null)
          .neq('gemini_api_key', '')
          .limit(1)
          .maybeSingle();
        
        if (anyProfileWithKey?.gemini_api_key) {
          console.log('Found fallback key in another profile');
          setGeminiKey(anyProfileWithKey.gemini_api_key);
        }
      }
      
      console.log('Master data fetched:', { 
        hasGlobalKey: !!settingsData?.value, 
        hasBrokerProfile: !!profilesData,
        geminiKeyLength: geminiKey.length 
      });
    } catch (err) {
      console.error('Error fetching master data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveSettings = async () => {
    if (localStorage.getItem('demo_mode') === 'true') {
      alert('Modo Demonstração: Alterações não são salvas.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('global_settings')
        .upsert({ 
          key: 'gemini_api_key', 
          value: geminiKey,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      alert('Configuração de IA salva com sucesso!');
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEmergencyReset = async () => {
    if (localStorage.getItem('demo_mode') === 'true') {
      alert('Modo Demonstração: Esta ação não é permitida.');
      return;
    }
    if (!brokerProfile) return;
    if (!confirm('🚨 ATENÇÃO CRÍTICA: Este botão resetará o acesso do corretor para o padrão: teste@imobiflow.com / admin123. O acesso antigo será invalidado no perfil e o usuário será obrigado a trocar a senha no primeiro login. Deseja continuar?')) return;

    setRecoveryLoading(true);
    try {
      // 1. Update Profile in public.profiles
      // Note: This updates the profile metadata. The actual auth.users reset 
      // should be handled via Supabase Dashboard or Edge Function if needed.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          email: 'teste@imobiflow.com',
          must_change_password: true,
          requires_password_change: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', brokerProfile.id);

      if (profileError) throw profileError;

      alert('Reset de Emergência aplicado! O perfil foi redefinido para teste@imobiflow.com e a trava de segurança foi ativada.');
      fetchData();
    } catch (err: any) {
      alert('Erro no reset de emergência: ' + err.message);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('master_admin');
    navigate('/login');
  };

  const handleCopy = () => {
    if (!geminiKey) return;
    navigator.clipboard.writeText(geminiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFactoryReset = async () => {
    if (localStorage.getItem('demo_mode') === 'true') {
      alert('Modo Demonstração: Esta ação não é permitida.');
      return;
    }
    if (resetConfirmation !== 'APAGAR TUDO') return;
    
    setResetting(true);
    setResetStats(null);
    
    try {
      let stats = {
        properties: 0,
        views: 0,
        neighborhoods: 0,
        files: 0
      };

      // 1. Apagar banco de dados via RPC (Bypass RLS)
      const { data: dbStats, error: dbError } = await supabase.rpc('factory_reset');
      
      if (dbError) {
        throw new Error('Falha no Reset do Banco (Você ainda precisa rodar o script SQL de Reset no painel do Supabase). ' + dbError.message);
      }

      stats.properties = dbStats?.properties || 0;
      stats.views = dbStats?.views || 0;
      stats.neighborhoods = dbStats?.neighborhoods || 0;

      // 2. Clear Storage fully (pagination since limit defaults to 100)
      let hasMore = true;
      let totalDeleted = 0;
      
      while(hasMore) {
        const { data: files, error: listError } = await supabase.storage.from('property-images').list('', { limit: 100 });
        if (listError) throw listError;
        
        if (!files || files.length === 0) {
          hasMore = false;
          break;
        }
        
        // Filter out the implicit root empty folder placeholder if present
        const filePaths = files.map(f => f.name).filter(name => name !== '.emptyFolderPlaceholder');
        
        if (filePaths.length > 0) {
          const { error: storageError } = await supabase.storage.from('property-images').remove(filePaths);
          if (storageError) throw storageError;
          totalDeleted += filePaths.length;
        }

        if (files.length < 100) {
          hasMore = false;
        }
      }
      stats.files = totalDeleted;

      setResetStats(stats);
      alert('Reset de Fábrica concluído com sucesso!');
      setResetConfirmation('');
    } catch (err: any) {
      alert('Erro no reset: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-zinc-200 px-6 h-16 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-zinc-900" />
          <span className="font-bold text-zinc-900">ImobiFlow Master</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-white border-r border-zinc-200 p-6 flex flex-col gap-8 z-50 transition-transform duration-300 md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="hidden md:flex items-center gap-3">
          <div className="p-2 bg-zinc-900 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-zinc-900">Master Admin</span>
        </div>
        
        <nav className="flex flex-col gap-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-100 text-zinc-900 font-bold">
            <LayoutDashboard className="w-5 h-5" />
            Configurações
          </div>
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-zinc-600 hover:text-red-600 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sair do Master
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Section 1: Gemini API Key */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 rounded-2xl">
                  <Key className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Configuração de IA</h2>
                  <p className="text-sm text-zinc-500">Motor de geração de anúncios.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Gemini API Key</label>
                  <div className="relative group">
                    <input 
                      type={showGeminiKey ? "text" : "password"}
                      value={geminiKey}
                      onChange={e => setGeminiKey(e.target.value)}
                      className="w-full p-4 pr-24 bg-zinc-50 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm transition-all"
                      placeholder="Cole a chave global aqui..."
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                        className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        title={showGeminiKey ? "Ocultar" : "Mostrar"}
                      >
                        {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={handleCopy}
                        disabled={!geminiKey}
                        className={cn(
                          "p-2 rounded-xl transition-all flex items-center gap-2",
                          copied 
                            ? "text-emerald-600 bg-emerald-50" 
                            : "text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30"
                        )}
                        title="Copiar chave"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Copiado</span>
                          </>
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-zinc-400 shrink-0" />
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Esta chave é global e oculta para o corretor. Ela alimenta todo o sistema de copywriting.
                  </p>
                </div>
              </div>

              <button 
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Salvar Chave Global
              </button>
            </div>

            {/* Section 2: Emergency Reset */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-50 rounded-2xl">
                  <ShieldAlert className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Recuperação de Emergência</h2>
                  <p className="text-sm text-zinc-500">Resetar para padrão de fábrica.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-2">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Este botão resetará o acesso do corretor para o padrão: 
                    <br />
                    <strong className="text-zinc-900">teste@imobiflow.com / admin123</strong>
                  </p>
                  <p className="text-[10px] text-zinc-400 italic">
                    O acesso antigo será invalidado no perfil e o usuário será obrigado a trocar a senha no primeiro login.
                  </p>
                </div>

                <button 
                  onClick={handleEmergencyReset}
                  disabled={recoveryLoading || !brokerProfile}
                  className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-red-100"
                >
                  {recoveryLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  Resetar Acesso do Corretor
                </button>
              </div>
            </div>

            {/* Section 4: Factory Reset */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-red-100 shadow-sm space-y-8 lg:col-span-2">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-50 rounded-2xl">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Reset de Fábrica</h2>
                  <p className="text-sm text-zinc-500">Apagar todos os dados e retornar ao estado zero.</p>
                </div>
              </div>

              <button 
                onClick={() => setIsResetModalOpen(true)}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200"
              >
                <Trash2 className="w-5 h-5" />
                Iniciar Reset Total
              </button>

              {resetStats && (
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 space-y-4">
                  <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Sistema Limpo com Sucesso
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Imóveis</p>
                      <p className="text-2xl font-bold text-emerald-600">{resetStats.properties}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Visualizações</p>
                      <p className="text-2xl font-bold text-emerald-600">{resetStats.views}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Bairros</p>
                      <p className="text-2xl font-bold text-emerald-600">{resetStats.neighborhoods}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Arquivos</p>
                      <p className="text-2xl font-bold text-emerald-600">{resetStats.files}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900">Operação Destrutiva</h2>
              <p className="text-zinc-500 leading-relaxed">
                Você está prestes a apagar <strong>todos os imóveis, fotos, bairros e estatísticas</strong> do sistema. Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                <p className="text-xs text-red-800 text-center font-medium">
                  Para confirmar, digite a frase abaixo:
                  <br />
                  <span className="text-lg font-black mt-2 block tracking-tighter">APAGAR TUDO</span>
                </p>
              </div>

              <input 
                type="text"
                value={resetConfirmation}
                onChange={e => setResetConfirmation(e.target.value)}
                className="w-full p-4 bg-zinc-50 rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-red-500 outline-none text-center font-bold uppercase"
                placeholder="Digite aqui..."
                autoFocus
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setIsResetModalOpen(false);
                  setResetConfirmation('');
                }}
                className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleFactoryReset}
                disabled={resetConfirmation !== 'APAGAR TUDO' || resetting}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {resetting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                Confirmar Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
