import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save, Sparkles, Upload, X, Plus, 
  Home as HomeIcon, MapPin, 
  Bed, Car, Info, Loader2, Wand2, ArrowLeft 
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { compressAndConvertToWebP } from '../../lib/images';
import { cn, slugify, maskCurrency, parseCurrency } from '../../lib/utils';
import { GoogleGenAI } from '@google/genai';
import { MASTER_COPY_RULES } from '../../constants/aiRules';

import { MOCK_PROFILE, MOCK_PROPERTIES } from '../../lib/mockData';

export function AdminPropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'ia'>('manual');
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [sessionImages, setSessionImages] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    type: 'Apartamento',
    purpose: 'Venda',
    neighborhood: '',
    city: 'Rio de Janeiro',
    bedrooms: '' as string | number,
    bathrooms: '' as string | number,
    parking_spots: '' as string | number,
    area_sqm: '' as string | number,
    images: [] as string[]
  });

  // IA Wizard State (Questionário Estratégico 2026)
  const [iaAnswers, setIaAnswers] = useState({
    emotional_highlight: '',
    sun_exposure: '',
    renovation_status: '',
    nearby_transport: '',
    local_services: '',
    security_features: '',
    condo_leisure: '',
    financial_conditions: '',
    internal_differential: '',
    fixed_costs: ''
  });

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function init() {
      const isDemoMode = localStorage.getItem('demo_mode') === 'true';
      
      if (isDemoMode) {
        setProfile(MOCK_PROFILE);
        if (id) {
          const mockProp = MOCK_PROPERTIES.find(p => p.id === id);
          if (mockProp) {
            setFormData({ 
              ...mockProp, 
              price: maskCurrency((mockProp.price * 100).toString()),
              bedrooms: mockProp.bedrooms || '',
              bathrooms: mockProp.bathrooms || '',
              parking_spots: mockProp.parking_spots || '',
              area_sqm: mockProp.area_sqm || ''
            });
            setOriginalImages(mockProp.images || []);
          }
        }
        return;
      }

      let user = null;
      if (isSupabaseConfigured()) {
        const { data } = await supabase.auth.getUser();
        user = data.user;
      }
      
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
      } else {
        setProfile(MOCK_PROFILE);
      }

      if (id) {
        if (isSupabaseConfigured()) {
          const { data } = await supabase.from('properties').select('*').eq('id', id).single();
          if (data) {
            const initialData = { 
              ...data, 
              price: maskCurrency((data.price * 100).toString()),
              bedrooms: data.bedrooms || '',
              bathrooms: data.bathrooms || '',
              parking_spots: data.parking_spots || '',
              area_sqm: data.area_sqm || ''
            };
            setFormData(initialData);
            setOriginalImages(data.images || []);
            return;
          }
        }
        
        // Fallback para mock
        const mockProp = MOCK_PROPERTIES.find(p => p.id === id);
        if (mockProp) {
          setFormData({ 
            ...mockProp, 
            price: maskCurrency((mockProp.price * 100).toString()),
            bedrooms: mockProp.bedrooms || '',
            bathrooms: mockProp.bathrooms || '',
            parking_spots: mockProp.parking_spots || '',
            area_sqm: mockProp.area_sqm || ''
          });
        }
      }
    }
    init();
  }, [id]);

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setUploading(true);
    setUploadError(null);
    
    const files = Array.from(e.target.files);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      try {
        // 1. Otimizar e converter para WebP
        const optimizedFile = await compressAndConvertToWebP(file);
        
        // 2. Upload para Supabase Storage
        const randomString = Math.random().toString(36).substring(2, 7);
        const fileName = `${Date.now()}-${randomString}-${optimizedFile.name}`;
        const { data, error } = await supabase.storage
          .from('property-images')
          .upload(fileName, optimizedFile, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          if (error.message.includes('bucket not found')) {
            throw new Error('O bucket "property-images" não foi encontrado no seu Supabase. Crie-o na aba Storage.');
          }
          throw error;
        }

        // 3. Obter URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(fileName);
        
        uploadedUrls.push(publicUrl);
      } catch (err: any) {
        console.error('Erro no upload:', err);
        setUploadError(err.message || 'Erro ao enviar imagem');
      }
    }

    if (uploadedUrls.length > 0) {
      setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      setSessionImages(prev => [...prev, ...uploadedUrls]);
    }
    setUploading(false);
  };

  const removeImage = async (index: number) => {
    const imageUrl = formData.images[index];
    
    // Se a imagem foi enviada nesta sessão, podemos deletar imediatamente do storage
    if (sessionImages.includes(imageUrl)) {
      try {
        const urlObj = new URL(imageUrl);
        const pathParts = urlObj.pathname.split('/');
        const fileName = pathParts[pathParts.length - 1];
        await supabase.storage.from('property-images').remove([fileName]);
        setSessionImages(prev => prev.filter(img => img !== imageUrl));
      } catch (e) {
        console.warn('Erro ao remover imagem da sessão:', e);
      }
    }

    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const generateWithIA = async () => {
    setLoading(true);
    try {
      // 1. Buscar chave global primeiro
      const { data: globalSettings } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'gemini_api_key')
        .maybeSingle();

      let apiKey = globalSettings?.value;

      // 2. Se não houver chave global, tenta a do perfil (legado/fallback)
      if (!apiKey) {
        apiKey = profile?.gemini_api_key;
      }

      if (!apiKey) {
        alert('Configuração de IA não encontrada. Por favor, contate o administrador master.');
        setLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `Você é um Arquiteto de Vendas Imobiliárias de elite (ImobiFlow Sales Architect).
Sua missão é fundir dados técnicos com psicologia de consumo e SEO avançado para dominar a SERP do Google Brasil.

DIRETRIZES MESTRE (AUTORIDADE MÁXIMA):
${MASTER_COPY_RULES}

PROTOCOLO DE EXECUÇÃO:
1. Analise as DIRETRIZES MESTRE acima.
2. Processe as 10 respostas do Questionário Estratégico do corretor.
3. Funda as duas camadas para gerar o anúncio perfeito.

REGRAS DE FORMATAÇÃO:
- Título (SERP Optimized): Máximo 60 caracteres. Fórmula: [Tipo] à Venda em [Bairro], [Cidade] - [Diferencial].
- Descrição: Use Markdown (H2, H3, Bullets). Storytelling sensorial e gatilhos de Neuromarketing.

Responda APENAS com um objeto JSON válido seguindo EXATAMENTE esta estrutura: {"titulo": "string", "descricao": "string"}. Não use outras chaves.`;

      const userPrompt = `Gere o anúncio de elite para este imóvel:
DADOS TÉCNICOS:
- Transação: ${formData.purpose}
- Preço: ${formData.price}
- Tipo: ${formData.type}
- Localização: ${formData.neighborhood}, ${formData.city}
- Quartos: ${formData.bedrooms} | Banheiros: ${formData.bathrooms} | Vagas: ${formData.parking_spots} | Área: ${formData.area_sqm}m²

QUESTIONÁRIO ESTRATÉGICO:
1. Destaque Emocional: ${iaAnswers.emotional_highlight}
2. Incidência de Sol: ${iaAnswers.sun_exposure}
3. Estado de Reforma: ${iaAnswers.renovation_status}
4. Transporte Próximo: ${iaAnswers.nearby_transport}
5. Serviços Locais: ${iaAnswers.local_services}
6. Itens de Segurança: ${iaAnswers.security_features}
7. Lazer do Condomínio: ${iaAnswers.condo_leisure}
8. Condições Financeiras: ${iaAnswers.financial_conditions}
9. Diferencial Interno: ${iaAnswers.internal_differential}
10. Custos Fixos: ${iaAnswers.fixed_costs}

Dada a transação ser de ${formData.purpose}, adapte o título para "[Tipo] para ${formData.purpose} em [Bairro]..." e o texto conformadamente. Aplique Ancoragem, Aversão à Perda e Prova Social conforme as diretrizes.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      let result;
      
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error("JSON Parse Error. Raw text:", text);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("A IA retornou um formato inválido. Tente novamente.");
        }
      }
      
      const generatedTitle = result.titulo || result.title || result.titulo_anuncio;
      const generatedDescription = result.descricao || result.description || result.descricao_anuncio;

      if (!generatedTitle && !generatedDescription) {
        throw new Error('A IA não retornou um título ou descrição válidos. Verifique sua API Key.');
      }

      setFormData(prev => ({
        ...prev,
        title: generatedTitle || prev.title,
        description: generatedDescription || prev.description
      }));
      
      alert('Anúncio gerado com sucesso! Você foi redirecionado para a aba Manual para revisar.');
      setActiveTab('manual');
    } catch (err: any) {
      console.error('Erro na IA:', err);
      alert('Erro ao gerar conteúdo com IA: ' + err.message);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (localStorage.getItem('demo_mode') === 'true') {
      alert('Modo Demonstração: Alterações não são salvas.');
      setLoading(false);
      navigate('/admin');
      return;
    }

    if (!isSupabaseConfigured()) {
      alert('Modo de Teste: Alterações não serão persistidas sem login real.');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Ensure neighborhood exists in the database
    try {
      const { data: existing } = await supabase
        .from('neighborhoods')
        .select('*')
        .eq('nome', formData.neighborhood)
        .eq('cidade', formData.city)
        .single();

      if (!existing) {
        const slug = slugify(`${formData.neighborhood}-${formData.city}`);
        const meta_title = `Imóveis à venda no ${formData.neighborhood} - ${formData.city}`;
        
        let meta_description = `Encontre os melhores imóveis no bairro ${formData.neighborhood} em ${formData.city}. Diversas opções de casas e apartamentos.`;
        let descricao_seo = `O bairro ${formData.neighborhood} em ${formData.city} oferece excelentes oportunidades imobiliárias. Explore nossa lista de imóveis disponíveis.`;

        if (profile?.gemini_api_key) {
          try {
            const genAI = new GoogleGenAI({ apiKey: profile.gemini_api_key });
            const model = genAI.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Gere um JSON com "meta_description" e "descricao_seo" (em markdown) para o bairro ${formData.neighborhood} na cidade ${formData.city}. Foque em SEO imobiliário.`,
              config: { responseMimeType: 'application/json' }
            });
            const response = await model;
            const result = JSON.parse(response.text || '{}');
            meta_description = result.meta_description || meta_description;
            descricao_seo = result.descricao_seo || descricao_seo;
          } catch (err) {
            console.error('IA Neighborhood Error:', err);
          }
        }

        await supabase.from('neighborhoods').insert({
          nome: formData.neighborhood,
          cidade: formData.city,
          slug,
          meta_title,
          meta_description,
          descricao_seo
        });
      }
    } catch (err) {
      console.error('Error ensuring neighborhood:', err);
    }

    const payload: any = {
      ...formData,
      broker_id: user.id,
      price: parseCurrency(formData.price),
      bedrooms: formData.bedrooms === '' ? 0 : Number(formData.bedrooms),
      bathrooms: formData.bathrooms === '' ? 0 : Number(formData.bathrooms),
      parking_spots: formData.parking_spots === '' ? 0 : Number(formData.parking_spots),
      area_sqm: formData.area_sqm === '' ? 0 : Number(formData.area_sqm),
      updated_at: new Date().toISOString()
    };

    // Se for o primeiro imóvel deste corretor, marcar como destaque
    if (!id) {
      const { count } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('broker_id', user.id);
      
      if (count === 0) {
        payload.is_featured = true;
      }
    }

    const { error } = id 
      ? await supabase.from('properties').update(payload).eq('id', id)
      : await supabase.from('properties').insert(payload);

    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      // Limpeza de imagens órfãs se for uma edição
      if (id && originalImages.length > 0) {
        const removedImages = originalImages.filter(img => !formData.images.includes(img));
        if (removedImages.length > 0) {
          const filePaths = removedImages
            .map(url => {
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
      }
      navigate('/admin');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">{id ? 'Editar Imóvel' : 'Novo Imóvel'}</h1>
          <p className="text-zinc-500">Preencha os dados ou use a inteligência artificial.</p>
        </div>
        <button 
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-all shadow-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* 1. Detalhes Técnicos */}
          <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
            <h2 className="text-lg font-bold">Detalhes Técnicos</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Preço</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">R$</span>
                  <input 
                    type="text"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: maskCurrency(e.target.value)})}
                    className="w-full pl-10 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Tipo</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option>Apartamento</option>
                    <option>Casa</option>
                    <option>Terreno</option>
                    <option>Comercial</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Tipo de Transação</label>
                  <select 
                    value={formData.purpose}
                    onChange={e => setFormData({...formData, purpose: e.target.value})}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-bold text-emerald-600"
                  >
                    <option value="Venda">Venda</option>
                    <option value="Aluguel">Aluguel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Quartos</label>
                  <div className="relative">
                    <Bed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="number"
                      value={formData.bedrooms}
                      onChange={e => setFormData({...formData, bedrooms: e.target.value === '' ? '' : parseInt(e.target.value)})}
                      className="w-full pl-10 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Banheiros</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-2.12 0 1.5 1.5 0 0 0 0 2.12L6.88 8M16 8V7a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v1M12 5V3M7 8h10M7 12h10M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/></svg>
                    </div>
                    <input 
                      type="number"
                      value={formData.bathrooms}
                      onChange={e => setFormData({...formData, bathrooms: e.target.value === '' ? '' : parseInt(e.target.value)})}
                      className="w-full pl-10 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Vagas</label>
                  <div className="relative">
                    <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="number"
                      value={formData.parking_spots}
                      onChange={e => setFormData({...formData, parking_spots: e.target.value === '' ? '' : parseInt(e.target.value)})}
                      className="w-full pl-10 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Metragem (m²)</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
                    </div>
                    <input 
                      type="number"
                      value={formData.area_sqm}
                      onChange={e => setFormData({...formData, area_sqm: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                      className="w-full pl-10 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Cidade</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="text"
                      value={formData.city}
                      onChange={e => setFormData({...formData, city: e.target.value})}
                      className="w-full pl-10 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Ex: Rio de Janeiro"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Bairro</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="text"
                      value={formData.neighborhood}
                      onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                      className="w-full pl-10 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Ex: Centro"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Fotos do Imóvel */}
          <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              Fotos do Imóvel
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.images.map((url, index) => (
                <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-200 shadow-sm group">
                  <img 
                    src={url} 
                    alt="" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-600 rounded-full shadow-lg hover:bg-red-50 transition-all z-10 md:opacity-0 md:group-hover:opacity-100"
                    title="Remover foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {index === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-emerald-600/90 text-white text-[9px] font-black uppercase py-1.5 text-center tracking-widest">
                      Foto Principal
                    </div>
                  )}
                </div>
              ))}
              <label className={cn(
                "aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all",
                uploading ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50"
              )}>
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                    <span className="text-[10px] text-emerald-600 font-bold animate-pulse">Enviando...</span>
                  </div>
                ) : (
                  <>
                    <Plus className="w-6 h-6 text-zinc-400" />
                    <span className="text-xs text-zinc-500 font-medium">Add Fotos</span>
                  </>
                )}
                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
            {uploadError && (
              <p className="text-[10px] text-red-500 font-bold bg-red-50 p-2 rounded-lg border border-red-100">
                {uploadError}
              </p>
            )}
            <p className="text-[10px] text-zinc-400">As fotos serão automaticamente otimizadas e convertidas para WebP.</p>
          </div>

          {/* 3. Assistente de Redação (Tabs + Content) */}
          <div className="space-y-6">
            <div className="flex p-1 bg-zinc-100 rounded-2xl w-full md:w-fit overflow-x-auto scrollbar-hide">
              <div className="flex min-w-max">
                <button 
                  onClick={() => setActiveTab('manual')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                    activeTab === 'manual' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  <Info className="w-4 h-4" />
                  Modo Manual
                </button>
                <button 
                  onClick={() => setActiveTab('ia')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                    activeTab === 'ia' ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  Modo com IA
                </button>
              </div>
            </div>

            {activeTab === 'manual' ? (
              <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Título do Anúncio</label>
                    <div className="relative">
                      <HomeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        type="text"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        className="w-full pl-10 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Ex: Apartamento Moderno no Centro de Nova Iguaçu"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Descrição Detalhada</label>
                    <div className="relative">
                      <Info className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                      <textarea 
                        rows={6}
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="w-full pl-10 p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        placeholder="Descreva os detalhes, diferenciais e localização..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-3xl border border-emerald-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Wand2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="font-bold text-zinc-900">Assistente de Redação</h2>
                    <p className="text-xs text-zinc-500">Responda e deixe a IA criar o anúncio perfeito.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Destaque Emocional: O que você mais ama no imóvel?</label>
                    <input 
                      type="text"
                      value={iaAnswers.emotional_highlight}
                      onChange={e => setIaAnswers({...iaAnswers, emotional_highlight: e.target.value})}
                      className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Ex: A vista do pôr do sol na sala é de tirar o fôlego"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Incidência de Sol</label>
                      <select 
                        value={iaAnswers.sun_exposure}
                        onChange={e => setIaAnswers({...iaAnswers, sun_exposure: e.target.value})}
                        className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                      >
                        <option value="">Selecione...</option>
                        <option value="Sol da manhã">Sol da manhã</option>
                        <option value="Sol da tarde">Sol da tarde</option>
                        <option value="Sol o dia todo">Sol o dia todo</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Estado de Reforma</label>
                      <select 
                        value={iaAnswers.renovation_status}
                        onChange={e => setIaAnswers({...iaAnswers, renovation_status: e.target.value})}
                        className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                      >
                        <option value="">Selecione...</option>
                        <option value="Original">Original</option>
                        <option value="Reformado">Reformado</option>
                        <option value="Pronto para morar">Pronto para morar</option>
                        <option value="Primeira locação">Primeira locação</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Transporte Próximo</label>
                      <input 
                        type="text"
                        value={iaAnswers.nearby_transport}
                        onChange={e => setIaAnswers({...iaAnswers, nearby_transport: e.target.value})}
                        className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Ex: 5 min da estação SuperVia, BRT próximo"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Serviços Locais (até 5 min a pé)</label>
                      <input 
                        type="text"
                        value={iaAnswers.local_services}
                        onChange={e => setIaAnswers({...iaAnswers, local_services: e.target.value})}
                        className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Ex: Padaria, mercado, farmácia"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Itens de Segurança</label>
                      <input 
                        type="text"
                        value={iaAnswers.security_features}
                        onChange={e => setIaAnswers({...iaAnswers, security_features: e.target.value})}
                        className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Ex: Portaria 24h, câmeras, biometria"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Lazer do Condomínio</label>
                      <input 
                        type="text"
                        value={iaAnswers.condo_leisure}
                        onChange={e => setIaAnswers({...iaAnswers, condo_leisure: e.target.value})}
                        className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Ex: Piscina, academia, churrasqueira"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Condições Financeiras</label>
                      <input 
                        type="text"
                        value={iaAnswers.financial_conditions}
                        onChange={e => setIaAnswers({...iaAnswers, financial_conditions: e.target.value})}
                        className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Ex: Aceita FGTS, MCMV, entrada parcelada"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Diferencial Interno</label>
                      <input 
                        type="text"
                        value={iaAnswers.internal_differential}
                        onChange={e => setIaAnswers({...iaAnswers, internal_differential: e.target.value})}
                        className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Ex: Varanda gourmet, suíte, cozinha americana"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Custos Fixos Estimados (Condomínio e IPTU)</label>
                    <input 
                      type="text"
                      value={iaAnswers.fixed_costs}
                      onChange={e => setIaAnswers({...iaAnswers, fixed_costs: e.target.value})}
                      className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="Ex: Cond: R$ 450, IPTU: R$ 80"
                    />
                  </div>

                  <button 
                    onClick={generateWithIA}
                    disabled={loading}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    Gerar Anúncio de Elite
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 pb-12 mt-8">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-200"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Salvando...' : 'Publicar Imóvel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
