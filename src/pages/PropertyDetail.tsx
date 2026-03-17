import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  MapPin, Bed, Car, Share2, 
  ChevronLeft, ChevronRight, MessageCircle,
  CheckCircle2, Info, ArrowLeft, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatPrice, cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { MOCK_PROPERTIES, MOCK_PROFILE } from '../lib/mockData';

export function PropertyDetail() {
  const { id } = useParams();
  const [property, setProperty] = useState<any>(null);
  const [broker, setBroker] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    async function fetchDetails() {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      const { data: prop } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (prop) {
        setProperty(prop);
        
        // Registrar visualização
        try {
          const { error: viewError } = await supabase.from('property_views').insert({ property_id: id });
          if (viewError) {
            console.error('Erro ao registrar visualização no Supabase:', viewError);
          } else {
            console.log('Visualização registrada com sucesso para o imóvel:', id);
          }
        } catch (viewErr) {
          console.error('Erro de exceção ao registrar visualização:', viewErr);
        }

        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', prop.broker_id)
          .maybeSingle();
        if (prof) setBroker(prof);
      }
      setLoading(false);
    }
    fetchDetails();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!property) return <div className="min-h-screen flex items-center justify-center">Imóvel não encontrado.</div>;

  const whatsappMessage = `Olá ${broker?.full_name || 'Corretor'}, vi o imóvel "${property.title}" (Cód: ${property.property_code}) no seu site e quero agendar uma visita!`;
  const whatsappUrl = `https://wa.me/${broker?.whatsapp_number}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {/* Navigation */}
      <div className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/imoveis" className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para lista
          </Link>
          <button className="p-2 rounded-full hover:bg-zinc-100 transition-colors">
            <Share2 className="w-5 h-5 text-zinc-600" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Gallery */}
          {property.images && property.images.length > 0 && (
            <div className="space-y-4">
              <div 
                className="aspect-[4/3] rounded-3xl overflow-hidden bg-zinc-200 relative group cursor-zoom-in"
                onClick={() => setIsLightboxOpen(true)}
              >
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={activeImage}
                    src={property.images[activeImage]} 
                    alt={property.title}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x > 50) {
                        setActiveImage(prev => (prev - 1 + property.images.length) % property.images.length);
                      } else if (info.offset.x < -50) {
                        setActiveImage(prev => (prev + 1) % property.images.length);
                      }
                    }}
                    className="w-full h-full object-cover touch-none"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </AnimatePresence>

                {property.images.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImage(prev => (prev - 1 + property.images.length) % property.images.length);
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all z-10"
                    >
                      <ChevronLeft className="w-6 h-6 text-zinc-900" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImage(prev => (prev + 1) % property.images.length);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all z-10"
                    >
                      <ChevronRight className="w-6 h-6 text-zinc-900" />
                    </button>
                    
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-bold">
                      {activeImage + 1} / {property.images.length}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm uppercase tracking-widest mb-2">
                <CheckCircle2 className="w-4 h-4" />
                {property.purpose} • {property.type} • Cód: {property.property_code}
              </div>
              <h1 className="text-4xl font-bold text-zinc-900 mb-4 leading-tight">{property.title}</h1>
              <div className="flex items-center gap-2 text-zinc-500 mb-6">
                <MapPin className="w-5 h-5" />
                {property.neighborhood}, {property.city}
              </div>
              <div className="text-4xl font-bold text-emerald-600">{formatPrice(property.price)}</div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-3 gap-4 p-6 bg-white rounded-3xl border border-zinc-100 shadow-sm">
              <div className="text-center space-y-1">
                <Bed className="w-6 h-6 mx-auto text-zinc-400" />
                <p className="text-sm font-bold text-zinc-900">{property.bedrooms} Quartos</p>
              </div>
              <div className="text-center space-y-1">
                <Car className="w-6 h-6 mx-auto text-zinc-400" />
                <p className="text-sm font-bold text-zinc-900">{property.parking_spots} Vagas</p>
              </div>
              <div className="text-center space-y-1">
                <Info className="w-6 h-6 mx-auto text-zinc-400" />
                <p className="text-sm font-bold text-zinc-900">{property.type}</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-zinc-900">Sobre este imóvel</h2>
              <div className="prose prose-zinc max-w-none text-zinc-600 leading-relaxed">
                <ReactMarkdown>{property.description}</ReactMarkdown>
              </div>
            </div>

            {/* Broker Info */}
            <div className="p-6 bg-zinc-900 rounded-3xl text-white flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Responsável</p>
                <p className="font-bold text-lg">{broker?.full_name || 'Corretor Independente'}</p>
                <p className="text-zinc-500 text-sm">CRECI: {broker?.creci || '---'}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center font-bold text-xl">
                {broker?.full_name?.charAt(0) || 'C'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      <a 
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 bg-emerald-500 text-white p-4 rounded-full shadow-2xl shadow-emerald-500/40 hover:bg-emerald-600 hover:scale-110 transition-all z-50 flex items-center gap-3 group"
      >
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold whitespace-nowrap">
          Agendar Visita
        </span>
        <MessageCircle className="w-8 h-8" />
      </a>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          >
            <button 
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12">
              <AnimatePresence mode="wait">
                <motion.img 
                  key={activeImage}
                  src={property.images[activeImage]} 
                  alt={property.title}
                  initial={{ opacity: 0, scale: 0.9, x: 50 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -50 }}
                  transition={{ duration: 0.3 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 100) {
                      setActiveImage(prev => (prev - 1 + property.images.length) % property.images.length);
                    } else if (info.offset.x < -100) {
                      setActiveImage(prev => (prev + 1) % property.images.length);
                    }
                  }}
                  className="max-w-full max-h-full object-contain shadow-2xl touch-none"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>

              {property.images.length > 1 && (
                <>
                  <button 
                    onClick={() => setActiveImage(prev => (prev - 1 + property.images.length) % property.images.length)}
                    className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                  >
                    <ChevronLeft className="w-10 h-10" />
                  </button>
                  <button 
                    onClick={() => setActiveImage(prev => (prev + 1) % property.images.length)}
                    className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                  >
                    <ChevronRight className="w-10 h-10" />
                  </button>
                  
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full text-white font-bold">
                    {activeImage + 1} / {property.images.length}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
