import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Home as HomeIcon, 
  Search, 
  Star, 
  Menu, 
  X as CloseIcon, 
  ChevronDown,
  MessageCircle,
  BookOpen,
  UserCheck,
  Award,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  Phone,
  Mail,
  Instagram,
  Linkedin,
  Clock
} from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { cn, formatPrice } from '../lib/utils';
import { MOCK_PROPERTIES } from '../lib/mockData';

// --- SEO Metadata (JSON-LD) ---
const StructuredData = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": "ImobiFlow 2026",
    "image": "https://imobiflow-peach.vercel.app/logo.png",
    "@id": "https://imobiflow-peach.vercel.app",
    "url": "https://imobiflow-peach.vercel.app",
    "telephone": "+5521999999999",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Av. das Américas, 500",
      "addressLocality": "Rio de Janeiro",
      "addressRegion": "RJ",
      "postalCode": "22640-100",
      "addressCountry": "BR"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": -23.000371,
      "longitude": -43.365894
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday"
      ],
      "opens": "09:00",
      "closes": "18:00"
    },
    "sameAs": [
      "https://facebook.com/imobiflow",
      "https://instagram.com/imobiflow",
      "https://linkedin.com/company/imobiflow"
    ]
  };

  return (
    <script type="application/ld+json">
      {JSON.stringify(jsonLd)}
    </script>
  );
};

