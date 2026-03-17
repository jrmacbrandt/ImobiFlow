import React, { useState, useEffect } from 'react';
import { X, Calendar, TrendingUp, Loader2, BarChart3, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface PropertyAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: any[];
}

type Period = '7d' | '30d' | 'all';

export function PropertyAnalyticsModal({ isOpen, onClose, properties }: PropertyAnalyticsModalProps) {
  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen, period]);

  async function fetchAnalytics() {
    const isDemoMode = localStorage.getItem('demo_mode') === 'true';
    
    if (isDemoMode) {
      setLoading(true);
      // Simular carregamento para realismo
      await new Promise(resolve => setTimeout(resolve, 600));
      setData([...properties].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date | null = null;

      if (period === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Buscar contagem de visualizações por imóvel
      const analyticsPromises = properties.map(async (prop) => {
        let query = supabase
          .from('property_views')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', prop.id);

        if (startDate) {
          query = query.gte('viewed_at', startDate.toISOString());
        }

        const { count, error } = await query;
        
        if (error) {
          console.error(`Erro ao buscar views para o imóvel ${prop.id}:`, error);
          return { ...prop, viewCount: 0 };
        }

        console.log(`Views para o imóvel ${prop.id}: ${count || 0}`);
        return { ...prop, viewCount: count || 0 };
      });

      const results = await Promise.all(analyticsPromises);
      // Ordenar por visualizações (decrescente)
      setData(results.sort((a, b) => b.viewCount - a.viewCount));
    } catch (err) {
      console.error('Erro geral no analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Analytics Detalhado</h2>
              </div>
              <p className="text-zinc-500 text-sm">Acompanhe o desempenho de cada imóvel em tempo real.</p>
            </div>
            <button 
              onClick={onClose}
              className="p-3 bg-white border border-zinc-200 rounded-2xl text-zinc-400 hover:text-zinc-900 hover:border-zinc-300 transition-all shadow-sm"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Filters */}
          <div className="p-6 bg-white border-b border-zinc-50 flex flex-wrap items-center gap-4">
            <div className="flex p-1 bg-zinc-100 rounded-2xl w-full md:w-auto">
              {(['7d', '30d', 'all'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                    period === p 
                      ? "bg-white text-zinc-900 shadow-sm" 
                      : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  {p === '7d' ? '7 Dias' : p === '30d' ? '30 Dias' : 'Tudo'}
                </button>
              ))}
            </div>
            
            <div className="ml-auto flex items-center gap-2 text-zinc-400 text-xs font-medium">
              <Clock className="w-4 h-4" />
              Atualizado agora
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                <p className="text-zinc-400 font-medium animate-pulse">Processando métricas...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="text-center py-20">
                <TrendingUp className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                <p className="text-zinc-500 font-medium">Nenhuma visualização registrada no período.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Table Header (Desktop) */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-zinc-50 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  <div className="col-span-6">Imóvel</div>
                  <div className="col-span-3 text-center">Cadastrado em</div>
                  <div className="col-span-3 text-right">Visualizações</div>
                </div>

                {/* List */}
                <div className="space-y-2">
                  {data.map((item) => (
                    <div 
                      key={item.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 md:p-6 bg-white border border-zinc-100 rounded-3xl hover:border-emerald-100 hover:shadow-lg hover:shadow-emerald-500/5 transition-all group"
                    >
                      <div className="col-span-1 md:col-span-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-50 shrink-0">
                          {item.images?.[0] ? (
                            <img src={item.images[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300">
                              <BarChart3 className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">{item.title}</p>
                          <p className="text-xs text-zinc-400">{item.neighborhood}, {item.city}</p>
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-3 flex items-center md:justify-center gap-2 text-zinc-500 text-sm">
                        <Calendar className="w-4 h-4 md:hidden" />
                        <span className="md:font-medium">{formatDate(item.created_at)}</span>
                      </div>

                      <div className="col-span-1 md:col-span-3 flex items-center justify-between md:justify-end gap-4">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest md:hidden">Views</span>
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-24 bg-zinc-100 rounded-full overflow-hidden hidden lg:block">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min((item.viewCount / (data[0].viewCount || 1)) * 100, 100)}%` }}
                              className="h-full bg-emerald-500"
                            />
                          </div>
                          <span className="text-2xl font-black text-zinc-900 tracking-tighter">{item.viewCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-zinc-50 border-t border-zinc-100 text-center">
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em]">ImobiFlow Analytics Engine v2.0</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
