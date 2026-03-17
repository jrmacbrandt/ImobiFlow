import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, ExternalLink, MapPin, DollarSign, Home as HomeIcon, Sparkles, Star, Loader2, BarChart3 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatPrice, cn, parseCurrency } from '../../lib/utils';
import { MOCK_PROPERTIES } from '../../lib/mockData';
import { PropertyAnalyticsModal } from '../../components/admin/PropertyAnalyticsModal';
import { AdminPropertyFilters } from '../../components/admin/AdminPropertyFilters';

export function AdminDashboard() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, views: 0 });
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    type: '',
    neighborhood: '',
    minPrice: '',
    maxPrice: '',
    search: '',
    propertyCode: ''
  });
  
  const [availableNeighborhoods, setAvailableNeighborhoods] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  useEffect(() => {
    fetchMyProperties();
    // Garantir que o body não esteja bloqueado por modais anteriores (comum em mobile)
    document.body.style.pointerEvents = 'auto';
    document.body.style.overflow = 'auto';
  }, [filters]);

  async function fetchMyProperties() {
    const isDemoMode = localStorage.getItem('demo_mode') === 'true';
    
    if (isDemoMode) {
      const demoProperties = MOCK_PROPERTIES.map((p, index) => {
        // Distribuindo 1250 views de forma realista: 450, 380, 270, 150
        const views = [450, 380, 270, 150];
        return { ...p, viewCount: views[index] || 0 };
      });
      setProperties(demoProperties);
      setStats({ total: MOCK_PROPERTIES.length, views: 1250 });
      setLoading(false);
      return;
    }

    let user = null;
    if (isSupabaseConfigured()) {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }
    
    if (user && isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('properties')
          .select('*')
          .eq('broker_id', user.id);
        
        // Apply Filters
        if (filters.type) query = query.eq('type', filters.type);
        if (filters.neighborhood) query = query.eq('neighborhood', filters.neighborhood);
        if (filters.minPrice) query = query.gte('price', parseCurrency(filters.minPrice));
        if (filters.maxPrice) query = query.lte('price', parseCurrency(filters.maxPrice));
        if (filters.search) query = query.ilike('title', `%${filters.search}%`);
        if (filters.propertyCode) query = query.eq('property_code', filters.propertyCode);

        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;

        let finalProperties = data || [];

        // Extrair bairros e tipos únicos para os filtros (apenas na primeira carga ou se não houver filtros)
        if (!filters.type && !filters.neighborhood && !filters.minPrice && !filters.maxPrice && !filters.search && !filters.propertyCode) {
          const neighborhoods = Array.from(new Set(finalProperties.map(p => p.neighborhood))).filter(Boolean) as string[];
          const types = Array.from(new Set(finalProperties.map(p => p.type))).filter(Boolean) as string[];
          setAvailableNeighborhoods(neighborhoods.sort());
          setAvailableTypes(types.sort());
        }

        // Buscar total de visualizações para todos os imóveis do corretor
        const propertyIds = finalProperties.map(p => p.id);
        let totalViews = 0;
        
        if (propertyIds.length > 0) {
          const { count, error: viewsError } = await supabase
            .from('property_views')
            .select('*', { count: 'exact', head: true })
            .in('property_id', propertyIds);
          
          if (viewsError) {
            console.error('Erro ao buscar total de visualizações:', viewsError);
          } else {
            totalViews = count || 0;
            console.log(`Total de visualizações recuperado: ${totalViews} para ${propertyIds.length} imóveis`);
          }
        }

        setProperties(finalProperties);
        setStats({ total: finalProperties.length, views: totalViews });
        setLoading(false);
        return;
      } catch (err: any) {
        console.error('Erro ao buscar imóveis do Supabase:', err.message);
        setProperties([]);
        setStats({ total: 0, views: 0 });
      }
    } else {
      setProperties([]);
      setStats({ total: 0, views: 0 });
    }

    setLoading(false);
  }

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    
    console.log('Executando exclusão definitiva para ID:', id);
    
    if (!isSupabaseConfigured()) {
      alert('Erro: Supabase não configurado.');
      return;
    }

    setDeletingId(id);
    setConfirmDeleteId(null);
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Sessão expirada ou usuário não autenticado.');
      }

      const propertyToDelete = properties.find(p => String(p.id) === String(id));
      if (!propertyToDelete) {
        throw new Error('Imóvel não encontrado.');
      }

      const wasFeatured = propertyToDelete.is_featured;
      const imageUrls = propertyToDelete.images || [];

      // 1. Limpar Storage
      if (imageUrls.length > 0) {
        const filePaths = imageUrls
          .map((url: string) => {
            if (!url) return null;
            try {
              const urlObj = new URL(url);
              const pathParts = urlObj.pathname.split('/');
              return pathParts[pathParts.length - 1];
            } catch (e) {
              const parts = url.split('/');
              return parts[parts.length - 1];
            }
          })
          .filter((path): path is string => !!path);

        if (filePaths.length > 0) {
          await supabase.storage.from('property-images').remove(filePaths);
        }
      }

      // 2. Excluir do Banco
      const { error: deleteError } = await supabase
        .from('properties')
        .delete()
        .eq('id', id)
        .eq('broker_id', user.id);

      if (deleteError) throw deleteError;

      // 3. Atualizar Interface
      const updatedProperties = properties.filter(p => String(p.id) !== String(id));
      
      if (wasFeatured && updatedProperties.length > 0) {
        const mostRecent = updatedProperties[0];
        await supabase.from('properties').update({ is_featured: true }).eq('id', mostRecent.id);
      }
      
      setProperties(updatedProperties);
      setStats(prev => ({ ...prev, total: updatedProperties.length }));

      // 4. Limpeza de bairros órfãos (Deep Audit)
      try {
        const { data: otherProps } = await supabase
          .from('properties')
          .select('id')
          .eq('neighborhood', propertyToDelete.neighborhood)
          .eq('city', propertyToDelete.city)
          .limit(1);
        
        if (!otherProps || otherProps.length === 0) {
          await supabase
            .from('neighborhoods')
            .delete()
            .eq('nome', propertyToDelete.neighborhood)
            .eq('cidade', propertyToDelete.city);
        }
      } catch (nbErr) {
        console.warn('Erro ao limpar bairro órfão:', nbErr);
      }

      alert('Imóvel removido com sucesso.');
    } catch (err: any) {
      console.error('Falha na exclusão:', err);
      alert('ERRO: ' + (err.message || 'Falha na comunicação com o servidor.'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleFeatured = async (id: string) => {
    if (processingId) return;
    
    // 1. Guardar estado anterior para rollback
    const previousProperties = [...properties];
    
    // 2. Optimistic Update: Atualizar UI imediatamente
    setProperties(prev => prev.map(p => ({
      ...p,
      is_featured: p.id === id
    })));

    setProcessingId(id);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 3. Operação no Banco
      // Primeiro desmarcamos todos do corretor
      const { error: error1 } = await supabase
        .from('properties')
        .update({ is_featured: false })
        .eq('broker_id', user.id);
      
      if (error1) throw error1;

      // Depois marcamos o novo com timestamp de atualização para garantir prioridade na home
      const { error: error2 } = await supabase
        .from('properties')
        .update({ 
          is_featured: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error2) throw error2;

      console.log(`Imóvel ${id} marcado como destaque com sucesso.`);
    } catch (err: any) {
      console.error('Erro ao atualizar destaque:', err);
      // 4. Rollback em caso de erro
      setProperties(previousProperties);
      alert('Erro ao atualizar destaque: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500">Gerencie seus imóveis e acompanhe o desempenho.</p>
        </div>
        <Link 
          to="/admin/novo"
          className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
        >
          <Plus className="w-5 h-5" />
          Novo Imóvel
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-xl hover:shadow-zinc-200/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-zinc-50 rounded-2xl group-hover:bg-emerald-50 transition-colors">
              <HomeIcon className="w-6 h-6 text-zinc-400 group-hover:text-emerald-600 transition-colors" />
            </div>
            <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Ativos</span>
          </div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Total de Imóveis</p>
          <p className="text-5xl font-black text-zinc-900 tracking-tighter">{stats.total}</p>
        </div>
        
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-xl hover:shadow-zinc-200/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-zinc-50 rounded-2xl group-hover:bg-blue-50 transition-colors">
              <BarChart3 className="w-6 h-6 text-zinc-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <button 
              onClick={() => setIsAnalyticsOpen(true)}
              className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
            >
              Ver Detalhes
            </button>
          </div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Visualizações</p>
          <p className="text-5xl font-black text-zinc-900 tracking-tighter">{stats.views}</p>
        </div>

        <div className="bg-zinc-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-zinc-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Sparkles className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Inteligência Artificial</span>
            </div>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Status do Motor</p>
            <p className="text-2xl font-black tracking-tight">Gemini 2.5 Pro</p>
            <p className="text-zinc-500 text-[10px] mt-4 font-medium">Otimizando seus anúncios em tempo real.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <AdminPropertyFilters 
        filters={filters}
        setFilters={setFilters}
        neighborhoods={availableNeighborhoods}
        propertyTypes={availableTypes}
      />

      {/* Property List */}
      <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden touch-manipulation">
        <div className="p-6 border-b border-zinc-50 flex items-center justify-between">
          <h2 className="font-bold text-zinc-900">Meus Imóveis</h2>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-zinc-400">Carregando seus imóveis...</div>
        ) : properties.length === 0 ? (
          <div className="p-20 text-center">
            <div className="bg-zinc-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-zinc-300" />
            </div>
            <p className="text-zinc-500 mb-6">Você ainda não cadastrou nenhum imóvel.</p>
            <Link to="/admin/novo" className="text-emerald-600 font-bold hover:underline">Começar agora</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <table className="w-full text-left hidden md:table">
              <thead>
                <tr className="bg-zinc-50 text-zinc-400 text-[10px] uppercase tracking-widest font-bold">
                  <th className="px-6 py-4">Imóvel</th>
                  <th className="px-6 py-4">Localização</th>
                  <th className="px-6 py-4">Preço</th>
                  <th className="px-6 py-4 text-center">Destaque</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {properties.map((property) => (
                  <tr key={property.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 shrink-0 flex items-center justify-center">
                          {property.images && property.images.length > 0 ? (
                            <img 
                              src={property.images[0]} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <HomeIcon className="w-5 h-5 text-zinc-300" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900 line-clamp-1">{property.title}</p>
                          <p className="text-xs text-zinc-400">
                            #{property.property_code || '----'} • {property.type} • {property.purpose}
                            {property.viewCount !== undefined && ` • ${property.viewCount} views`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-zinc-500 text-sm">
                        <MapPin className="w-3 h-3" />
                        {property.neighborhood}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-emerald-600 text-sm">{formatPrice(property.price)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleFeatured(property.id);
                        }}
                        disabled={processingId === property.id}
                        className={cn(
                          "p-3 rounded-xl transition-all relative z-10 touch-manipulation",
                          property.is_featured 
                            ? "bg-amber-50 text-amber-500 shadow-sm" 
                            : "text-zinc-300 hover:text-amber-400 hover:bg-amber-50/50",
                          processingId === property.id && "opacity-50 cursor-wait"
                        )}
                        title={property.is_featured ? "Imóvel em destaque" : "Marcar como destaque"}
                      >
                        {processingId === property.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Star 
                            className={cn("w-5 h-5", property.is_featured ? "text-amber-500" : "text-zinc-300")} 
                            fill={property.is_featured ? "#fbbf24" : "none"}
                            stroke={property.is_featured ? "#fbbf24" : "currentColor"}
                          />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          to={`/imovel/${property.id}`} 
                          target="_blank"
                          className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors relative z-10"
                          title="Ver no site"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Link 
                          to={`/admin/editar/${property.id}`}
                          className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors relative z-10"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <div className="relative">
                          {confirmDeleteId === property.id ? (
                            <div className="absolute right-0 top-0 flex items-center gap-2 bg-white p-1 rounded-xl shadow-lg border border-red-100 z-[110]">
                              <button
                                onClick={() => handleDelete(property.id)}
                                className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="bg-zinc-100 text-zinc-600 px-3 py-1 rounded-lg text-xs font-bold"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConfirmDeleteId(property.id);
                              }}
                              disabled={deletingId === property.id}
                              className={cn(
                                "p-4 transition-all relative z-[100] cursor-pointer outline-none active:scale-95 touch-manipulation",
                                deletingId === property.id ? "text-zinc-300" : "text-zinc-400 hover:text-red-600"
                              )}
                              title="Excluir"
                            >
                              {deletingId === property.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Trash2 className="w-5 h-5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-zinc-100">
              {properties.map((property) => (
                <div key={property.id} className="p-4 space-y-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-zinc-100 shrink-0 flex items-center justify-center">
                      {property.images && property.images.length > 0 ? (
                        <img 
                          src={property.images[0]} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <HomeIcon className="w-8 h-8 text-zinc-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-900 line-clamp-1">{property.title}</p>
                      <p className="text-xs text-zinc-400 mb-1">
                        #{property.property_code || '----'} • {property.type} • {property.purpose}
                        {property.viewCount !== undefined && ` • ${property.viewCount} views`}
                      </p>
                      <p className="font-bold text-emerald-600">{formatPrice(property.price)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1 text-zinc-500 text-xs">
                      <MapPin className="w-3 h-3" />
                      {property.neighborhood}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleFeatured(property.id);
                        }}
                        disabled={processingId === property.id}
                        className={cn(
                          "p-3 rounded-xl transition-all relative z-10 touch-manipulation",
                          property.is_featured 
                            ? "bg-amber-50 text-amber-500 shadow-sm" 
                            : "text-zinc-300 hover:text-amber-400 hover:bg-amber-50/50",
                          processingId === property.id && "opacity-50 cursor-wait"
                        )}
                      >
                        {processingId === property.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Star 
                            className={cn("w-5 h-5", property.is_featured ? "text-amber-500" : "text-zinc-300")} 
                            fill={property.is_featured ? "#fbbf24" : "none"}
                            stroke={property.is_featured ? "#fbbf24" : "currentColor"}
                          />
                        )}
                      </button>
                      <Link 
                        to={`/admin/editar/${property.id}`}
                        className="p-3 rounded-xl text-zinc-400 hover:text-emerald-600 transition-colors bg-zinc-50"
                      >
                        <Edit className="w-5 h-5" />
                      </Link>
                      <div className="relative">
                        {confirmDeleteId === property.id ? (
                          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-xl border border-red-100 z-[110]">
                            <button
                              onClick={() => handleDelete(property.id)}
                              className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold"
                            >
                              Confirmar Exclusão
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="bg-zinc-100 text-zinc-600 px-4 py-2 rounded-xl text-sm font-bold"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setConfirmDeleteId(property.id);
                            }}
                            disabled={deletingId === property.id}
                            className={cn(
                              "p-6 rounded-2xl transition-all bg-zinc-50 relative z-[100] cursor-pointer outline-none active:scale-95 flex items-center justify-center min-w-[56px] min-h-[56px] touch-manipulation",
                              deletingId === property.id ? "text-zinc-300" : "text-zinc-400 hover:text-red-600 active:bg-red-50"
                            )}
                          >
                            {deletingId === property.id ? (
                              <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                              <Trash2 className="w-6 h-6" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <PropertyAnalyticsModal 
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        properties={properties}
      />
    </div>
  );
}
