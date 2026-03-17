import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

export function maskCurrency(value: string) {
  // Remove tudo que não é dígito
  const cleanValue = value.replace(/\D/g, "");
  
  if (!cleanValue) return "";

  // Converte para número e divide por 100 para ter as casas decimais
  const numberValue = Number(cleanValue) / 100;
  
  // Formata como moeda brasileira
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numberValue);
}

export function parseCurrency(value: string): number {
  return Number(value.replace(/\D/g, "")) / 100;
}
