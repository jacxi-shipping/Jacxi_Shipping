import Link from 'next/link';
import { Ship, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';

const companyLinks = [
  { label: 'About Us', href: '/#about' },
  { label: 'Services', href: '/services' },
  { label: 'Tracking', href: '/tracking' },
  { label: 'Customer Portal', href: '/auth/signin' },
  { label: 'Contact', href: '/#contact' },
];

const serviceLinks = [
  { label: 'Vehicle Shipping', href: '/services' },
  { label: 'Container Loading', href: '/services' },
  { label: 'Customs Clearance', href: '/services' },
  { label: 'Transit Coordination', href: '/services' },
  { label: 'Live Tracking', href: '/tracking' },
];

const quickActions = [
  { label: 'Track Shipment', href: '/tracking' },
  { label: 'Request Quote', href: '/#contact' },
];

export default function Footer() {
  return (
    <footer className="bg-[var(--panel)] text-[var(--text-primary)] border-t border-[var(--border)] pt-20 pb-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-[var(--accent-gold)] rounded-xl shadow-sm">
                <Ship className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">JACXI</span>
            </Link>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Vehicle shipping for Afghan customers who need one team managing export in the USA, coordination in the UAE, and delivery planning inside Afghanistan.
            </p>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-[var(--text-primary)]">Company</h4>
            <ul className="space-y-4">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-[var(--text-primary)]">Services</h4>
            <ul className="space-y-4">
              {serviceLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-[var(--text-primary)]">Contact</h4>
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-[var(--accent-gold)] shrink-0" />
                <span className="text-[var(--text-secondary)]">Across to the Herat Customs Department, Herat, Afghanistan</span>
              </li>
              <li className="flex items-center gap-4">
                <Phone className="w-5 h-5 text-[var(--accent-gold)] shrink-0" />
                <span className="text-[var(--text-secondary)]">+93 77 000 0085</span>
              </li>
              <li className="flex items-center gap-4">
                <Mail className="w-5 h-5 text-[var(--accent-gold)] shrink-0" />
                <span className="text-[var(--text-secondary)]">info@jacxi.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[var(--text-secondary)] text-sm">
            © {new Date().getFullYear()} Jacxi Shipping. All rights reserved.
          </p>
          <div className="flex gap-8 text-sm text-[var(--text-secondary)]">
            <Link href="/tracking" className="hover:text-[var(--accent-gold)] transition-colors">Track Shipment</Link>
            <Link href="/#contact" className="hover:text-[var(--accent-gold)] transition-colors">Contact Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
