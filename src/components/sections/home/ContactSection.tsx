'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ContactSectionProps {
  isAuthenticated?: boolean;
}

const socialLinks = [
  { label: 'FB', href: 'https://facebook.com/' },
  { label: 'IG', href: 'https://instagram.com/' },
  { label: 'WA', href: 'https://wa.me/93704117413' },
];

const contactNumbers = [
  { href: 'tel:+19252008927', label: '+1(925)2008927' },
  { href: 'tel:+93704117413', label: '+93704117413' },
];

export default function ContactSection({ isAuthenticated = false }: ContactSectionProps) {
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formState.name,
          email: formState.email,
          phone: '+19252008927',
          message: `General inquiry:\n${formState.message}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setSubmitted(true);
  setFormState({ name: '', email: '', message: '' });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="bg-[var(--background)] py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-[var(--accent-gold)]">Contact Us</p>
          <h2 className="text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl lg:text-[3.2rem]">Get In Touch</h2>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            Ready to ship your vehicle? Have questions? Our team is here to help.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="rounded-[2rem] border border-[var(--border)] bg-white p-8 shadow-sm shadow-slate-900/5">
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">Contact Information</h3>
            <div className="mt-8 space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Address</p>
                <p className="mt-2 text-[var(--text-primary)]">Herat Customs Department<br />Herat, Afghanistan</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Phone</p>
                <div className="mt-2 space-y-1">
                  {contactNumbers.map((number) => (
                    <a key={number.href} href={number.href} className="block text-[var(--text-primary)] hover:text-[var(--accent-gold)]">
                      {number.label}
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Email</p>
                <a href="mailto:info@jacxi.com" className="mt-2 block text-[var(--text-primary)] hover:text-[var(--accent-gold)]">info@jacxi.com</a>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Business Hours</p>
                <p className="mt-2 text-[var(--text-primary)]">Mon - Sat, 8am - 6pm Afghanistan Time (AFT/UTC+4:30)</p>
              </div>
            </div>

            <div className="mt-10 border-t border-[var(--border)] pt-6">
              <div className="flex flex-wrap gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-primary)] transition-colors hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="mt-6">
                <Link
                  href={isAuthenticated ? '/dashboard' : '/auth/signin'}
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--accent-gold)] px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                >
                  {isAuthenticated ? 'Open Dashboard' : 'Customer Portal'}
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--border)] bg-white p-8 shadow-sm shadow-slate-900/5">
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">Send a Message</h3>
            {submitted ? (
              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6 text-green-800">
                Your message has been sent. Our team will respond shortly.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <input
                    value={formState.name}
                    onChange={(event) => handleChange('name', event.target.value)}
                    placeholder="Your Name"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none transition-colors focus:border-[var(--accent-gold)]"
                    required
                  />
                  <input
                    value={formState.email}
                    onChange={(event) => handleChange('email', event.target.value)}
                    placeholder="Email Address"
                    type="email"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none transition-colors focus:border-[var(--accent-gold)]"
                    required
                  />
                </div>
                <textarea
                  value={formState.message}
                  onChange={(event) => handleChange('message', event.target.value)}
                  placeholder="Message"
                  rows={6}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none transition-colors focus:border-[var(--accent-gold)]"
                  required
                />
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[#0f172a] px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                >
                  {submitting ? 'Sending...' : 'Send Message ->'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}