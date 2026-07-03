'use client';

import { motion, Variants } from 'framer-motion';
import { Building2, CheckCircle2, MapPin, Truck } from 'lucide-react';

const provinces = [
  {
    city: 'Herat',
    province: 'Herat Province',
    note: 'Primary hub and fastest handoff point',
    label: 'Hub',
    featured: true,
  },
  {
    city: 'Kabul',
    province: 'Kabul Province',
    note: 'Regular delivery coordination',
  },
  {
    city: 'Kandahar',
    province: 'Kandahar Province',
    note: 'Southern Afghanistan coverage',
  },
  {
    city: 'Mazar-i-Sharif',
    province: 'Balkh Province',
    note: 'Northern Afghanistan lane',
  },
  {
    city: 'Jalalabad',
    province: 'Nangarhar Province',
    note: 'Eastern route support',
  },
  {
    city: 'Kunduz',
    province: 'Kunduz Province',
    note: 'Northeastern delivery access',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function ProvinceCoverageSection() {
  return (
    <section id="coverage" className="relative overflow-hidden bg-[var(--background)] py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="lg:sticky lg:top-28 lg:self-start"
        >
          <p className="text-sm font-bold uppercase text-[var(--accent-gold)]">Afghanistan coverage</p>
          <h2 className="mt-4 max-w-xl text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
            Delivery coverage across all 34 provinces.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
            Our Herat-centered network supports major city delivery, province handoffs, customs follow-up, and customer communication after arrival.
          </p>

          <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-black text-[var(--text-primary)]">Custom destination planning</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  If your province is not listed below, the quote form still supports any Afghanistan destination.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-3 sm:grid-cols-2"
        >
          {provinces.map((item) => (
            <motion.article
              key={item.city}
              variants={itemVariants}
              className={`group rounded-lg border p-5 transition-all hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(var(--text-primary-rgb),0.10)] ${
                item.featured
                  ? 'border-[rgba(var(--accent-gold-rgb),0.55)] bg-[rgba(var(--accent-gold-rgb),0.10)] text-[var(--text-primary)]'
                  : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black">{item.city}</h3>
                    {item.label ? (
                      <span className="rounded-md bg-[var(--accent-gold)] px-2 py-1 text-xs font-black text-[var(--text-primary)]">
                        {item.label}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-bold text-[var(--text-secondary)]">{item.province}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
                  {item.featured ? <Building2 className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                </div>
              </div>
              <p className="mt-8 text-sm leading-6 text-[var(--text-secondary)]">{item.note}</p>
            </motion.article>
          ))}

          <motion.div variants={itemVariants} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm sm:col-span-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-black text-[var(--text-primary)]">Every province supported</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Destination planning is confirmed during your quote review.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-bold text-[var(--text-primary)]">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent-gold)]" />
                34 provinces
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
