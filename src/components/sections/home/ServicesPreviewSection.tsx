'use client';

import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { ArrowRight, Car, Container, FileCheck, Search, ShieldCheck, Truck } from 'lucide-react';

const services = [
  {
    title: 'Vehicle shipping',
    description: 'Careful handling for sedans, SUVs, luxury vehicles, salvage purchases, and fleet moves from North America.',
    icon: Car,
    badge: 'Cars and SUVs',
  },
  {
    title: 'Container freight',
    description: 'Containerized movement through trusted ocean lanes with loading, inspection, and port coordination.',
    icon: Container,
    badge: 'Ocean route',
  },
  {
    title: 'Customs support',
    description: 'Documentation guidance for export, transit, import, duties, and delivery paperwork across the corridor.',
    icon: FileCheck,
    badge: 'Handled end to end',
  },
  {
    title: 'Afghanistan delivery',
    description: 'Final-mile delivery support to Herat, Kabul, Kandahar, Mazar-i-Sharif, Jalalabad, and all provinces.',
    icon: Truck,
    badge: 'Door to door',
  },
];

const proofItems = [
  { icon: ShieldCheck, label: 'Insured handling' },
  { icon: Search, label: 'Shipment visibility' },
  { icon: FileCheck, label: 'Document control' },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] } },
};

export default function ServicesPreviewSection() {
  return (
    <section id="services" className="relative overflow-hidden bg-[var(--panel)] py-20 sm:py-24">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(var(--text-primary-rgb),0.12),transparent)]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm font-bold uppercase text-[var(--accent-gold)]">Services</p>
            <h2 className="mt-4 max-w-xl text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
              Premium logistics for vehicles moving across borders.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
              JACXI combines vehicle pickup, container freight, customs coordination, and Afghanistan delivery into one guided shipping experience.
            </p>

            <div className="mt-7 grid gap-2 sm:grid-cols-3 lg:max-w-lg">
              {proofItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-3">
                    <Icon className="h-4 w-4 text-[var(--accent-gold)]" />
                    <span className="text-sm font-bold text-[var(--text-primary)]">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid gap-3 sm:grid-cols-2"
          >
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <motion.article
                  key={service.title}
                  variants={itemVariants}
                  className="group relative min-h-[238px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-[rgba(var(--accent-gold-rgb),0.55)] hover:shadow-[0_18px_46px_rgba(var(--text-primary-rgb),0.10)]"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-[var(--accent-gold)] opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-md border border-[rgba(var(--accent-gold-rgb),0.28)] bg-[rgba(var(--accent-gold-rgb),0.08)] px-3 py-1 text-xs font-bold text-[var(--text-primary)]">
                      {service.badge}
                    </span>
                  </div>

                  <h3 className="mt-6 text-2xl font-black text-[var(--text-primary)]">{service.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{service.description}</p>

                  <Link href="/services" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-gold)]">
                    Explore service
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
