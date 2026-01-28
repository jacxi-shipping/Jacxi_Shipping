'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Ship, Menu, X, ArrowRight } from 'lucide-react';
import { Slide, Fade, Box } from '@mui/material';
import Button from '@/components/design-system/Button';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Services', href: '/#services' },
    { name: 'Tracking', href: '/tracking' },
    { name: 'About', href: '/#about' },
    { name: 'Contact', href: '/#contact' },
  ];

  return (
    <>
      <Slide in={true} direction="down">
        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            isScrolled 
              ? 'bg-white/80 backdrop-blur-md border-b border-[var(--border)] py-4 shadow-sm' 
              : 'bg-transparent py-6'
          }`}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-10 h-10 flex items-center justify-center bg-[var(--accent-gold)] rounded-xl overflow-hidden group-hover:scale-105 transition-transform duration-300 shadow-md">
                  <Ship className="w-6 h-6 text-white" />
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className={`text-xl font-bold tracking-tight ${isScrolled ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}>
                  JACXI
                </span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-8">
                {navLinks.map((link) => (
                  <Link 
                    key={link.name} 
                    href={link.href}
                    className={`text-sm font-medium transition-colors relative group ${
                      isScrolled ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {link.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[var(--accent-gold)] transition-all duration-300 group-hover:w-full" />
                  </Link>
                ))}
              </nav>

              {/* CTA & Mobile Toggle */}
              <div className="flex items-center gap-4">
                <Link href="/auth/signin">
                  <Button variant={isScrolled ? 'primary' : 'primary'} size="sm" icon={<ArrowRight className="w-4 h-4" />} iconPosition="end">
                    Sign In
                  </Button>
                </Link>

                <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden p-2 text-[var(--text-primary)] hover:bg-[var(--panel)] rounded-lg transition-colors"
                >
                  <Menu className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </header>
      </Slide>

      {/* Mobile Menu Overlay */}
      <Fade in={isMobileMenuOpen}>
        <div className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-xl md:hidden">
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-12">
              <Link href="/" className="flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="w-10 h-10 flex items-center justify-center bg-[var(--accent-gold)] rounded-xl shadow-lg">
                  <Ship className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-[var(--text-primary)]">JACXI</span>
              </Link>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--panel)] rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex flex-col gap-6 text-center">
              {navLinks.map((link, i) => (
                <Slide 
                  key={link.name} 
                  in={isMobileMenuOpen} 
                  direction="up" 
                  style={{ transitionDelay: `${100 + i * 50}ms` }}
                >
                  <div>
                    <Link 
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="text-3xl font-medium text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors block py-2"
                    >
                      {link.name}
                    </Link>
                  </div>
                </Slide>
              ))}
            </nav>

            <div className="mt-auto pb-8">
              <Link href="/auth/signin" onClick={() => setIsMobileMenuOpen(false)}>
                <Button fullWidth size="lg">
                  Sign In / Register
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Fade>
    </>
  );
}
