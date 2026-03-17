export const MOCK_PROPERTIES = [
  {
    id: '1',
    title: 'Apartamento Luxo com Vista Mar',
    description: 'Um incrível apartamento localizado no coração da Barra da Tijuca. Sol da manhã, varanda gourmet e acabamento de alto padrão.',
    price: 1250000,
    type: 'Apartamento',
    purpose: 'Venda',
    neighborhood: 'Barra da Tijuca',
    city: 'Rio de Janeiro',
    bedrooms: 3,
    bathrooms: 2,
    parking_spots: 2,
    area_sqm: 120,
    images: ['https://picsum.photos/seed/apt1/1200/900', 'https://picsum.photos/seed/apt2/1200/900'],
    is_featured: true,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Casa Duplex em Condomínio Fechado',
    description: 'Segurança e conforto para sua família em Nova Iguaçu. Casa ampla com quintal e piscina.',
    price: 850000,
    type: 'Casa',
    purpose: 'Venda',
    neighborhood: 'Centro',
    city: 'Nova Iguaçu',
    bedrooms: 4,
    bathrooms: 3,
    parking_spots: 3,
    area_sqm: 250,
    images: ['https://picsum.photos/seed/house1/1200/900', 'https://picsum.photos/seed/house2/1200/900'],
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Studio Moderno Próximo ao Metrô',
    description: 'Ideal para investimento ou moradia prática. Totalmente mobiliado e decorado.',
    price: 450000,
    type: 'Apartamento',
    purpose: 'Venda',
    neighborhood: 'Botafogo',
    city: 'Rio de Janeiro',
    bedrooms: 1,
    bathrooms: 1,
    parking_spots: 1,
    area_sqm: 35,
    images: ['https://picsum.photos/seed/studio1/1200/900'],
    created_at: new Date().toISOString()
  },
  {
    id: '4',
    title: 'Cobertura Linear com Piscina Privativa',
    description: 'Exclusividade e sofisticação. Vista panorâmica para as montanhas.',
    price: 2100000,
    type: 'Apartamento',
    purpose: 'Venda',
    neighborhood: 'Recreio',
    city: 'Rio de Janeiro',
    bedrooms: 3,
    bathrooms: 4,
    parking_spots: 2,
    area_sqm: 180,
    images: ['https://picsum.photos/seed/penthouse1/1200/900'],
    created_at: new Date().toISOString()
  }
];

export const MOCK_PROFILE = {
  id: 'demo-user',
  full_name: 'Corretor Demo',
  creci: '12345-F',
  whatsapp_number: '21999999999',
  gemini_api_key: ''
};
