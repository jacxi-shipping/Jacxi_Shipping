'use client';

import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { Anchor, ArrowRight, Car, Container, FileCheck, Search, ShieldCheck, Ship, Truck } from 'lucide-react';

const services = [
  {
    title: 'Auction and dealer pickup',
    description: 'Pickup planning for auction yards, dealers, homes, and fleet locations across the USA and Canada.',
    icon: Car,
    badge: 'USA + Canada',
    lane: 'Origin intake',
  },
  {
    title: 'Container loading and export',
    description: 'Vehicle inspection, loading, export paperwork support, and ocean freight coordination before departure.',
    icon: Container,
    badge: 'Port loading',
    lane: 'Export stage',
  },
  {
    title: 'Mersin route coordination',
    description: 'One available shipping option moves through Mersin, Turkey with port arrival and transfer visibility.',
    icon: Anchor,
    badge: 'Mersin, Turkey',
    lane: 'Route option A',
  },
  {
    title: 'UAE route coordination',
    description: 'The alternate shipping option moves through UAE with route control, timing support, and onward shipment planning.',
    icon: Ship,
    badge: 'UAE route',
    lane: 'Route option B',
  },
  {
    title: 'Afghanistan customs support',
    description: 'Import document guidance, duties coordination, and customs milestone communication after arrival.',
    icon: FileCheck,
    badge: 'Import docs',
    lane: 'Customs stage',
  },
  {
    title: 'Province delivery network',
    description: 'Final-mile delivery support to Herat, Kabul, Kandahar, Mazar-i-Sharif, Jalalabad, and all 34 provinces.',
    icon: Truck,
    badge: '34 provinces',
    lane: 'Final delivery',
  },
];

const proofItems = [
  { icon: ShieldCheck, label: 'Photo-backed handoffs' },
  { icon: Search, label: 'Lane visibility' },
  { icon: FileCheck, label: 'Title and customs review' },
];

const routeStrip = [
  'USA / Canada',
  'Mersin or UAE',
  'Afghanistan',
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
            <p className="text-sm font-extrabold uppercase tracking-widest text-[var(--accent-gold)]">Services</p>
            <h2 className="mt-4 max-w-xl text-[2rem] font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)] sm:text-[3rem] lg:text-[3.5rem]">
              Vehicle shipping services built around this <br/>
              <span className="text-[var(--text-secondary)]">exact corridor.</span>
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)] sm:text-xl">
              <span className="font-semibold text-[var(--text-primary)]">JACXI</span> connects <span className="font-semibold text-[var(--text-primary)]">USA and Canada</span> pickups with the right route option, either <span className="font-semibold text-[var(--text-primary)]">Mersin</span> or <span className="font-semibold text-[var(--text-primary)]">UAE</span>, then supports <span className="font-semibold text-[var(--text-primary)]">Afghanistan</span> customs and final province delivery.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {routeStrip.map((stop, index) => (
                <div key={stop} className="flex items-center gap-3">
                  <span className="rounded-xl border border-[rgba(var(--border-rgb),0.5)] bg-white/50 px-4 py-2.5 text-sm font-bold shadow-sm backdrop-blur-sm transition-all hover:bg-white text-[var(--text-primary)]">
                    {stop}
                  </span>
                  {index < routeStrip.length - 1 ? <ArrowRight className="h-5 w-5 text-[var(--accent-gold)] opacity-70" /> : null}
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:max-w-lg">
              {proofItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="group flex items-start gap-4 rounded-xl border border-[rgba(var(--border-rgb),0.5)] bg-white/50 p-4 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:border-[var(--accent-gold)] hover:shadow-md">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(var(--accent-gold-rgb),0.1)] group-hover:bg-[var(--accent-gold)] transition-colors duration-300">
                      <Icon className="h-4 w-4 text-[var(--accent-gold)] group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-[var(--text-primary)] mt-1">{item.label}</span>
                    </div>
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
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 mt-12 lg:mt-0 lg:ml-8"
          >
            {services.slice(0,4).map((service) => {
              const Icon = service.icon;

              return (
                <motion.article
                  key={service.title}
                  variants={itemVariants}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[rgba(var(--border-rgb),0.6)] bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--accent-gold)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--accent-gold)] to-yellow-200 transform origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(var(--accent-gold-rgb),0.08)] group-hover:bg-[var(--accent-gold)] transition-colors duration-300 shadow-inner">
                        <Icon className="h-6 w-6 text-[var(--accent-gold)] group-hover:text-white transition-colors duration-300" />
                      </div>
                      <span className="inline-flex items-center rounded-full border border-[rgba(var(--accent-gold-rgb),0.3)] bg-[rgba(var(--accent-gold-rgb),0.05)] px-3 py-1 text-xs font-bold text-[var(--accent-gold)] shadow-sm">
                        {service.badge}
                      </span>
                    </div>

                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-secondary)] opacity-80 mb-2">{service.lane}</p>
                    <h3 className="text-xl font-extrabold leading-tight text-[var(--text-primary)] mb-3">{service.title}</h3>
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)] mb-6">{service.description}</p>
                  </div>
                  
                  <Link href="/services" className="relative z-10 mt-auto inline-flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-gold)]">
                    Explore service
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </Link>

                  {/* Elegant decorative background blur */}
                  <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-[rgba(var(--accent-gold-rgb),0.05)] blur-[30px] transition-all duration-500 group-hover:bg-[rgba(var(--accent-gold-rgb),0.1)] group-hover:scale-150" />
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
