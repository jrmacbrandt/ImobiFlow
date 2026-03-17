import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, User, PlusCircle, LogOut, Loader2, AlertCircle, Menu, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tableError, setTableError] = useState(false);

  useEffect(() => {
    async function checkTables() {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('properties').select('count', { count: 'exact', head: true });
        if (error) setTableError(true);
      }
      setLoading(false);
    }
    checkTables();
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    localStorage.removeItem('demo_mode');
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const navLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/novo', icon: PlusCircle, label: 'Novo Imóvel' },
    { to: '/admin/perfil', icon: User, label: 'Meu Perfil' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-zinc-200 px-6 h-16 flex items-center justify-between sticky top-0 z-40">
        <div className="text-lg font-bold text-emerald-600">ImobiFlow Admin</div>
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
        <div className="hidden md:block text-xl font-bold text-emerald-600">ImobiFlow Admin</div>
        
        {tableError && isSupabaseConfigured() && (
          <Link to="/diagnostico" className="bg-red-50 p-3 rounded-xl border border-red-100 flex gap-2 items-start hover:bg-red-100 transition-colors">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-800 leading-tight">
              <strong>Erro de Banco:</strong> Tabelas não encontradas. Clique aqui para diagnosticar.
            </p>
          </Link>
        )}

        {!isSupabaseConfigured() && (
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-800 leading-tight">
              <strong>Modo Demo:</strong> Supabase não configurado. Algumas funções de salvamento podem não funcionar.
            </p>
          </div>
        )}

        <nav className="flex flex-col gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link 
                key={link.to}
                to={link.to} 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all",
                  isActive 
                    ? "bg-emerald-50 text-emerald-600 font-bold" 
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-emerald-600"
                )}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-zinc-600 hover:text-red-600 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
