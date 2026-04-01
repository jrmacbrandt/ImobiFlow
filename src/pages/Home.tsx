import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
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
import { ScrollVideoHero } from '../components/ScrollVideoHero';
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
  const { scrollYProgress } = useScroll();
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);

  const [featuredProperties, setFeaturedProperties] = useState<any[]>([]);
  const [featuredList, setFeaturedList] = useState<any[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [dynamicRegions, setDynamicRegions] = useState<any[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  const [searchCode, setSearchCode] = useState('');

  const specialistRef = useRef(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);

  // Dedicated scroll for specialist section - PRECISION LOCK
  const { scrollYProgress: specialistScrollY } = useScroll({
    target: specialistRef,
    offset: ["start start", "end end"]
  });

  const specialistParallax = useTransform(specialistScrollY, [0, 1], [-20, 20]);
  const specialistScale = useTransform(specialistScrollY, [0, 0.5, 1], [0.95, 1, 0.95]);

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
      const { data } = await supabase.from('properties').select('*').limit(10).order('created_at', { ascending: false });
      if (data && data.length > 0) setFeaturedProperties(data);

      // 4. Busca Blog Posts e Depoimentos (Novas Seções)
      const { data: blogData } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      if (blogData) setBlogPosts(blogData);

      const { data: testData } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false });
      if (testData) setTestimonials(testData);

      // 5. Build dynamic regions from properties
      const { data: propsForRegions } = await supabase.from('properties').select('city, neighborhood, images');
      if (propsForRegions && propsForRegions.length > 0) {
        const regionsMap = new Map();
        propsForRegions.forEach(p => {
          const city = p.city || 'Outras Localidades';
          const nb = p.neighborhood || 'Centro';
          
          if (!regionsMap.has(city)) {
            regionsMap.set(city, {
              name: city,
              rawLinks: new Set(),
              img: p.images && p.images.length > 0 ? p.images[0] : null
            });
          }
          
          regionsMap.get(city).rawLinks.add(nb);
          
          if (!regionsMap.get(city).img && p.images && p.images.length > 0) {
            regionsMap.get(city).img = p.images[0];
          }
        });

        const defaultImages = [
          'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=800',
          'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?q=80&w=800',
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800'
        ];

        const regions = Array.from(regionsMap.values()).map((r: any, idx) => ({
           name: r.name,
           img: r.img || defaultImages[idx % defaultImages.length],
           links: Array.from(r.rawLinks).slice(0, 4) // max 4 links per card
        }));
        
        setDynamicRegions(regions);
      }
    }
    fetchData();
  }, []);

  const nextSlide = () => {
    if (carouselRef.current) {
      const container = carouselRef.current;
      const cardWidth = container.firstElementChild?.clientWidth || 0;
      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: cardWidth + 24, behavior: 'smooth' });
      }
    }
  };
  
  const prevSlide = () => {
    if (carouselRef.current) {
      const container = carouselRef.current;
      const cardWidth = container.firstElementChild?.clientWidth || 0;
      if (container.scrollLeft <= 10) {
        container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: -(cardWidth + 24), behavior: 'smooth' });
      }
    }
  };

  const nextTestimonial = () => {
    if (testimonialsRef.current) {
      const container = testimonialsRef.current;
      const cardWidth = container.firstElementChild?.clientWidth || 0;
      if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: cardWidth + 32, behavior: 'smooth' }); // gap-8 is 32px
      }
    }
  };
  
  const prevTestimonial = () => {
    if (testimonialsRef.current) {
      const container = testimonialsRef.current;
      const cardWidth = container.firstElementChild?.clientWidth || 0;
      if (container.scrollLeft <= 10) {
        container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: -(cardWidth + 32), behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <StructuredData />
      <PublicHeader />

      {/* --- Radical Scroll Video Hero Section --- */}
      <ScrollVideoHero frameCount={80} />

      {/* --- Search Bar Section --- */}
      <section className="px-4 -mt-16 md:-mt-12 relative z-30 mb-8 md:mb-16">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="max-w-4xl mx-auto bg-white p-2 rounded-none shadow-2xl shadow-zinc-200/60 flex flex-col md:flex-row gap-2 border border-zinc-100">
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
          <Link to={`/imoveis${selectedNeighborhood || searchCode ? '?' : ''}${selectedNeighborhood ? `bairro=${selectedNeighborhood}` : ''}${selectedNeighborhood && searchCode ? '&' : ''}${searchCode ? `codigo=${searchCode}` : ''}`} className="bg-zinc-900 text-white px-10 py-4 rounded-none font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-200"><Search className="w-5 h-5" />Explorar Agora</Link>
        </motion.div>
      </section>

      {/* --- REFINED: Featured Properties Section (Two-Column Layout) --- */}
      {featuredList.length > 0 && (
        <section className="py-24 px-4 bg-zinc-50 border-y border-zinc-100">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6 }}
            className="max-w-7xl mx-auto"
          >
            <div className="flex items-center gap-3 text-amber-500 font-bold text-xs uppercase tracking-[0.2em] mb-12">
              <div className="h-[1px] w-8 bg-amber-500/30" />
              <Star className="w-4 h-4 text-amber-500" fill="#fbbf24" stroke="#fbbf24" />
              Destaque da Semana
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {featuredList.map((item) => (
                <React.Fragment key={item.id}>
                  {/* Left Column: Image */}
                  <div className="lg:col-span-7">
                    <Link to={`/imovel/${item.id}`} className="group block">
                      <div className="aspect-[16/9] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-zinc-300/50 relative bg-zinc-200">
                        {item.images && item.images.length > 0 ? (
                          <img 
                            src={item.images[0]} 
                            alt={item.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" 
                            loading="lazy" 
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
                    </Link>
                  </div>
                  
                  {/* Right Column: Info */}
                  <div className="lg:col-span-5 space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-zinc-400 text-xs font-medium uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-500" />
                          {item.neighborhood}, {item.city}
                        </div>
                        <span className="font-bold text-zinc-500 px-3 py-1 bg-zinc-100 rounded-full">#{item.property_code}</span>
                      </div>
                      <Link to={`/imovel/${item.id}`} className="block group">
                        <h2 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tighter leading-tight group-hover:text-emerald-600 transition-colors">
                          {item.title}
                        </h2>
                      </Link>
                      <p className="text-5xl font-black text-emerald-600 tracking-tight">{formatPrice(item.price)}</p>
                    </div>
                    
                    <div className="pt-8 border-t border-zinc-200">
                      <Link 
                        to={`/imovel/${item.id}`}
                        className="inline-flex items-center gap-4 bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-colors duration-400 group/btn"
                      >
                        Ver Detalhes do Imóvel <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
            </motion.div>
          </section>
      )}



      {/* --- REFINED: Featured Carousel / Destaques Premium (Multi-Card Display) --- */}
      <section className="py-16 md:py-32 overflow-hidden bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 mb-12 flex justify-between items-end">
          <div>
            <span className="text-emerald-600 font-black text-[10px] uppercase tracking-[0.4em] mb-4 block">EXCLUSIVIDADES</span>
            <h2 className="text-4xl font-black text-zinc-900 tracking-tighter">Destaques Premium</h2>
          </div>
        </div>

        <div className="max-w-7xl mx-auto relative px-4">
          {featuredProperties.length > 0 ? (
            <div className="overflow-hidden">
               <div 
                 ref={carouselRef}
                 className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-8 pt-4 -mx-4 px-4 md:mx-0 md:px-0" 
                 style={{ scrollBehavior: 'smooth' }}
               >
                 {featuredProperties.map((property, index) => (
                   <motion.div 
                     key={property.id} 
                     initial={{ opacity: 0, y: 30 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true, amount: 0.1 }}
                     transition={{ duration: 0.5, delay: index * 0.1 }}
                     className="w-full md:w-[calc(33.333%-1rem)] shrink-0 snap-center bg-white rounded-[2.5rem] overflow-hidden border border-zinc-100 shadow-xl shadow-zinc-200/40 hover:shadow-[0_20px_40px_-15px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition-all duration-400 group/card mb-8"
                   >
                     <Link to={`/imovel/${property.id}`} className="block h-full">
                       <div className="aspect-[4/3] overflow-hidden relative bg-zinc-200">
                         {property.images && property.images.length > 0 ? (
                           <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700" loading="lazy" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-zinc-400"><HomeIcon className="w-8 h-8 opacity-20" /></div>
                         )}
                         <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-zinc-900 shadow-lg">
                           {property.purpose}
                         </div>
                       </div>
                       <div className="p-8 space-y-4 text-center">
                         <div className="flex items-center justify-center gap-3 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                           <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-500" />{property.neighborhood}</div>
                           <span className="text-zinc-300">#{property.property_code}</span>
                         </div>
                         <h3 className="text-xl font-black text-zinc-900 tracking-tight leading-tight line-clamp-1 group-hover/card:text-emerald-600 transition-colors mx-auto">{property.title}</h3>
                         <p className="text-emerald-600 font-black text-2xl tracking-tighter mx-auto">{formatPrice(property.price)}</p>
                       </div>
                     </Link>
                   </motion.div>
                 ))}
               </div>
                
                {/* Setas Centralizadas Destaques */}
                <div className="flex justify-center gap-4 mt-8">
                  <button onClick={prevSlide} className="w-12 h-12 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-900 hover:text-white transition-all shadow-sm"><ChevronLeft className="w-6 h-6" /></button>
                  <button onClick={nextSlide} className="w-12 h-12 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-900 hover:text-white transition-all shadow-sm"><ChevronRight className="w-6 h-6" /></button>
                </div>
             </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-zinc-400 italic">Nenhum imóvel em destaque no momento.</div>
          )}
        </div>
      </section>

      {/* --- NEW SECTION: [MÓDULO: CLUSTER_REGIONAL_SEO] --- */}
      {dynamicRegions.length > 0 && (
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 mb-4">Imóveis por Região: Da Capital à Baixada</h2>
            <div className="h-1.5 w-24 bg-emerald-500 mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {dynamicRegions.map((reg, index) => (
              <motion.div 
                key={reg.name} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-zinc-50 rounded-[2rem] overflow-hidden border border-zinc-100 hover:shadow-xl transition-all group"
              >
                <div className="aspect-video relative overflow-hidden">
                  <img src={reg.img} alt={reg.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 to-transparent" />
                  <h3 className="absolute bottom-6 left-8 text-2xl font-black text-white">{reg.name}</h3>
                </div>
                <div className="p-8 space-y-4">
                  {reg.links.map((link: string) => (
                    <Link key={link} to={`/imoveis?bairro=${link}`} className="flex items-center justify-between text-zinc-500 hover:text-emerald-600 font-bold text-sm transition-colors duration-400 border-b border-zinc-100 pb-2 last:border-0 group/link">
                      Imóveis em {link} <ArrowUpRight className="w-4 h-4 text-zinc-300 group-hover/link:text-emerald-500 group-hover/link:translate-x-1 group-hover/link:-translate-y-1 transition-all duration-400" />
                    </Link>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* --- NEW SECTION: [MÓDULO: AUTORIDADE_EEAT] --- STICKY REFACTOR 
          INSTRUÇÕES DE MANUTENÇÃO:
          1. Esta seção é "travada" pelo container de [450vh] e a classe `sticky top-16`.
          2. Todas as animações são mapeadas para o `specialistScrollY` (0 a 1).
          3. REGRA DE OURO (SINCRONIA): A seção destrava quase imediatamente após o 
             botão de WhatsApp atingir 100% de visibilidade (progress 0.98).
      */}
      <div ref={specialistRef} className="relative h-[200vh] lg:h-[450vh] bg-zinc-950">
        <section className="sticky top-16 h-[calc(100vh-64px)] w-full flex items-center justify-center px-6 lg:px-4 py-10 lg:py-16 overflow-hidden border-y border-white/5 shadow-2xl">
          <motion.div 
            style={{ 
              scale: specialistScale, 
              opacity: useTransform(specialistScrollY, [0, 0.1, 0.9, 1], [0.1, 1, 1, 0]) 
            }}
            className="absolute inset-0 bg-emerald-500/5 blur-[150px] -z-10" 
          />
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-2 lg:gap-16 w-full">
            <div className="w-full max-w-[300px] md:max-w-[280px] lg:max-w-none lg:w-1/3 relative shrink-0 mx-auto lg:mx-0">
              <motion.div 
                style={{ 
                  opacity: 1, 
                  x: 0
                }}
                className="aspect-video lg:aspect-[4/5] rounded-none overflow-hidden border border-white/10 relative bg-zinc-800 shadow-2xl"
              >
                 <img 
                   src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800" 
                   alt="Especialista" 
                   className="w-full h-full lg:h-[130%] lg:-mt-[15%] object-cover object-top" 
                   loading="lazy" 
                 />
                 <motion.div 
                   style={{ 
                     opacity: 1 
                   }}
                   className="absolute bottom-4 lg:bottom-6 left-4 lg:left-6 right-4 lg:right-6 bg-emerald-600/95 backdrop-blur-xl p-3 lg:p-4 rounded-none flex items-center justify-center gap-2 lg:gap-3 shadow-lg border border-white/10"
                 >
                   <ShieldCheck className="w-5 h-5 text-zinc-950" />
                   <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-950">Registrado CRECI RJ-000000</span>
                 </motion.div>
              </motion.div>
            </div>
            <div className="lg:w-2/3 space-y-1.5 lg:space-y-8 text-center">
              <motion.div 
                style={{ 
                  opacity: useTransform(specialistScrollY, [0, 0.1], [0, 1]),
                  y: useTransform(specialistScrollY, [0, 0.1], [10, 0])
                }}
                className="inline-flex items-center gap-2 lg:gap-3 px-3 py-1.5 lg:px-5 lg:py-2 bg-white/5 border border-white/10 rounded-none text-emerald-400 text-[10px] lg:text-xs font-black uppercase tracking-[0.2em]"
              >
                <Award className="w-4 h-4" /> Especialista em Imóveis de Luxo
              </motion.div>
              
              <h2 className="text-2xl md:text-4xl lg:text-7xl font-black tracking-tighter leading-[1] lg:leading-[0.85] uppercase text-white">
                { "Consultoria Imobiliária com Visão Estratégica.".split(" ").map((word, i, arr) => {
                  const start = 0.05 + (i / arr.length) * 0.35;
                  const end = start + 0.1;
                  return (
                    <motion.span
                      key={i}
                      style={{ 
                        opacity: useTransform(specialistScrollY, [start, end], [0, 1]),
                        y: useTransform(specialistScrollY, [start, end], [10, 0])
                      }}
                      className={cn(
                        "inline-block mr-2 md:mr-3",
                        word.toLowerCase().includes("estrat") && "text-emerald-500 italic font-serif"
                      )}
                    >
                      {word}
                    </motion.span>
                  );
                })}
              </h2>

              <motion.p 
                style={{ 
                  opacity: useTransform(specialistScrollY, [0.45, 0.55], [0, 1])
                }}
                className="text-zinc-400 text-xs md:text-base lg:text-xl font-light leading-relaxed max-w-2xl uppercase tracking-wider mx-auto"
              >
                Com mais de 15 anos de atuação exclusiva no mercado fluminense, nossa consultoria vai além da busca: entregamos inteligência imobiliária, segurança jurídica e discrição absoluta para investidores e famílias.
              </motion.p>

              <div className="flex flex-row flex-wrap justify-center gap-2 lg:gap-6 pt-1 lg:pt-4">
                {[
                  { text: "Análise de Risco", icon: CheckCircle2 },
                  { text: "Avaliação Patrimonial", icon: CheckCircle2 }
                ].map((badge, i) => (
                  <motion.div 
                    key={badge.text}
                    style={{ 
                      opacity: useTransform(specialistScrollY, [0.55 + (i * 0.04), 0.65 + (i * 0.04)], [0, 1]),
                      scale: useTransform(specialistScrollY, [0.55 + (i * 0.04), 0.65 + (i * 0.04)], [0.95, 1])
                    }}
                    className="flex items-center gap-2 lg:gap-4 bg-white/5 px-3 py-2 lg:px-8 lg:py-5 rounded-none border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all cursor-default group"
                  >
                    <badge.icon className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] lg:text-sm font-black uppercase tracking-widest">{badge.text}</span>
                  </motion.div>
                ))}
              </div>

              <motion.div
                style={{ 
                  opacity: useTransform(specialistScrollY, [0.75, 0.85], [0, 1]),
                  y: useTransform(specialistScrollY, [0.75, 0.85], [15, 0])
                }}
              >
                <a href="https://wa.me/5521999999999" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 lg:gap-5 bg-white text-zinc-950 hover:bg-emerald-500 hover:text-zinc-950 px-5 py-3 lg:px-12 lg:py-6 rounded-none font-black uppercase tracking-[0.15em] lg:tracking-[0.2em] transition-all duration-500 shadow-2xl group text-[10px] lg:text-base">
                  <MessageCircle className="w-5 h-5 lg:w-7 lg:h-7" /> Consultar via WhatsApp (21)
                  <ChevronRight className="w-4 h-4 lg:w-6 lg:h-6 group-hover:translate-x-3 transition-transform" />
                </a>
              </motion.div>
            </div>
          </div>
        </section>
      </div>

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
            {blogPosts.length > 0 ? blogPosts.map((post, index) => (
              <motion.article 
                key={post.id} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-[2.5rem] overflow-hidden border border-zinc-100 group shadow-sm hover:shadow-xl transition-all"
              >
                 <div className="aspect-video relative overflow-hidden bg-zinc-100">
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                    <div className="absolute top-6 left-6 bg-zinc-900/80 backdrop-blur text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                      {post.author}
                    </div>
                 </div>
                 <div className="p-10 space-y-6">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                       <Calendar className="w-3.5 h-3.5" /> {new Date(post.created_at).toLocaleDateString('pt-BR')}
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tighter leading-tight group-hover:text-emerald-600 transition-colors relative inline-block after:content-[''] after:absolute after:w-0 after:h-0.5 after:bg-emerald-600 after:left-0 after:-bottom-1 after:transition-all after:duration-300 group-hover:after:w-full">
                      {post.title}
                    </h3>
                    <p className="text-zinc-500 text-sm leading-relaxed line-clamp-3 font-medium">
                      {post.excerpt}
                    </p>
                    <Link to={`/blog/${post.slug}`} className="flex items-center gap-3 text-zinc-900 font-black uppercase tracking-widest text-[10px] group/btn pt-4">
                      Ler Artigo Completo <div className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center group-hover/btn:bg-emerald-600 group-hover/btn:border-emerald-600 group-hover/btn:text-white transition-all duration-300"><ChevronRight className="w-4 h-4" /></div>
                    </Link>
                 </div>
              </motion.article>
            )) : (
              <div className="col-span-3 h-40 flex items-center justify-center text-zinc-400 italic">Carregando conteúdo...</div>
            )}
          </div>
        </div>
      </section>

      {/* --- NEW SECTION: [MÓDULO: PROVA_SOCIAL] --- */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
            <div className="text-left space-y-4">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900">Depoimentos de Clientes no Rio e Região</h2>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-zinc-100 text-zinc-500 rounded-full text-[10px] font-black uppercase tracking-widest hidden md:inline-block">← Arraste →</span>
              </div>
            </div>
          </div>
          <div 
            ref={testimonialsRef}
            className="flex gap-8 cursor-grab active:cursor-grabbing overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-8 px-4 md:px-0"
            style={{ scrollBehavior: 'smooth' }}
          >
            {testimonials.map((t, index) => {
              const stars = index % 3 === 0 ? 4 : 5;
              const ratingText = stars === 5 ? 'Confiança e Satisfação' : 'Credibilidade Comprovada';

              return (
              <motion.div 
                key={t.id} 
                className="w-[85vw] md:w-[400px] shrink-0 snap-center p-10 bg-zinc-50 border border-zinc-100 rounded-[2.5rem] relative group hover:bg-emerald-50/30 hover:border-emerald-100 transition-all duration-400"
              >
                 <div className="flex items-start justify-between mb-8 pointer-events-none">
                   <div className="space-y-1.5 mt-2">
                     <div className="flex items-center gap-1">
                       {[...Array(5)].map((_, i) => (
                         <Star key={i} fill={i < stars ? "currentColor" : "none"} className={`w-4 h-4 ${i < stars ? 'text-amber-400' : 'text-zinc-300'}`} />
                       ))}
                     </div>
                     <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{ratingText}</p>
                   </div>
                   <div className="text-emerald-100 font-serif text-8xl h-10 flex items-center opacity-40 group-hover:text-emerald-200 transition-colors">“</div>
                 </div>
                 
                 <p className="text-zinc-600 text-lg leading-relaxed mb-8 italic font-medium relative z-10 pointer-events-none">
                   {t.content}
                 </p>
                 <div className="flex items-center gap-4 pointer-events-none">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-black text-xs">
                      {t.name[0]}
                    </div>
                    <div>
                      <h4 className="text-zinc-900 font-black text-sm uppercase tracking-tight">{t.name}</h4>
                      <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest">{t.location} — RJ</p>
                    </div>
                 </div>
              </motion.div>
              );
            })}
          </div>
          
          {/* Setas Centralizadas Depoimentos */}
          <div className="flex justify-center gap-4 mt-8">
            <button onClick={prevTestimonial} className="w-12 h-12 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-900 hover:text-white transition-all shadow-sm"><ChevronLeft className="w-6 h-6" /></button>
            <button onClick={nextTestimonial} className="w-12 h-12 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-900 hover:text-white transition-all shadow-sm"><ChevronRight className="w-6 h-6" /></button>
          </div>
        </div>
      </section>

      {/* --- FOOTER: [EXPANDIDO_NAP] --- */}
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
