import Link from 'next/link';
import SiteLogo from '@/components/brand/SiteLogo';

const navigationLinks = [
  { label: 'Services', href: '/#services' },
  { label: 'Route', href: '/#route' },
  { label: 'How It Works', href: '/#process' },
  { label: 'Calculator', href: '/#calculator' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Tracking', href: '/tracking' },
  { label: 'Get a Quote', href: '/#quote' },
];

const socialLinks = [
  { label: 'FB', href: 'https://facebook.com/' },
  { label: 'IG', href: 'https://instagram.com/' },
  { label: 'WA', href: 'https://wa.me/93704117413' },
];

const contactNumbers = [
  { href: 'tel:+19252008927', label: '+1 (925) 200-8927' },
  { href: 'tel:+93704117413', label: '+93 704 117 413' },
];

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(var(--border-rgb),0.5)] bg-white/50 backdrop-blur-sm pt-20 pb-10 text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_0.75fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center group">
              <span className="transition-transform duration-300 group-hover:scale-105">
                <SiteLogo variant="main" className="w-[188px] sm:w-[220px]" priority />
              </span>
            </Link>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-[var(--text-secondary)]">
              Premium vehicle shipping from anywhere in the <span className="font-semibold text-[var(--text-primary)]">USA and Canada</span> to <span className="font-semibold text-[var(--text-primary)]">Afghanistan</span> through either the Mersin route or the UAE route.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-[rgba(var(--border-rgb),0.6)] bg-white px-4 text-xs font-bold tracking-wide text-[var(--text-secondary)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] hover:shadow-md"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-primary)] opacity-80 mb-6">Navigation</h4>
            <ul className="space-y-4">
              {navigationLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="group relative inline-flex text-sm font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                    {item.label}
                    <span className="absolute -bottom-1 left-0 h-px w-0 bg-[var(--accent-gold)] transition-all duration-300 group-hover:w-full" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-primary)] opacity-80 mb-6">Contact</h4>
            <div className="space-y-5 text-sm font-bold text-[var(--text-secondary)]">
              <p className="leading-relaxed">Herat Customs Department,<br/>Herat, Afghanistan</p>
              <div className="space-y-2">
                {contactNumbers.map((number) => (
                  <a key={number.href} href={number.href} className="block transition-colors hover:text-[var(--accent-gold)] flex items-center gap-2">
                    <span className="text-[var(--accent-gold)] opacity-70">✆</span> {number.label}
                  </a>
                ))}
              </div>
              <a href="mailto:info@jacxi.com" className="block transition-colors hover:text-[var(--accent-gold)] flex items-center gap-2 mt-4 pt-4 border-t border-[rgba(var(--border-rgb),0.5)]">
                <span className="text-[var(--accent-gold)] opacity-70">✉</span> info@jacxi.com
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-[rgba(var(--border-rgb),0.5)] pt-8 md:flex-row">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            &copy; {new Date().getFullYear()} Jacxi Shipping. All rights reserved.
          </p>
          <div className="flex gap-8 text-sm font-medium text-[var(--text-secondary)]">
            <Link href="/privacy" className="transition-colors hover:text-[var(--text-primary)]">Privacy Policy</Link>
            <Link href="/terms" className="transition-colors hover:text-[var(--text-primary)]">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
