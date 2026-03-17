import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Bed, Car, Filter, X, ArrowLeft, Heart, ChevronRight } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatPrice, cn, slugify, maskCurrency, parseCurrency } from '../lib/utils';
import { MOCK_PROPERTIES } from '../lib/mockData';

export function PropertyList() {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState<any[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    neighborhood: searchParams.get('bairro') || '',
    minPrice: '',
    maxPrice: '',
    purpose: '',
    propertyCode: searchParams.get('codigo') || ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProperties();
    fetchNeighborhoods();
  }, [filters]);

  async function fetchNeighborhoods() {
    if (!isSupabaseConfigured()) return;
    
    // 1. Tenta buscar da tabela oficial de bairros (com SEO)
    const { data: nbData } = await supabase.from('neighborhoods').select('*').order('nome');
    
    if (nbData && nbData.length > 0) {
      setNeighborhoods(nbData);
    } else {
      // 2. Fallback: Busca bairros únicos diretamente dos imóveis cadastrados
      const { data: propData } = await supabase.from('properties').select('neighborhood');
      if (propData) {
        const uniqueNames = Array.from(new Set(propData.map(p => p.neighborhood).filter(Boolean)));
        const fallbackNBs = uniqueNames.map((name, index) => ({
          id: `fallback-${index}`,
          nome: name,
          slug: slugify(name || '')
        }));
        setNeighborhoods(fallbackNBs);
      }
    }
  }

  async function fetchProperties() {
    setLoading(true);

    if (!isSupabaseConfigured()) {
      setProperties([]);
      setLoading(false);
      return;
    }

    let query = supabase.from('properties').select('*');

    if (filters.type) query = query.eq('type', filters.type);
    if (filters.purpose) query = query.eq('purpose', filters.purpose);
    if (filters.neighborhood) query = query.ilike('neighborhood', `%${filters.neighborhood}%`);
    if (filters.minPrice) query = query.gte('price', parseCurrency(filters.minPrice));
    if (filters.maxPrice) query = query.lte('price', parseCurrency(filters.maxPrice));
    if (filters.propertyCode) query = query.eq('property_code', filters.propertyCode);

    const { data } = await query.order('created_at', { ascending: false });
    if (data) setProperties(data);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <PublicHeader />
      
      <div className="pt-24 pb-16 px-4 relative">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <div className="mb-8">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Home
            </Link>
          </div>
          
          {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-2">
            <span className="text-emerald-600 font-bold text-xs uppercase tracking-[0.2em]">Catálogo 2026</span>
            <h1 className="text-5xl md:text-6xl font-black text-zinc-900 tracking-tighter leading-none">Imóveis <br/> Disponíveis</h1>
            <p className="text-zinc-500 font-medium">Explore as melhores oportunidades selecionadas para você.</p>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all shadow-lg",
              showFilters 
                ? "bg-zinc-900 text-white shadow-zinc-200" 
                : "bg-white text-zinc-900 border border-zinc-100 hover:bg-zinc-50 shadow-zinc-100"
            )}
          >
            <Filter className="w-5 h-5" />
            {showFilters ? 'Fechar Filtros' : 'Refinar Busca'}
          </button>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 48 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-2xl shadow-zinc-200/40 grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Finalidade</label>
                  <select 
                    value={filters.purpose}
                    onChange={e => setFilters({...filters, purpose: e.target.value})}
                    className="w-full p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-zinc-700 appearance-none cursor-pointer"
                  >
                    <option value="">Todos os Negócios</option>
                    <option value="Venda">Comprar</option>
                    <option value="Locação">Alugar</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Tipo de Imóvel</label>
                  <select 
                    value={filters.type}
                    onChange={e => setFilters({...filters, type: e.target.value})}
                    className="w-full p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-zinc-700 appearance-none cursor-pointer"
                  >
                    <option value="">Qualquer Tipo</option>
                    <option value="Apartamento">Apartamento</option>
                    <option value="Casa">Casa</option>
                    <option value="Terreno">Terreno</option>
                    <option value="Comercial">Comercial</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Localização</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 z-10" />
                    <select 
                      value={filters.neighborhood}
                      onChange={e => setFilters({...filters, neighborhood: e.target.value})}
                      className="w-full p-4 pl-12 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-zinc-700 appearance-none cursor-pointer"
                    >
                      <option value="">Todos os Bairros</option>
                      {neighborhoods.map(nb => (
                        <option key={nb.id} value={nb.nome}>{nb.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Preço Mínimo</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 font-bold">R$</span>
                    <input 
                      type="text"
                      value={filters.minPrice}
                      onChange={e => setFilters({...filters, minPrice: maskCurrency(e.target.value)})}
                      placeholder="0,00"
                      className="w-full p-4 pl-12 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-zinc-700 placeholder:text-zinc-300"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Preço Máximo</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 font-bold">R$</span>
                    <input 
                      type="text"
                      value={filters.maxPrice}
                      onChange={e => setFilters({...filters, maxPrice: maskCurrency(e.target.value)})}
                      placeholder="0,00"
                      className="w-full p-4 pl-12 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-zinc-700 placeholder:text-zinc-300"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Código do Imóvel</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 z-10" />
                    <input 
                      type="text"
                      maxLength={4}
                      value={filters.propertyCode}
                      onChange={e => setFilters({...filters, propertyCode: e.target.value.replace(/\D/g, '')})}
                      placeholder="Ex: 1234"
                      className="w-full p-4 pl-12 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-zinc-700 placeholder:text-zinc-300"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[400px] bg-zinc-200 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {properties.map((property) => (
              <motion.div 
                layout
                key={property.id}
                className="bg-white rounded-3xl overflow-hidden border border-zinc-100 shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 transition-all group"
              >
                <Link to={`/imovel/${property.id}`}>
                  <div className="aspect-[4/3] overflow-hidden relative bg-zinc-200">
                    {property.images && property.images.length > 0 ? (
                      <img 
                        src={property.images[0]} 
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        <MapPin className="w-8 h-8 opacity-20" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-zinc-900 uppercase tracking-tighter">
                      {property.purpose}
                    </div>
                    <div className="absolute bottom-4 left-4 bg-zinc-900/80 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-tighter">
                      #{property.property_code}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs mb-2">
                      <MapPin className="w-3 h-3" />
                      {property.neighborhood}, {property.city}
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 mb-1 line-clamp-1">{property.title}</h3>
                    <p className="text-emerald-600 font-bold text-xl mb-4">{formatPrice(property.price)}</p>
                    
                    <div className="flex items-center gap-4 pt-4 border-t border-zinc-50 text-zinc-500 text-sm">
                      <div className="flex items-center gap-1">
                        <Bed className="w-4 h-4" />
                        {property.bedrooms}
                      </div>
                      <div className="flex items-center gap-1">
                        <Car className="w-4 h-4" />
                        {property.parking_spots}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && properties.length === 0 && (
          <div className="text-center py-24">
            <div className="bg-zinc-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Nenhum imóvel encontrado</h3>
            <p className="text-zinc-500">Tente ajustar seus filtros para encontrar o que procura.</p>
            <button 
              onClick={() => setFilters({ type: '', neighborhood: '', minPrice: '', maxPrice: '', purpose: '', propertyCode: '' })}
              className="mt-6 text-emerald-600 font-bold hover:underline"
            >
              Limpar todos os filtros
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);
}
