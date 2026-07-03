'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { SiteMark } from '@/components/brand/SiteLogo';

interface HeaderProps {
  isAuthenticated?: boolean;
}

const navLinks = [
  { name: 'Services', href: '/#services' },
  { name: 'Route', href: '/#route' },
  { name: 'Process', href: '/#process' },
  { name: 'Calculator', href: '/#calculator' },
  { name: 'FAQ', href: '/#faq' },
  { name: 'Tracking', href: '/tracking' },
  { name: 'Contact', href: '/#contact' },
];

export default function Header({ isAuthenticated = false }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const ctaHref = isAuthenticated ? '/dashboard' : '/#quote';
  const ctaLabel = isAuthenticated ? 'Dashboard' : 'Get quote';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 18);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
        <div
          className={`mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[rgba(var(--panel-rgb),0.86)] px-4 py-3 backdrop-blur-2xl transition-all duration-300 sm:px-5 ${
            isScrolled ? 'shadow-[0_18px_60px_rgba(var(--text-primary-rgb),0.12)]' : 'shadow-[0_14px_46px_rgba(var(--text-primary-rgb),0.08)]'
          }`}
        >
          <Link href="/" className="flex min-w-0 items-center" aria-label="Jacxi Shipping home">
            <span className="flex items-center gap-3">
              <SiteMark size={40} className="!h-10 !w-10" priority />
              <span className="hidden leading-none text-[var(--text-primary)] sm:block">
                <span className="block text-sm font-black">JACXI</span>
                <span className="block text-[11px] font-bold uppercase text-[var(--accent-gold)]">Shipping</span>
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={ctaHref}
              className="hidden h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent-gold)] px-4 text-sm font-bold text-[var(--text-primary)] transition-all hover:-translate-y-0.5 hover:brightness-105 md:inline-flex"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] transition-colors lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-[60] bg-[var(--background)] text-[var(--text-primary)] lg:hidden">
          <div className="flex h-full flex-col px-5 py-5">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
                <span className="flex items-center gap-3">
                  <SiteMark size={42} className="!h-11 !w-11" priority />
                  <span className="leading-none text-[var(--text-primary)]">
                    <span className="block text-base font-black">JACXI</span>
                    <span className="block text-xs font-bold uppercase text-[var(--accent-gold)]">Shipping</span>
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)]"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="mt-12 grid gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-4 text-2xl font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-gold)]"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <Link
              href={ctaHref}
              onClick={() => setIsMobileMenuOpen(false)}
              className="mt-auto inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-[var(--accent-gold)] px-6 text-base font-bold text-[var(--text-primary)]"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
