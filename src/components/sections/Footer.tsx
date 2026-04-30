import Link from 'next/link';
import { Ship } from 'lucide-react';

const navigationLinks = [
  { label: 'Services', href: '/#services' },
  { label: 'How It Works', href: '/#process' },
  { label: 'Tracking', href: '/tracking' },
  { label: 'Testimonials', href: '/#testimonials' },
  { label: 'About', href: '/#about' },
  { label: 'Contact', href: '/#contact' },
  { label: 'Get a Quote', href: '/#quote' },
];

const socialLinks = [
  { label: 'FB', href: 'https://facebook.com/' },
  { label: 'IG', href: 'https://instagram.com/' },
  { label: 'WA', href: 'https://wa.me/93704117413' },
];

const contactNumbers = [
  { href: 'tel:+19252008927', label: '+1(925)2008927' },
  { href: 'tel:+93704117413', label: '+93704117413' },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[#0f172a] pt-20 pb-10 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_0.9fr_1fr]">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-[var(--accent-gold)] rounded-xl shadow-sm">
                <Ship className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">JACXI SHIPPING</span>
            </Link>
            <p className="leading-relaxed text-slate-300">
              Pioneering vehicle logistics from the USA to Afghanistan for over a decade. Trusted by thousands.
            </p>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-slate-700 px-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-300 transition-colors hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-6 text-sm font-bold uppercase tracking-[0.18em] text-white">Navigation</h4>
            <ul className="space-y-4">
              {navigationLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-slate-300 transition-colors hover:text-[var(--accent-gold)]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-6 text-sm font-bold uppercase tracking-[0.18em] text-white">Contact</h4>
            <div className="space-y-5 text-slate-300">
              <p>Herat Customs Department, Herat, Afghanistan</p>
              <div className="space-y-1">
                {contactNumbers.map((number) => (
                  <a key={number.href} href={number.href} className="block transition-colors hover:text-[var(--accent-gold)]">
                    {number.label}
                  </a>
                ))}
              </div>
              <a href="mailto:info@jacxi.com" className="block transition-colors hover:text-[var(--accent-gold)]">info@jacxi.com</a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 md:flex-row">
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} Jacxi Shipping. All rights reserved.
          </p>
          <div className="flex gap-8 text-sm text-slate-400">
            <Link href="/privacy" className="transition-colors hover:text-[var(--accent-gold)]">Privacy Policy</Link>
            <Link href="/terms" className="transition-colors hover:text-[var(--accent-gold)]">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
