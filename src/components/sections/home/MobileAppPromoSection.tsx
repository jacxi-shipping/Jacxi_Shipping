'use client';

import { motion } from 'framer-motion';
import { Bell, ChevronRight, MapPin, Receipt, ShieldCheck, Smartphone } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: <MapPin className="h-5 w-5" />,
    title: 'Live tracking',
    description: 'Follow active shipments as they move through pickup, port, transit, customs, and final delivery.',
  },
  {
    icon: <Receipt className="h-5 w-5" />,
    title: 'Invoices and receipts',
    description: 'Review balances, documents, and payment details from the customer portal.',
  },
  {
    icon: <Bell className="h-5 w-5" />,
    title: 'Milestone alerts',
    description: 'Receive status updates when important shipment or document events are posted.',
  },
];

export default function MobileAppPromoSection() {
  return (
    <section className="relative overflow-hidden bg-[var(--background)] py-20 text-[var(--text-primary)] sm:py-24">
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase text-[var(--accent-gold)]">Customer portal</p>
          <h2 className="mt-4 text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
            Shipment visibility from the browser in your pocket.
          </h2>
          <p className="mt-5 text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
            Customers can access shipment updates, invoices, receipts, and document activity from a mobile-friendly portal without installing a separate app.
          </p>

          <div className="mt-8 grid gap-4">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
                    {feature.icon}
                  </div>
                  <div>
                    <p className="font-black text-[var(--text-primary)]">{feature.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/auth/signin"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-[var(--accent-gold)] px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:brightness-105"
          >
            Access portal
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative mx-auto w-full max-w-[360px] lg:mr-8">
          <motion.div
            className="absolute -left-4 top-16 z-20 hidden items-center gap-3 rounded-lg border border-[var(--border)] bg-[rgba(var(--panel-rgb),0.88)] p-3 text-[var(--text-primary)] shadow-xl backdrop-blur-xl sm:flex"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(var(--success-rgb),0.12)] text-[var(--success)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black">Cleared customs</p>
              <p className="text-[11px] text-[var(--text-secondary)]">Transit milestone</p>
            </div>
          </motion.div>

          <motion.div
            className="relative z-10 aspect-[9/18.5] overflow-hidden rounded-lg border-[8px] border-[var(--text-primary)] bg-[var(--panel)] shadow-[0_28px_80px_rgba(var(--text-primary-rgb),0.18)]"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.72 }}
          >
            <div className="absolute left-1/2 top-0 z-20 h-6 w-28 -translate-x-1/2 rounded-b-lg bg-[var(--text-primary)]" />

            <div className="flex h-full flex-col bg-[var(--background)] pt-12 text-[var(--text-primary)]">
              <div className="px-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[var(--text-secondary)]">Welcome back</p>
                    <p className="text-lg font-black">Ahmad Logistics</p>
                  </div>
                  <Smartphone className="h-5 w-5 text-[var(--accent-gold)]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 px-5">
                <div className="rounded-lg bg-[var(--accent-gold)] p-3 text-[var(--text-primary)]">
                  <p className="text-[11px] font-bold opacity-75">Active</p>
                  <p className="mt-1 text-2xl font-black">12</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                  <p className="text-[11px] font-bold text-[var(--text-secondary)]">Balance</p>
                  <p className="mt-1 text-lg font-black">$4.2K</p>
                </div>
              </div>

              <div className="mt-4 flex-1 px-5 pb-5">
                <div className="h-full rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black">Live route</p>
                    <span className="rounded-md bg-[rgba(var(--success-rgb),0.12)] px-2 py-1 text-[11px] font-black text-[var(--success)]">In transit</span>
                  </div>

                  <div className="relative mt-5 h-[210px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)]">
                    <div className="absolute inset-0 bg-[url('/world-map.svg')] bg-contain bg-center bg-no-repeat opacity-[0.14]" />
                    <div className="absolute left-5 right-5 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--border)]">
                      <motion.div
                        className="h-full rounded-full bg-[var(--accent-gold)]"
                        animate={{ width: ['15%', '68%', '68%'] }}
                        transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
                      />
                    </div>
                    <div className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-4 border-[var(--panel)] bg-[var(--text-secondary)]" />
                    <div className="absolute left-[62%] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-4 border-[var(--panel)] bg-[var(--accent-gold)] shadow-lg" />
                    <div className="absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-4 border-[var(--panel)] bg-[var(--border)]" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
