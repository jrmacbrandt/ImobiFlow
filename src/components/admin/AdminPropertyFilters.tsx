import React, { useState } from 'react';
import { Search, MapPin, Home, X, Filter } from 'lucide-react';
import { cn, maskCurrency } from '../../lib/utils';

interface AdminPropertyFiltersProps {
  filters: {
    type: string;
    neighborhood: string;
    minPrice: string;
    maxPrice: string;
    search: string;
    propertyCode: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    type: string;
    neighborhood: string;
    minPrice: string;
    maxPrice: string;
    search: string;
    propertyCode: string;
  }>>;
  neighborhoods: string[];
  propertyTypes: string[];
}

export function AdminPropertyFilters({ filters, setFilters, neighborhoods, propertyTypes }: AdminPropertyFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const clearFilters = () => {
    setFilters({
      type: '',
      neighborhood: '',
      minPrice: '',
      maxPrice: '',
      search: '',
      propertyCode: ''
    });
  };

  const hasActiveFilters = filters.type || filters.neighborhood || filters.minPrice || filters.maxPrice || filters.search || filters.propertyCode;

  return (
    <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-zinc-100 shadow-sm mb-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between md:hidden">
          <h3 className="font-bold text-zinc-900">Filtros</h3>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 bg-zinc-50 rounded-xl text-zinc-600"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        <div className={cn(
          "flex flex-col gap-6",
          !isOpen && "hidden md:flex"
        )}>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-[2] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por título..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            {/* Code Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Cód. Imóvel"
                maxLength={4}
                value={filters.propertyCode}
                onChange={(e) => setFilters(prev => ({ ...prev, propertyCode: e.target.value.replace(/\D/g, '') }))}
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-zinc-900 placeholder:text-zinc-400"
              />
            </div>

            {/* Type Filter */}
            <div className="w-full md:w-48 relative">
              <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-zinc-900 appearance-none cursor-pointer"
              >
                <option value="">Todos os Tipos</option>
                {propertyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Neighborhood Filter */}
            <div className="w-full md:w-64 relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <select
                value={filters.neighborhood}
                onChange={(e) => setFilters(prev => ({ ...prev, neighborhood: e.target.value }))}
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-zinc-900 appearance-none cursor-pointer"
              >
                <option value="">Todos os Bairros</option>
                {neighborhoods.map(nb => (
                  <option key={nb} value={nb}>{nb}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Price Range */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-40">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">R$</span>
                <input
                  type="text"
                  placeholder="Preço Mín."
                  value={filters.minPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: maskCurrency(e.target.value) }))}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-zinc-900 placeholder:text-zinc-400"
                />
              </div>
              <span className="text-zinc-300 font-bold">à</span>
              <div className="relative flex-1 md:w-40">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">R$</span>
                <input
                  type="text"
                  placeholder="Preço Máx."
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: maskCurrency(e.target.value) }))}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-zinc-900 placeholder:text-zinc-400"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 font-bold text-xs uppercase tracking-widest transition-colors ml-auto"
              >
                <X className="w-4 h-4" />
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