export function Home() {
  const [featuredProperties, setFeaturedProperties] = useState<any[]>([]);
  const [featuredList, setFeaturedList] = useState<any[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
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

      // 1. Busca Imóveis
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
        let { data: defaultData } = await supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1);
        if (defaultData && defaultData.length > 0) setFeaturedList(defaultData);
      }

      // 2. Busca Bairros
      const { data: nbData } = await supabase.from('neighborhoods').select('*').order('nome');
      if (nbData && nbData.length > 0) {
        setNeighborhoods(nbData);
      } else {
        const { data: propData } = await supabase.from('properties').select('neighborhood');
        if (propData) {
          const uniqueNames = Array.from(new Set(propData.map(p => p.neighborhood).filter(Boolean)));
          const fallbackNBs = uniqueNames.map((name, index) => ({ id: `fallback-${index}`, nome: name }));
          setNeighborhoods(fallbackNBs);
        }
      }

      // 3. Busca Destaques Premium
      const { data } = await supabase.from('properties').select('*').limit(5).order('created_at', { ascending: false });
      if (data && data.length > 0) setFeaturedProperties(data);

      // 4. Busca Blog Posts e Depoimentos (Novas Seções)
      const { data: blogData } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      if (blogData) setBlogPosts(blogData);

      const { data: testData } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false });
      if (testData) setTestimonials(testData);
    }
    fetchData();
  }, []);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % featuredProperties.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + featuredProperties.length) % featuredProperties.length);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <StructuredData />
      <PublicHeader />

      {/* --- CORE: Hero Section (PRESERVE) --- */}
      <section className="pt-40 pb-20 px-4 relative overflow-hidden min-h-[80vh] flex items-center">
        <motion.div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-40">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/50 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-amber-100/50 blur-[100px] rounded-full" />
        </motion.div>
        <motion.div className="max-w-7xl mx-auto text-center w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
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

      {/* --- CORE: Featured Properties Section (PRESERVE) --- */}
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
                        <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400"><HomeIcon className="w-12 h-12 opacity-20" /></div>
                      )}
                      <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md text-zinc-900 px-4 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-xl">
                        {item.purpose}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-500" />{item.neighborhood}, {item.city}</div>
                        <span className="font-bold text-zinc-500">#{item.property_code}</span>
                      </div>
                      <h2 className="text-3xl font-black text-zinc-900 tracking-tighter leading-tight group-hover:text-emerald-600 transition-colors">{item.title}</h2>
                      <p className="text-4xl font-black text-emerald-600 tracking-tight">{formatPrice(item.price)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --- CORE: Search Bar Section (PRESERVE) --- */}
      <section className="py-12 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="max-w-4xl mx-auto bg-white p-2 rounded-[2rem] shadow-2xl shadow-zinc-200/60 flex flex-col md:flex-row gap-2 border border-zinc-100">
          <div className="flex-[2] flex flex-col justify-center px-8 py-4 border-b md:border-b-0 md:border-r border-zinc-100 relative group/select">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2"><MapPin className="w-3 h-3 text-emerald-500" />Onde você quer morar?</label>
            <div className="relative flex items-center">
              <select value={selectedNeighborhood} onChange={e => setSelectedNeighborhood(e.target.value)} className="w-full outline-none text-zinc-900 font-bold bg-transparent appearance-none cursor-pointer pr-8 z-10">
                <option value="">Todos os Bairros</option>
                {neighborhoods.map(nb => (<option key={nb.id} value={nb.nome}>{nb.nome}</option>))}
              </select>
              <ChevronDown className="absolute right-0 w-4 h-4 text-zinc-400 group-hover/select:text-emerald-500 transition-colors pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 flex items-center px-6 gap-3 border-b md:border-b-0 md:border-r border-zinc-100 relative">
            <Search className="w-5 h-5 text-zinc-400 z-10" /><input type="text" placeholder="Cód. Imóvel" maxLength={4} value={searchCode} onChange={e => setSearchCode(e.target.value.replace(/\D/g, ''))} className="w-full py-4 outline-none text-zinc-900 placeholder:text-zinc-400 font-medium bg-transparent" />
          </div>
          <Link to={`/imoveis${selectedNeighborhood || searchCode ? '?' : ''}${selectedNeighborhood ? `bairro=${selectedNeighborhood}` : ''}${selectedNeighborhood && searchCode ? '&' : ''}${searchCode ? `codigo=${searchCode}` : ''}`} className="bg-zinc-900 text-white px-10 py-4 rounded-[1.5rem] font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-200"><Search className="w-5 h-5" />Explorar Agora</Link>
        </motion.div>
      </section>

      {/* --- CORE: Featured Carousel / Destaques Premium (PRESERVE) --- */}
      <section className="py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-8"><h2 className="text-2xl font-bold text-zinc-900">Destaques Premium</h2></div>
        <div className="max-w-7xl mx-auto relative group px-4">
          {featuredProperties.length > 0 ? (
            <>
              <div className="overflow-hidden">
                <div className="flex gap-6 transition-transform duration-500 ease-out" style={{ transform: `translateX(calc(-${currentIndex} * (100% + 1.5rem)))` }}>
                  {featuredProperties.map((property) => (
                    <motion.div key={property.id} className="w-full shrink-0 bg-white rounded-3xl overflow-hidden border border-zinc-100 shadow-sm group/card">
                      <Link to={`/imovel/${property.id}`}>
                        <div className="aspect-[4/3] overflow-hidden relative bg-zinc-200">
                          {property.images && property.images.length > 0 ? (
                            <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400"><HomeIcon className="w-8 h-8 opacity-20" /></div>
                          )}
                          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-zinc-900">
                            {property.purpose}
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
                            <div className="flex items-center gap-2"><MapPin className="w-3 h-3" />{property.neighborhood}, {property.city}</div>
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
                  <button onClick={prevSlide} className="absolute left-6 top-[35%] -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-xl border border-zinc-100 hover:bg-white transition-all z-10"><ChevronLeft className="w-6 h-6 text-zinc-900" /></button>
                  <button onClick={nextSlide} className="absolute right-6 top-[35%] -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-xl border border-zinc-100 hover:bg-white transition-all z-10"><ChevronRight className="w-6 h-6 text-zinc-900" /></button>
                </>
              )}
            </>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-zinc-400 italic">Nenhum imóvel em destaque no momento.</div>
          )}
        </div>
      </section>

      {/* --- NEW SECTION: [MÓDULO: CLUSTER_REGIONAL_SEO] --- */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 mb-4">Imóveis por Região: Da Capital à Baixada</h2>
            <div className="h-1.5 w-24 bg-emerald-500 mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                name: 'Rio de Janeiro', 
                links: ['Casas na Zona Oeste', 'Apartamentos na Barra', 'Lançamentos Recreio'],
                img: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=800'
              },
              { 
                name: 'Niterói', 
                links: ['Apartamentos em Icaraí', 'Casas em Santa Rosa', 'Coberturas Ingá'],
                img: 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?q=80&w=800'
              },
              { 
                name: 'Baixada Fluminense', 
                links: ['Oportunidades em Nova Iguaçu', 'Casas em Duque de Caxias', 'Terrenos São João de Meriti'],
                img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800'
              }
            ].map((reg, idx) => (
              <div key={reg.name} className="bg-zinc-50 rounded-[2rem] overflow-hidden border border-zinc-100 hover:shadow-xl transition-all group">
                <div className="aspect-video relative overflow-hidden">
                  <img src={reg.img} alt={reg.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 to-transparent" />
                  <h3 className="absolute bottom-6 left-8 text-2xl font-black text-white">{reg.name}</h3>
                </div>
                <div className="p-8 space-y-4">
                  {reg.links.map(link => (
                    <Link key={link} to="#" className="flex items-center justify-between text-zinc-500 hover:text-emerald-600 font-bold text-sm transition-colors border-b border-zinc-100 pb-2 last:border-0 group/link">
                      {link} <ArrowUpRight className="w-4 h-4 text-zinc-300 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-transform" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- NEW SECTION: [MÓDULO: AUTORIDADE_EEAT] --- */}
      <section className="py-24 px-4 bg-zinc-900 text-white rounded-[4rem] mx-4 mb-24 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-emerald-500/5 blur-[150px] -z-10" />
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/3 relative">
            <div className="aspect-square rounded-3xl overflow-hidden border-4 border-white/5 relative bg-zinc-800">
               <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800" alt="Especialista" className="w-full h-full object-cover grayscale brightness-90 hover:grayscale-0 transition-all duration-700" loading="lazy" />
               <div className="absolute bottom-4 left-4 right-4 bg-emerald-600/90 backdrop-blur-md p-3 rounded-2xl flex items-center justify-center gap-2">
                 <ShieldCheck className="w-5 h-5" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">Registrado CRECI RJ-000000</span>
               </div>
            </div>
          </div>
          <div className="lg:w-2/3 space-y-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-xs font-black uppercase tracking-widest">
              <Award className="w-4 h-4" /> Especialista em Imóveis de Luxo
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9]">Consultoria Imobiliária com <br /><span className="text-emerald-500 italic font-serif">Visão Estratégica.</span></h2>
            <p className="text-zinc-400 text-xl font-light leading-relaxed max-w-2xl">
              Com mais de 15 anos de atuação exclusiva no mercado fluminense, nossa consultoria vai além da busca: entregamos inteligência imobiliária, segurança jurídica e discrição absoluta para investidores e famílias.
            </p>
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-3 bg-white/5 px-6 py-4 rounded-2xl border border-white/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold tracking-tight">Análise de Risco</span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 px-6 py-4 rounded-2xl border border-white/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold tracking-tight">Avaliação Patrimonial</span>
              </div>
            </div>
            <a href="https://wa.me/5521999999999" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-4 bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 group">
              <MessageCircle className="w-6 h-6" /> Consultar via WhatsApp (21)
              <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      {/* --- NEW SECTION: [MÓDULO: HUB_DE_CONTEÚDO] --- */}
      <section className="py-24 px-4 bg-zinc-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-16">
            <div className="max-w-2xl">
              <h2 className="text-4xl font-black tracking-tighter text-zinc-900 mb-4">Guia e Notícias do Mercado Fluminense</h2>
              <p className="text-zinc-500 font-medium">Informação estratégica para quem investe e vive no Rio de Janeiro.</p>
            </div>
            <Link to="#" className="flex items-center gap-3 text-emerald-600 font-black uppercase tracking-widest text-xs border-b-2 border-emerald-500/20 pb-2 hover:border-emerald-500 transition-all">
              Ver tudo <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {blogPosts.length > 0 ? blogPosts.map((post) => (
              <article key={post.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-zinc-100 group shadow-sm hover:shadow-xl transition-all">
                 <div className="aspect-video relative overflow-hidden bg-zinc-100">
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                    <div className="absolute top-6 left-6 bg-zinc-900/80 backdrop-blur text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                      {post.author}
                    </div>
                 </div>
                 <div className="p-10 space-y-6">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                       <Calendar className="w-3.5 h-3.5" /> {new Date(post.created_at).toLocaleDateString('pt-BR')}
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tighter leading-tight group-hover:text-emerald-600 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-zinc-500 text-sm leading-relaxed line-clamp-3 font-medium">
                      {post.excerpt}
                    </p>
                    <Link to={`/blog/${post.slug}`} className="flex items-center gap-3 text-zinc-900 font-black uppercase tracking-widest text-[10px] group/btn pt-4">
                      Ler Artigo Completo <div className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center group-hover/btn:bg-emerald-600 group-hover/btn:border-emerald-600 group-hover/btn:text-white transition-all"><ChevronRight className="w-4 h-4" /></div>
                    </Link>
                 </div>
              </article>
            )) : (
              <div className="col-span-3 h-40 flex items-center justify-center text-zinc-400 italic">Carregando conteúdo...</div>
            )}
          </div>
        </div>
      </section>

      {/* --- NEW SECTION: [MÓDULO: PROVA_SOCIAL] --- */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900">Depoimentos de Clientes no Rio e Região</h2>
            <div className="flex items-center justify-center gap-1 text-amber-400">
              <Star fill="currentColor" className="w-5 h-5" /><Star fill="currentColor" className="w-5 h-5" /><Star fill="currentColor" className="w-5 h-5" /><Star fill="currentColor" className="w-5 h-5" /><Star fill="currentColor" className="w-5 h-5" />
              <span className="text-zinc-400 font-bold text-sm ml-2">Rating 5/5</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div key={t.id} className="p-10 bg-zinc-50 border border-zinc-100 rounded-[2.5rem] relative group hover:bg-emerald-50/30 hover:border-emerald-100 transition-all">
                 <div className="absolute top-10 right-10 text-emerald-100 font-serif text-8xl h-10 flex items-center opacity-40 group-hover:text-emerald-200 transition-colors">“</div>
                 <p className="text-zinc-600 text-lg leading-relaxed mb-8 italic font-medium relative z-10">
                   {t.content}
                 </p>
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-black text-xs">
                      {t.name[0]}
                    </div>
                    <div>
                      <h4 className="text-zinc-900 font-black text-sm uppercase tracking-tight">{t.name}</h4>
                      <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest">{t.location} — RJ</p>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CORE EXPANED: [FOOTER: EXPANDIDO_NAP] --- */}
      <footer className="bg-zinc-950 text-zinc-500 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-20">
            {/* Branding & NAP */}
            <div className="lg:col-span-4 space-y-8">
              <div>
                <h3 className="text-white font-black text-3xl tracking-tighter mb-4 italic">ImobiFlow<span className="text-emerald-500 not-italic">2026</span></h3>
                <p className="text-zinc-400 font-medium leading-relaxed max-w-xs">
                  A curadoria definitiva para quem busca o extraordinário na Cidade Maravilhosa e Baixada Fluminense.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-300">
                  <MapPin className="w-4 h-4 text-emerald-500" /> Av. das Américas, 500 — Barra da Tijuca, RJ
                </div>
                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-300">
                  <Phone className="w-4 h-4 text-emerald-500" /> (21) 99999-9999
                </div>
                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-300 group">
                  <Mail className="w-4 h-4 text-emerald-500" /> contato@imobiflow2026.com.br
                </div>
              </div>
              <div className="flex gap-4">
                {[Instagram, Linkedin].map((Icon, idx) => (
                  <button key={idx} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Sitemap SEO */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-8">
               <div className="space-y-6">
                 <h4 className="text-white font-black text-[10px] uppercase tracking-[0.3em]">Navegação</h4>
                 <nav className="flex flex-col gap-4 text-xs font-bold uppercase tracking-widest">
                   <Link to="/" className="hover:text-emerald-500 transition-colors">Home</Link>
                   <Link to="/imoveis" className="hover:text-emerald-500 transition-colors">Imóveis</Link>
                   <Link to="/bairros" className="hover:text-emerald-500 transition-colors">Bairros</Link>
                   <Link to="/venda-conosco" className="hover:text-emerald-500 transition-colors">Venda Conosco</Link>
                 </nav>
               </div>
               <div className="space-y-6">
                 <h4 className="text-white font-black text-[10px] uppercase tracking-[0.3em]">Links Úteis</h4>
                 <nav className="flex flex-col gap-4 text-xs font-bold uppercase tracking-widest">
                   <Link to="#" className="hover:text-emerald-500 transition-colors">Apartamentos Barra</Link>
                   <Link to="#" className="hover:text-emerald-500 transition-colors">Casas em Niterói</Link>
                   <Link to="#" className="hover:text-emerald-500 transition-colors">Coberturas Leblon</Link>
                   <Link to="#" className="hover:text-emerald-500 transition-colors">Investidores</Link>
                 </nav>
               </div>
            </div>

            {/* Google Maps Embed */}
            <div className="lg:col-span-4 space-y-6">
              <h4 className="text-white font-black text-[10px] uppercase tracking-[0.3em]">Área de Atuação</h4>
              <div className="aspect-[16/9] rounded-2xl overflow-hidden grayscale opacity-50 contrast-125 border border-white/5">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3671.583271427509!2d-43.368469!3d-23.001648!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9bd837d57c0e5b%3A0x6a6d6d6d6d6d6d6d!2sAv.%20das%20Am??ricas%2C%20500%20-%20Barra%20da%20Tijuca%2C%20Rio%20de%20Janeiro%20-%20RJ%2C%2022640-100!5e0!3m2!1spt-BR!2sbr!4v1710810000000!5m2!1spt-BR!2sbr" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade" 
                />
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-[11px] font-black uppercase tracking-widest">
            <p>© 2026 ImobiFlow Digital. Todos os direitos reservados.</p>
            <div className="flex items-center gap-3">
               <div className="flex gap-8">
                 <a href="#" className="hover:text-white transition-colors">Termos</a>
                 <a href="#" className="hover:text-white transition-colors">Privacidade</a>
                 <Link to="/login" className="opacity-20 hover:opacity-100 transition-all">Acesso Restrito</Link>
               </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper icons missing from lucide or needed
function ArrowUpRight(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    >
      <path d="M7 7h10v10"/><path d="M7 17 17 7"/>
    </svg>
  );
}
