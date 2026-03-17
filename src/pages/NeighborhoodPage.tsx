import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import { MapPin, Bed, Car, ArrowLeft, Loader2, MessageCircle, Info, HelpCircle, ChevronRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatPrice, cn } from '../lib/utils';
import { GoogleGenAI } from '@google/genai';

export function NeighborhoodPage() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [neighborhood, setNeighborhood] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [faq, setFaq] = useState<any[]>([]);
  const [generatingFaq, setGeneratingFaq] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetchData();
  }, [slug]);

  async function fetchData() {
    setLoading(true);
    
    // Parse slug: tipo-no-bairro-cidade
    const parts = slug?.split('-no-');
    if (!parts || parts.length < 2) {
      setLoading(false);
      return;
    }

    const type = parts[0].replace(/-/g, ' '); // e.g. "apartamentos"
    const neighborhoodSlug = parts[1]; // e.g. "grajau-rj"

    // 1. Fetch neighborhood info
    const { data: nbData } = await supabase
      .from('neighborhoods')
      .select('*')
      .eq('slug', neighborhoodSlug)
      .single();

    if (nbData) {
      setNeighborhood(nbData);
      
      // 2. Fetch properties
      // We need to match by neighborhood name and city, and type
      const { data: propData } = await supabase
        .from('properties')
        .select('*')
        .eq('neighborhood', nbData.nome)
        .eq('city', nbData.cidade)
        .ilike('type', `%${type.slice(0, -1)}%`) // simple plural to singular
        .order('created_at', { ascending: false });

      setProperties(propData || []);
      
      // 3. Generate FAQ with IA if needed
      generateFaq(nbData.nome, nbData.cidade);
    }

    setLoading(false);
  }

  async function generateFaq(nbName: string, city: string) {
    if (!isSupabaseConfigured()) return;

    // Try to find any profile with a key
    const { data: profiles } = await supabase.from('profiles').select('gemini_api_key').not('gemini_api_key', 'is', null).limit(1);
    const apiKey = profiles?.[0]?.gemini_api_key;

    if (!apiKey) return;

    setGeneratingFaq(true);
    try {
      const genAI = new GoogleGenAI({ apiKey });
      const model = genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Gere um FAQ com 4 perguntas e respostas sobre o bairro ${nbName} em ${city}. 
          Inclua: preço médio do m², perfil do bairro, infraestrutura e segurança. 
          Retorne APENAS um JSON array de objetos com "pergunta" e "resposta".`,
        config: { responseMimeType: 'application/json' }
      });
      const response = await model;
      const result = JSON.parse(response.text || '[]');
      setFaq(result);
    } catch (err) {
      console.error('FAQ Generation Error:', err);
    }
    setGeneratingFaq(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!neighborhood) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-white">
        <h1 className="text-2xl font-bold mb-4">Página não encontrada</h1>
        <Link to="/imoveis" className="text-emerald-600 font-bold hover:underline">Voltar para busca</Link>
      </div>
    );
  }

  const typeName = slug?.split('-no-')[0].replace(/-/g, ' ');

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{neighborhood.meta_title}</title>
        <meta name="description" content={neighborhood.meta_description} />
        <link rel="canonical" href={window.location.href} />
        <meta property="og:title" content={neighborhood.meta_title} />
        <meta property="og:description" content={neighborhood.meta_description} />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 bg-zinc-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          {/* Background image removed as per request to avoid random images */}
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <Link to="/imoveis" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para imóveis
          </Link>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 capitalize">
            {typeName} no {neighborhood.nome} <br/>
            <span className="text-emerald-500">{neighborhood.cidade}</span>
          </h1>
          <p className="text-zinc-400 text-xl max-w-2xl mb-10">
            Descubra as melhores oportunidades de {typeName} em um dos bairros mais desejados de {neighborhood.cidade}.
          </p>
          <a 
            href={`https://wa.me/5521999999999?text=Olá, tenho interesse em imóveis no ${neighborhood.nome}`}
            target="_blank"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20"
          >
            <MessageCircle className="w-5 h-5" />
            Falar com Especialista
          </a>
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Info className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900">Sobre o Bairro</h2>
          </div>
          <div className="prose prose-zinc max-w-none text-zinc-600 leading-relaxed markdown-body">
            <ReactMarkdown>{neighborhood.descricao_seo}</ReactMarkdown>
          </div>
        </div>
      </section>

      {/* Property List */}
      <section className="py-20 px-4 bg-zinc-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Imóveis Disponíveis</h2>
            <span className="bg-white px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-500">
              {properties.length} resultados
            </span>
          </div>

          {properties.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] text-center border border-zinc-100">
              <p className="text-zinc-400 font-medium mb-6">Nenhum imóvel encontrado com estes critérios no momento.</p>
              <Link to="/imoveis" className="text-emerald-600 font-bold hover:underline">Ver todos os imóveis</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property) => (
                <Link key={property.id} to={`/imovel/${property.id}`} className="group bg-white rounded-[2.5rem] overflow-hidden border border-zinc-100 shadow-sm hover:shadow-2xl hover:shadow-zinc-200/50 transition-all duration-500">
                  <div className="aspect-[4/3] overflow-hidden relative bg-zinc-800">
                    {property.images && property.images.length > 0 ? (
                      <img 
                        src={property.images[0]} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <MapPin className="w-8 h-8 opacity-20" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {property.type}
                    </div>
                  </div>
                  <div className="p-8">
                    <p className="text-emerald-600 font-black text-2xl mb-2">{formatPrice(property.price)}</p>
                    <h3 className="font-bold text-zinc-900 mb-4 line-clamp-1">{property.title}</h3>
                    <div className="flex items-center gap-4 text-zinc-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Bed className="w-4 h-4" />
                        {property.bedrooms} qts
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Car className="w-4 h-4" />
                        {property.parking_spots} vagas
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Conversion Block */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto bg-zinc-900 rounded-[3rem] p-12 md:p-20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
            <div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Não encontrou o que procurava?</h2>
              <p className="text-zinc-400 text-lg mb-8">
                Nossos especialistas podem encontrar o imóvel ideal para você no {neighborhood.nome} antes mesmo dele chegar ao mercado.
              </p>
            </div>
            <form className="space-y-4 bg-white/5 p-8 rounded-[2rem] backdrop-blur-sm border border-white/10">
              <input type="text" placeholder="Seu Nome" className="w-full p-4 bg-white/10 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-zinc-500" />
              <input type="text" placeholder="WhatsApp" className="w-full p-4 bg-white/10 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-zinc-500" />
              <button className="w-full bg-emerald-600 py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20">
                Quero ser avisado
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ */}
      {faq.length > 0 && (
        <section className="py-24 px-4 bg-zinc-50">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-12">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <HelpCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Perguntas Frequentes</h2>
            </div>
            <div className="space-y-6">
              {faq.map((item, i) => (
                <div key={i} className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
                  <h3 className="font-bold text-zinc-900 mb-3">{item.pergunta}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{item.resposta}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
