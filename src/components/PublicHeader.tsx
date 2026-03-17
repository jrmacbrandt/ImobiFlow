import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X as CloseIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export function PublicHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/imoveis', label: 'Imóveis' },
    { to: '/bairros', label: 'Bairros' },
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold tracking-tighter text-emerald-600">
          ImobiFlow<span className="text-zinc-900">2026</span>
        </Link>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
          {navLinks.map(link => (
            <Link 
              key={link.to} 
              to={link.to} 
              className={cn(
                "transition-colors",
                location.pathname === link.to ? "text-emerald-600 font-bold" : "hover:text-emerald-600"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-zinc-600"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <CloseIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-zinc-200 overflow-hidden"
          >
            <nav className="flex flex-col p-4 gap-4 text-sm font-medium text-zinc-600">
              {navLinks.map(link => (
                <Link 
                  key={link.to} 
                  to={link.to} 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className={cn(
                    "py-2 transition-colors",
                    location.pathname === link.to ? "text-emerald-600 font-bold" : "hover:text-emerald-600"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
