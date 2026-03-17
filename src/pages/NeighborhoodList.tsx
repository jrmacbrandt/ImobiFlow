import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Loader2, Search, ArrowLeft, ChevronRight, Home as HomeIcon } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { slugify } from '../lib/utils';
import { PublicHeader } from '../components/PublicHeader';

export function NeighborhoodList() {
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchNeighborhoods();
  }, []);

  async function fetchNeighborhoods() {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // 1. Tenta buscar da tabela oficial de bairros
    const { data: nbData } = await supabase
      .from('neighborhoods')
      .select('*')
      .order('nome');

    if (nbData && nbData.length > 0) {
      setNeighborhoods(nbData);
    } else {
      // 2. Fallback: Busca bairros únicos diretamente dos imóveis
      const { data: propData } = await supabase.from('properties').select('neighborhood, city');
      if (propData) {
        const uniqueMap = new Map();
        propData.forEach(p => {
          if (p.neighborhood) {
            const key = `${p.neighborhood}-${p.city}`;
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, {
                id: key,
                nome: p.neighborhood,
                cidade: p.city || 'Rio de Janeiro',
                slug: slugify(p.neighborhood)
              });
            }
          }
        });
        setNeighborhoods(Array.from(uniqueMap.values()).sort((a, b) => a.nome.localeCompare(b.nome)));
      }
    }
    setLoading(false);
  }

  const filteredNeighborhoods = neighborhoods.filter(nb => 
    nb.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nb.cidade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <PublicHeader />
      
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-12">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-900 mb-8 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Home
            </Link>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-2">
              <span className="text-emerald-600 font-bold text-xs uppercase tracking-[0.2em]">Explorar Regiões</span>
              <h1 className="text-5xl md:text-6xl font-black text-zinc-900 tracking-tighter leading-none">Nossos <br/> Bairros</h1>
              <p className="text-zinc-500 font-medium max-w-md">Encontre o lugar perfeito para morar explorando as melhores regiões do Rio e Baixada.</p>
            </div>
            
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300" />
              <input 
                type="text"
                placeholder="Buscar bairro ou cidade..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-4 pl-12 bg-white rounded-2xl border border-zinc-100 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-zinc-700"
              />
            </div>
          </div>

          {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-zinc-400 font-medium">Carregando bairros...</p>
          </div>
        ) : filteredNeighborhoods.length === 0 ? (
          <div className="bg-white p-20 rounded-[3rem] text-center border border-zinc-100 shadow-sm">
            <div className="bg-zinc-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Nenhum bairro encontrado</h3>
            <p className="text-zinc-500">Tente buscar por outro nome ou limpe sua busca.</p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-6 text-emerald-600 font-bold hover:underline"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredNeighborhoods.map((nb) => (
              <Link 
                key={nb.id} 
                to={`/imoveis?bairro=${encodeURIComponent(nb.nome)}`}
                className="group bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm hover:shadow-xl hover:shadow-zinc-200/40 transition-all duration-500 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                    <MapPin className="w-5 h-5 text-zinc-300 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">{nb.nome}</h3>
                    <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">{nb.cidade}</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Categories / Quick Links */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-zinc-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <HomeIcon className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl font-black tracking-tighter mb-4">Todos os Imóveis</h2>
              <p className="text-zinc-400 mb-8 max-w-xs">Veja nossa lista completa de casas e apartamentos em todas as regiões.</p>
              <Link 
                to="/imoveis" 
                className="inline-flex items-center gap-2 bg-white text-zinc-900 px-6 py-3 rounded-xl font-bold hover:bg-emerald-500 hover:text-white transition-all"
              >
                Ver Catálogo
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          
          <div className="bg-emerald-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Search className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl font-black tracking-tighter mb-4">Busca Avançada</h2>
              <p className="text-emerald-100 mb-8 max-w-xs">Use nossos filtros para encontrar exatamente o que você precisa.</p>
              <Link 
                to="/imoveis" 
                className="inline-flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all"
              >
                Filtrar Agora
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
