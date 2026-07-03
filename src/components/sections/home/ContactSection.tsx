'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';

interface ContactSectionProps {
  isAuthenticated?: boolean;
}

const socialLinks = [
  { label: 'FB', href: 'https://facebook.com/' },
  { label: 'IG', href: 'https://instagram.com/' },
  { label: 'WA', href: 'https://wa.me/93704117413' },
];

const contactNumbers = [
  { href: 'tel:+19252008927', label: '+1 (925) 200-8927' },
  { href: 'tel:+93704117413', label: '+93 704 117 413' },
];

const inputClassName = 'w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-base text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-gold)] focus:ring-4 focus:ring-[rgba(var(--accent-gold-rgb),0.16)]';

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
    <section id="contact" className="relative overflow-hidden bg-[var(--panel)] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="landing-reveal text-sm font-bold uppercase text-[var(--accent-gold)]">Contact</p>
            <h2 className="landing-reveal mt-4 max-w-xl text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
              Talk to a shipping coordinator.
            </h2>
            <p className="landing-reveal mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
              Ready to ship your vehicle or need route clarity? Reach the team by phone, WhatsApp, email, or the message form.
            </p>

            <div className="landing-reveal mt-8 grid gap-3">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5">
                <div className="flex gap-4">
                  <MapPin className="mt-1 h-5 w-5 text-[var(--accent-gold)]" />
                  <div>
                    <p className="font-black text-[var(--text-primary)]">Address</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">Herat Customs Department, Herat, Afghanistan</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5">
                <div className="flex gap-4">
                  <Phone className="mt-1 h-5 w-5 text-[var(--accent-gold)]" />
                  <div>
                    <p className="font-black text-[var(--text-primary)]">Phone</p>
                    <div className="mt-1 space-y-1">
                      {contactNumbers.map((number) => (
                        <a key={number.href} href={number.href} className="block text-sm font-bold text-[var(--text-primary)] hover:text-[var(--accent-gold)]">
                          {number.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5">
                <div className="flex gap-4">
                  <Mail className="mt-1 h-5 w-5 text-[var(--accent-gold)]" />
                  <div>
                    <p className="font-black text-[var(--text-primary)]">Email</p>
                    <a href="mailto:info@jacxi.com" className="mt-1 block text-sm font-bold text-[var(--text-primary)] hover:text-[var(--accent-gold)]">info@jacxi.com</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="landing-reveal mt-6 flex flex-wrap gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 text-xs font-black text-[var(--text-primary)] transition hover:-translate-y-0.5 hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href={isAuthenticated ? '/dashboard' : '/auth/signin'}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--accent-gold)] px-4 text-xs font-black text-white transition hover:-translate-y-0.5 hover:brightness-105"
              >
                {isAuthenticated ? 'Open dashboard' : 'Customer portal'}
              </Link>
            </div>
          </div>

          <div className="landing-reveal overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-[0_24px_80px_rgba(var(--text-primary-rgb),0.10)]">
            <div className="border-b border-[var(--border)] bg-[var(--background)] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[var(--text-primary)]">Send a message</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">We usually respond within one business day.</p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 lg:p-8">
              {submitted ? (
                <div className="rounded-lg border border-[rgba(var(--success-rgb),0.3)] bg-[var(--success-light)] p-6 text-[var(--success-dark)]">
                  Your message has been sent. Our team will respond shortly.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <input
                      value={formState.name}
                      onChange={(event) => handleChange('name', event.target.value)}
                      placeholder="Your name"
                      className={inputClassName}
                      required
                    />
                    <input
                      value={formState.email}
                      onChange={(event) => handleChange('email', event.target.value)}
                      placeholder="Email address"
                      type="email"
                      className={inputClassName}
                      required
                    />
                  </div>
                  <textarea
                    value={formState.message}
                    onChange={(event) => handleChange('message', event.target.value)}
                    placeholder="Message"
                    rows={6}
                    className={`${inputClassName} resize-none`}
                    required
                  />
                  {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-gold)] px-6 py-4 text-base font-black text-white transition hover:-translate-y-0.5 hover:brightness-105 disabled:opacity-60"
                  >
                    {submitting ? 'Sending...' : 'Send message'}
                    {!submitting ? <ArrowRight className="h-5 w-5" /> : null}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
