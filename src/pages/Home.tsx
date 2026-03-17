import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, MapPin, Home as HomeIcon, Search, Star, Menu, X as CloseIcon, ChevronDown } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { cn, formatPrice } from '../lib/utils';
import { MOCK_PROPERTIES } from '../lib/mockData';

export function Home() {
  const [featuredProperties, setFeaturedProperties] = useState<any[]>([]);
  const [featuredList, setFeaturedList] = useState<any[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const heroRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      if (!isSupabaseConfigured()) {
        setFeaturedProperties(MOCK_PROPERTIES.slice(0, 5));
        setFeaturedList(MOCK_PROPERTIES.slice(0, 1));
        return;
      }

      // Busca o imóvel marcado como destaque
      let { data: featuredData } = await supabase
        .from('properties')
        .select('*')
        .eq('is_featured', true)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      const featured = featuredData && featuredData.length > 0 ? featuredData[0] : null;
      
      if (featured) {
        setFeaturedList([featured]);
      } else {
        // Fallback: Busca o imóvel mais antigo se nenhum estiver marcado (conforme pedido)
        let { data: defaultData } = await supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1);
        
        if (defaultData && defaultData.length > 0) {
          setFeaturedList(defaultData);
        }
      }

      // Busca bairros para o select
      const { data: nbData } = await supabase
        .from('neighborhoods')
        .select('*')
        .order('nome');
      
      if (nbData && nbData.length > 0) {
        setNeighborhoods(nbData);
      } else {
        // Fallback: Busca bairros únicos dos imóveis
        const { data: propData } = await supabase.from('properties').select('neighborhood');
        if (propData) {
          const uniqueNames = Array.from(new Set(propData.map(p => p.neighborhood).filter(Boolean)));
          const fallbackNBs = uniqueNames.map((name, index) => ({
            id: `fallback-${index}`,
            nome: name
          }));
          setNeighborhoods(fallbackNBs);
        }
      }

      const { data } = await supabase
        .from('properties')
        .select('*')
        .limit(5)
        .order('created_at', { ascending: false });
      
      if (data && data.length > 0) {
        setFeaturedProperties(data);
      } else {
        setFeaturedProperties([]);
      }
    }
    fetchData();
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredProperties.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredProperties.length) % featuredProperties.length);
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <PublicHeader />

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-4 relative overflow-hidden min-h-[80vh] flex items-center">
        {/* Decorative Background Elements */}
        <motion.div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-40"
        >
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/50 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-amber-100/50 blur-[100px] rounded-full" />
        </motion.div>

        <motion.div 
          className="max-w-7xl mx-auto text-center w-full"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
              Plataforma Imobiliária 2026
            </span>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-zinc-900 mb-8 leading-[0.9]">
              Encontre seu lugar no <br />
              <span className="text-emerald-600 italic font-serif">Rio e Baixada.</span>
            </h1>
            <p className="text-zinc-500 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
              A tecnologia do futuro para encontrar o seu lar hoje. Simples, rápido e com curadoria especializada.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Featured Properties Section */}
      {featuredList.length > 0 && (
        <section className="py-24 px-4 bg-zinc-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 text-amber-500 font-bold text-xs uppercase tracking-[0.2em] mb-10">
              <div className="h-[1px] w-8 bg-amber-500/30" />
              <Star className="w-4 h-4 text-amber-500" fill="#fbbf24" stroke="#fbbf24" />
              Destaque da Semana
            </div>
            
            <div className="grid grid-cols-1 gap-12">
              {featuredList.map((item) => (
                <Link key={item.id} to={`/imovel/${item.id}`} className="group block">
                  <div className="flex flex-col gap-8">
                    <div className="aspect-[16/10] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-zinc-300/50 relative bg-zinc-200">
                      {item.images && item.images.length > 0 ? (
                        <img 
                          src={item.images[0]} 
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400">
                          <HomeIcon className="w-12 h-12 opacity-20" />
                        </div>
                      )}
                      <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md text-zinc-900 px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-xl">
                        {item.purpose}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-500" />
                          {item.neighborhood}, {item.city}
                        </div>
                        <span className="font-bold text-zinc-500">#{item.property_code}</span>
                      </div>
                      <h2 className="text-3xl font-black text-zinc-900 tracking-tighter leading-tight group-hover:text-emerald-600 transition-colors">
                        {item.title}
                      </h2>
                      <p className="text-4xl font-black text-emerald-600 tracking-tight">{formatPrice(item.price)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Search Bar Section - Moved below Featured Properties */}
      <section className="py-12 px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto bg-white p-2 rounded-[2rem] shadow-2xl shadow-zinc-200/60 flex flex-col md:flex-row gap-2 border border-zinc-100"
        >
          <div className="flex-[2] flex flex-col justify-center px-8 py-4 border-b md:border-b-0 md:border-r border-zinc-100 relative group/select">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
              <MapPin className="w-3 h-3 text-emerald-500" />
              Onde você quer morar?
            </label>
            <div className="relative flex items-center">
              <select 
                value={selectedNeighborhood}
                onChange={e => setSelectedNeighborhood(e.target.value)}
                className="w-full outline-none text-zinc-900 font-bold bg-transparent appearance-none cursor-pointer pr-8 z-10"
              >
                <option value="">Todos os Bairros</option>
                {neighborhoods.map(nb => (
                  <option key={nb.id} value={nb.nome}>{nb.nome}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 w-4 h-4 text-zinc-400 group-hover/select:text-emerald-500 transition-colors pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 flex items-center px-6 gap-3 border-b md:border-b-0 md:border-r border-zinc-100 relative">
            <Search className="w-5 h-5 text-zinc-400 z-10" />
            <input 
              type="text"
              placeholder="Cód. Imóvel"
              maxLength={4}
              value={searchCode}
              onChange={e => setSearchCode(e.target.value.replace(/\D/g, ''))}
              className="w-full py-4 outline-none text-zinc-900 placeholder:text-zinc-400 font-medium bg-transparent"
            />
          </div>
          <Link 
            to={`/imoveis${selectedNeighborhood || searchCode ? '?' : ''}${selectedNeighborhood ? `bairro=${selectedNeighborhood}` : ''}${selectedNeighborhood && searchCode ? '&' : ''}${searchCode ? `codigo=${searchCode}` : ''}`}
            className="bg-zinc-900 text-white px-10 py-4 rounded-[1.5rem] font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-200"
          >
            <Search className="w-5 h-5" />
            Explorar Agora
          </Link>
        </motion.div>
      </section>

      {/* Featured Carousel */}
      <section className="py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-8">
          <h2 className="text-2xl font-bold text-zinc-900">Destaques Premium</h2>
        </div>

        <div className="max-w-7xl mx-auto relative group px-4">
          {featuredProperties.length > 0 ? (
            <>
              <div className="overflow-hidden">
                <div 
                  className="flex gap-6 transition-transform duration-500 ease-out" 
                  style={{ transform: `translateX(calc(-${currentIndex} * (100% + 1.5rem)))` }}
                >
                  {featuredProperties.map((property) => (
                    <motion.div 
                      key={property.id}
                      className="w-full shrink-0 bg-white rounded-3xl overflow-hidden border border-zinc-100 shadow-sm group/card"
                    >
                      <Link to={`/imovel/${property.id}`}>
                        <div className="aspect-[4/3] overflow-hidden relative bg-zinc-200">
                          {property.images && property.images.length > 0 ? (
                            <img 
                              src={property.images[0]} 
                              alt={property.title}
                              className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400">
                              <HomeIcon className="w-8 h-8 opacity-20" />
                            </div>
                          )}
                          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-zinc-900">
                            {property.purpose}
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              {property.neighborhood}, {property.city}
                            </div>
                            <span className="font-bold text-zinc-500">#{property.property_code}</span>
                          </div>
                          <h3 className="text-lg font-bold text-zinc-900 mb-1">{property.title}</h3>
                          <p className="text-emerald-600 font-bold text-xl">{formatPrice(property.price)}</p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>

              {featuredProperties.length > 1 && (
                <>
                  <button 
                    onClick={prevSlide} 
                    className="absolute left-6 top-[35%] -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-xl border border-zinc-100 hover:bg-white transition-all z-10"
                  >
                    <ChevronLeft className="w-6 h-6 text-zinc-900" />
                  </button>
                  <button 
                    onClick={nextSlide} 
                    className="absolute right-6 top-[35%] -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-xl border border-zinc-100 hover:bg-white transition-all z-10"
                  >
                    <ChevronRight className="w-6 h-6 text-zinc-900" />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-zinc-400 italic">
              Nenhum imóvel em destaque no momento.
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 text-zinc-400 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-white font-bold text-xl mb-2">ImobiFlow 2026</h3>
            <p className="text-sm">Sua jornada imobiliária começa aqui.</p>
          </div>
          <div className="flex gap-8 text-xs">
            <Link to="/login" className="hover:text-white transition-colors opacity-30">Acesso Restrito</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-zinc-800 text-center text-xs">
          © 2026 ImobiFlow. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
