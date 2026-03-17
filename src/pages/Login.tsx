import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Mail, Lock, Loader2, ArrowRight, ArrowLeft, Eye, EyeOff, Database, Sparkles } from 'lucide-react';

export function Login() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  
  React.useEffect(() => {
    localStorage.removeItem('demo_mode');
  }, []);

  const enterDemoMode = () => {
    localStorage.setItem('demo_mode', 'true');
    navigate('/admin');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured()) {
      setLoading(true);
      setTimeout(() => {
        navigate('/admin');
        setLoading(false);
      }, 500);
      return;
    }

    setLoading(true);
    
    // Master Admin Login (Hardcoded)
    if (email === 'jrmacbrandt@gmail.com' && password === 'Ze001300$') {
      localStorage.setItem('master_admin', 'true');
      navigate('/admin-master');
      return;
    }

    // Timeout para a tentativa de login
    const loginTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        alert('A tentativa de login demorou demais. Por favor, verifique sua conexão ou tente novamente.');
      }
    }, 15000);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      clearTimeout(loginTimeout);
      
      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        
        if (error.message.includes('Email not confirmed')) {
          alert('ERRO: E-mail não confirmado.\n\nO Supabase ainda acha que este e-mail precisa de confirmação. Verifique se você salvou a alteração no painel (Authentication > Providers > Email > Confirm Email = OFF).');
          return;
        }
        if (error.message.includes('Invalid login credentials')) {
          alert('ERRO: Credenciais inválidas.\n\nO e-mail ou a senha estão incorretos. Tente resetar o usuário na página de diagnóstico.');
          return;
        }
        
        // Se for qualquer outro erro, mostra a mensagem técnica
        alert(`ERRO TÉCNICO (${error.status || 'Auth'}): ${error.message}`);
        return;
      }
      
      if (data.session) {
        // Check for must_change_password flag
        const { data: profile } = await supabase
          .from('profiles')
          .select('must_change_password, requires_password_change')
          .eq('id', data.session.user.id)
          .maybeSingle();
        
        if (profile?.must_change_password || profile?.requires_password_change) {
          navigate('/setup-account');
        } else {
          navigate('/admin');
        }
      } else {
        alert('Login realizado, mas nenhuma sessão foi criada. Tente novamente.');
      }
    } catch (err: any) {
      clearTimeout(loginTimeout);
      alert('Erro inesperado: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl shadow-zinc-200/50 w-full max-w-md border border-zinc-100 relative">
        <Link 
          to="/" 
          className="absolute top-8 left-8 p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-full transition-all"
          title="Voltar para Home"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="text-center mb-10">
          <Link to="/" className="text-3xl font-bold tracking-tighter text-emerald-600 mb-4 inline-block">
            ImobiFlow<span className="text-zinc-900">2026</span>
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">
            Acesso Restrito
          </h1>
          <p className="text-zinc-500 text-sm mt-2">
            Acesse seu painel administrativo.
            <br />
            <button 
              type="button"
              onClick={() => {
                setEmail('teste@imobiflow.com');
                setPassword('admin123');
              }}
              className="text-[10px] text-zinc-400 hover:text-emerald-600 underline transition-colors"
            >
              Usar dados temporários (teste@imobiflow.com / admin123)
            </button>
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
              <input 
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-12 p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
              <input 
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="••••••••"
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

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-200"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
            Entrar no Painel
          </button>
        </form>

        <div className="pt-6 border-t border-zinc-100 mt-6">
          <button 
            type="button"
            onClick={enterDemoMode}
            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-zinc-500 hover:text-emerald-600 transition-colors group"
          >
            <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
            Entrar em Modo Demonstração
          </button>
          <p className="text-[9px] text-zinc-400 text-center mt-1">
            Explore o painel com dados fictícios sem precisar de login.
          </p>
        </div>
      </div>
    </div>
  );
}
