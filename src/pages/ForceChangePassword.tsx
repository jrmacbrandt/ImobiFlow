import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Lock, Mail, Loader2, ShieldAlert, Eye, EyeOff, Database } from 'lucide-react';

export function ForceChangePassword() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      if (!isSupabaseConfigured()) return;
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!mounted) return;

        if (error || !user) {
          console.warn('No user found in ForceChangePassword, redirecting to login');
          navigate('/login', { replace: true });
        } else {
          setNewEmail(user.email || '');
        }
      } catch (err) {
        console.error('Error checking session in ForceChangePassword:', err);
        if (mounted) navigate('/login', { replace: true });
      }
    }
    checkSession();
    return () => { mounted = false; };
  }, [navigate]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) throw new Error('Usuário não autenticado corretamente. Por favor, faça login novamente.');

      console.log('Iniciando atualização de segurança para:', currentUser.id);

      // 1. Atualizar Senha e E-mail no Supabase Auth
      // A atualização do e-mail invalida o e-mail antigo (teste@imobiflow.com)
      const updateData: any = { password: newPassword };
      if (newEmail && newEmail !== currentUser.email) {
        updateData.email = newEmail;
      }

      const { error: authError } = await supabase.auth.updateUser(updateData);
      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Este e-mail já está em uso por outra conta.');
        }
        throw authError;
      }

      // 2. Atualizar o perfil para marcar que o setup foi concluído
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: currentUser.id,
          must_change_password: false,
          requires_password_change: false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      
      if (profileError) {
        console.error('Erro ao atualizar perfil:', profileError);
        // Tentativa de update simples se o upsert falhar
        await supabase
          .from('profiles')
          .update({ 
            must_change_password: false,
            requires_password_change: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentUser.id);
      }

      alert('Configuração de segurança concluída com sucesso! Suas novas credenciais já estão ativas.');

      // Forçar atualização da sessão local
      await supabase.auth.refreshSession();
      
      // Redirecionar para o painel
      navigate('/admin', { replace: true });

    } catch (err: any) {
      console.error('Erro completo no handleUpdate:', err);
      alert('Erro crítico: ' + (err.message || 'Erro desconhecido ao salvar dados.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 px-4">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border border-zinc-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Segurança Obrigatória</h1>
          <p className="text-zinc-500 text-sm mt-2">
            Você está usando credenciais provisórias. Por favor, altere seu e-mail e senha para continuar.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Novo E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
              <input 
                type="email"
                required
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="w-full pl-12 p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="seu-novo@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Nova Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
              <input 
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full pl-12 pr-12 p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Mínimo 8 caracteres"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Confirmar Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
              <input 
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-12 p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Repita a nova senha"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Atualizar e Acessar'}
          </button>

          <div className="mt-6 pt-6 border-t border-zinc-100 text-center">
            <Link 
              to="/diagnostico" 
              className="text-[10px] text-zinc-400 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1"
            >
              <Database className="w-3 h-3" />
              Problemas ao salvar? Verifique o banco de dados
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
