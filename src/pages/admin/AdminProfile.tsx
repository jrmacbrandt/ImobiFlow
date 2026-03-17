import React, { useState, useEffect } from 'react';
import { Save, User as UserIcon, Phone, Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { MOCK_PROFILE } from '../../lib/mockData';

export function AdminProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [credLoading, setCredLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    creci: '',
    whatsapp_number: ''
  });

  const [creds, setCreds] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    async function getProfile() {
      const isDemoMode = localStorage.getItem('demo_mode') === 'true';
      if (isDemoMode) {
        setProfile(MOCK_PROFILE);
        setCreds(prev => ({ ...prev, email: 'demo@imobiflow.com' }));
        return;
      }

      let user = null;
      if (isSupabaseConfigured()) {
        const { data } = await supabase.auth.getUser();
        user = data.user;
        if (user) setCreds(prev => ({ ...prev, email: user.email || '' }));
      }
      
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setProfile(data);
          return;
        }
      }
      
      // Fallback para mock se não houver usuário ou erro no banco
      setProfile(MOCK_PROFILE);
    }
    getProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (localStorage.getItem('demo_mode') === 'true') {
      alert('Modo Demonstração: Alterações não são salvas.');
      return;
    }
    
    if (!isSupabaseConfigured()) {
      alert('Modo de Teste: Alterações não serão persistidas sem login real.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Usuário não autenticado.');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...profile,
        updated_at: new Date().toISOString()
      });

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "profiles" does not exist')) {
        alert('Erro: A tabela "profiles" não foi encontrada no seu banco de dados. Por favor, use a página de diagnóstico para criar as tabelas.');
      } else {
        alert('Erro ao salvar perfil: ' + error.message);
      }
    } else {
      alert('Perfil atualizado com sucesso!');
    }
    setLoading(false);
  };

  const handleUpdateCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) return;
    
    if (creds.password && creds.password !== creds.confirmPassword) {
      alert('As senhas não coincidem.');
      return;
    }

    setCredLoading(true);
    try {
      if (creds.password) {
        const { error } = await supabase.auth.updateUser({ password: creds.password });
        if (error) throw error;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (creds.email && creds.email !== user?.email) {
        const { error } = await supabase.auth.updateUser({ email: creds.email });
        if (error) throw error;
        alert('E-mail atualizado com sucesso!');
      } else if (creds.password) {
        alert('Senha atualizada com sucesso!');
      }
      
      setCreds(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err: any) {
      alert('Erro ao atualizar credenciais: ' + err.message);
    } finally {
      setCredLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <button 
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-all shadow-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>
      <h1 className="text-3xl font-bold mb-2 text-zinc-900">Meu Perfil</h1>
      <p className="text-zinc-500 mb-8">Gerencie suas informações profissionais de acesso ao painel.</p>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Informações Profissionais */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-emerald-600" />
            Dados do Corretor
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Nome Completo</label>
              <input 
                type="text"
                value={profile.full_name}
                onChange={e => setProfile({...profile, full_name: e.target.value})}
                className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">CRECI (Obrigatório)</label>
              <input 
                type="text"
                value={profile.creci}
                onChange={e => setProfile({...profile, creci: e.target.value})}
                className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Ex: 12345-F"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="text"
                  value={profile.whatsapp_number}
                  onChange={e => setProfile({...profile, whatsapp_number: e.target.value})}
                  className="w-full pl-10 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="Ex: 21999999999"
                />
              </div>
            </div>
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full md:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>

      {/* Alteração de Credenciais */}
      <div className="mt-12 pt-12 border-t border-zinc-100">
        <h2 className="text-2xl font-bold mb-2 text-zinc-900">Segurança e Acesso</h2>
        <p className="text-zinc-500 mb-8">Altere seu e-mail de login e senha de acesso ao painel.</p>

        <form onSubmit={handleUpdateCreds} className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">E-mail de Acesso</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="email"
                  value={creds.email}
                  onChange={e => setCreds({...creds, email: e.target.value})}
                  className="w-full pl-10 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Nova Senha (deixe em branco para não alterar)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={creds.password}
                  onChange={e => setCreds({...creds, password: e.target.value})}
                  className="w-full pl-10 pr-10 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {creds.password && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={creds.confirmPassword}
                    onChange={e => setCreds({...creds, confirmPassword: e.target.value})}
                    className="w-full pl-10 pr-10 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit"
            disabled={credLoading}
            className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {credLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
            Atualizar Credenciais
          </button>
        </form>
      </div>
    </div>
  );
}
