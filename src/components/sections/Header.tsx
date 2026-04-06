'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Ship, Menu, X, ArrowRight } from 'lucide-react';

interface HeaderProps {
  isAuthenticated?: boolean;
}

export default function Header({ isAuthenticated = false }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const ctaHref = isAuthenticated ? '/dashboard' : '/auth/signin';
  const ctaLabel = isAuthenticated ? 'Dashboard' : 'Get a Quote';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Services', href: '/#services' },
    { name: 'How It Works', href: '/#process' },
    { name: 'Testimonials', href: '/#testimonials' },
    { name: 'Tracking', href: '/tracking' },
    { name: 'About', href: '/#about' },
    { name: 'Contact', href: '/#contact' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'border-b border-[var(--border)] bg-white/92 py-4 shadow-sm backdrop-blur-md'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-gold)] text-white shadow-sm">
                <Ship className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--text-primary)] sm:text-base">
                JACXI SHIPPING
              </span>
            </Link>

            <nav className="hidden items-center gap-8 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href={ctaHref}
                className="hidden items-center gap-2 rounded-full bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 md:inline-flex"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-lg p-2 text-[var(--text-primary)] transition-colors hover:bg-[var(--panel)] md:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-xl md:hidden">
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-12">
              <Link href="/" className="flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="w-10 h-10 flex items-center justify-center bg-[var(--accent-gold)] rounded-xl shadow-lg">
                  <Ship className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--text-primary)]">JACXI SHIPPING</span>
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--panel)] rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex flex-col gap-6 text-center">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 text-3xl font-medium text-[var(--text-primary)] transition-colors hover:text-[var(--accent-gold)]"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="mt-auto pb-8">
              <Link
                href={ctaHref}
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0f172a] px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-slate-800"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
