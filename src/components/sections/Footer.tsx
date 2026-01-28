'use client';

import Link from 'next/link';
import { Ship, Twitter, Linkedin, Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';

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
              Pioneering the future of global logistics with AI-driven solutions and unwavering reliability.
            </p>
            <div className="flex gap-4">
              {[Twitter, Linkedin, Facebook, Instagram].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-full bg-white border border-[var(--border)] flex items-center justify-center hover:bg-[var(--accent-gold)] hover:text-white hover:border-transparent transition-all duration-300 shadow-sm">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-[var(--text-primary)]">Company</h4>
            <ul className="space-y-4">
              {['About Us', 'Careers', 'News', 'Partners', 'Legal'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-[var(--text-primary)]">Services</h4>
            <ul className="space-y-4">
              {['Ocean Freight', 'Air Cargo', 'Ground Transport', 'Warehousing', 'Customs Brokerage'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors">
                    {item}
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
            <Link href="#" className="hover:text-[var(--accent-gold)] transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-[var(--accent-gold)] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
