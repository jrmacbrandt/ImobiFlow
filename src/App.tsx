import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { ScrollToTop } from './components/ScrollToTop';
import { PropertyList } from './pages/PropertyList';
import { PropertyDetail } from './pages/PropertyDetail';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProfile } from './pages/admin/AdminProfile';
import { AdminPropertyForm } from './pages/admin/AdminPropertyForm';
import { AdminMaster } from './pages/admin/AdminMaster';
import { Login } from './pages/Login';
import { NeighborhoodPage } from './pages/NeighborhoodPage';
import { NeighborhoodList } from './pages/NeighborhoodList';
import { ForceChangePassword } from './pages/ForceChangePassword';
import { SupabaseCheck } from './pages/SupabaseCheck';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Loader2 } from 'lucide-react';

function ProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [mustChange, setMustChange] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth check safety timeout triggered');
        setLoading(false);
      }
    }, 10000);

    async function checkAuth() {
      try {
        // Bypass para modo demonstração
        if (localStorage.getItem('demo_mode') === 'true') {
          if (mounted) setLoading(false);
          return;
        }

        if (!isSupabaseConfigured()) {
          if (mounted) setLoading(false);
          return;
        }

        // Try getSession first as it's faster and usually enough for initial check
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (!currentSession) {
          // If no session, try getUser just in case
          const { data: { user } } = await supabase.auth.getUser();
          if (!mounted) return;
          if (!user) {
            setSession(null);
            setLoading(false);
            return;
          }
        }

        setSession(currentSession || { user: (await supabase.auth.getUser()).data.user });

        const user = currentSession?.user || (await supabase.auth.getUser()).data.user;
        if (!user) {
          console.warn('No user found after detection, retrying once...');
          const { data: { user: retryUser } } = await supabase.auth.getUser();
          if (!retryUser) {
            setLoading(false);
            return;
          }
        }

        // Check if setup is completed via profiles table
        try {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('must_change_password, requires_password_change')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profileErr) {
            console.error('Error fetching profile:', profileErr);
            // Se houver erro e for o usuário teste, bloqueia por segurança
            if (user.email === 'teste@imobiflow.com') setMustChange(true);
          } else if (profile) {
            setMustChange(profile.must_change_password === true || profile.requires_password_change === true);
          } else {
            // Se não houver perfil e for o usuário teste, bloqueia
            if (user.email === 'teste@imobiflow.com') setMustChange(true);
          }
        } catch (e) {
          console.warn('Profile check error:', e);
          if (user.email === 'teste@imobiflow.com') setMustChange(true);
        }
      } catch (err) {
        console.error('Critical auth check error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
        if (event === 'SIGNED_OUT') {
          setMustChange(false);
          setLoading(false);
          localStorage.removeItem('demo_mode');
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-zinc-500 text-sm font-medium">Verificando acesso...</p>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="text-xs text-zinc-400 hover:text-zinc-600 underline mt-4"
          >
            Cancelar e Sair
          </button>
        </div>
      </div>
    );
  }

  if (!session && isSupabaseConfigured() && localStorage.getItem('demo_mode') !== 'true') return <Navigate to="/login" replace />;
  if (mustChange && localStorage.getItem('demo_mode') !== 'true') return <Navigate to="/setup-account" replace />;

  return <Outlet />;
}

function MasterProtectedRoute() {
  const navigate = useNavigate();
  const [isMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaster = () => {
      const master = localStorage.getItem('master_admin') === 'true';
      setIsMaster(master);
      setLoading(false);
      if (!master) navigate('/login');
    };
    checkMaster();
  }, [navigate]);

  if (loading) return null;
  return isMaster ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/imoveis" element={<PropertyList />} />
        <Route path="/bairros" element={<NeighborhoodList />} />
        <Route path="/imoveis/:slug" element={<NeighborhoodPage />} />
        <Route path="/imovel/:id" element={<PropertyDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/diagnostico" element={<SupabaseCheck />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="perfil" element={<AdminProfile />} />
            <Route path="novo" element={<AdminPropertyForm />} />
            <Route path="editar/:id" element={<AdminPropertyForm />} />
          </Route>
        </Route>
        
        <Route path="/setup-account" element={<ForceChangePassword />} />

        {/* Master Admin Route */}
        <Route path="/admin-master" element={<MasterProtectedRoute />}>
          <Route index element={<AdminMaster />} />
        </Route>
      </Routes>
    </Router>
  );
}
