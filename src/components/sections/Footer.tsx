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
    <footer className="border-t border-[var(--border)] bg-[var(--panel)] pt-16 pb-8 text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center">
              <SiteLogo variant="main" className="w-[188px] sm:w-[220px]" priority />
            </Link>
            <p className="mt-5 max-w-md text-base leading-7 text-[var(--text-secondary)]">
              Premium vehicle shipping from anywhere in the USA and Canada to Afghanistan through either the Mersin route or the UAE route.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-xs font-black text-[var(--text-secondary)] transition hover:-translate-y-0.5 hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase text-[var(--text-primary)]">Navigation</h4>
            <ul className="mt-5 space-y-3">
              {navigationLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-gold)]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase text-[var(--text-primary)]">Contact</h4>
            <div className="mt-5 space-y-4 text-sm font-bold text-[var(--text-secondary)]">
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

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--border)] pt-6 md:flex-row">
          <p className="text-sm text-[var(--text-secondary)]">
            &copy; {new Date().getFullYear()} Jacxi Shipping. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-[var(--text-secondary)]">
            <Link href="/privacy" className="transition-colors hover:text-[var(--accent-gold)]">Privacy Policy</Link>
            <Link href="/terms" className="transition-colors hover:text-[var(--accent-gold)]">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
