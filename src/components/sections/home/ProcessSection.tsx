'use client';

import { motion, Variants } from 'framer-motion';
import { Anchor, ArrowRight, CheckCircle2, FileCheck, FileText, PackageCheck, Ship, Truck } from 'lucide-react';

const steps = [
  {
    number: '01',
    location: 'USA / Canada',
    title: 'Lane quote and vehicle review',
    description: 'Share pickup city, auction or dealer details, vehicle condition, and destination province so the lane is priced correctly.',
    checkpoint: 'Pickup city + province',
    icon: FileText,
  },
  {
    number: '02',
    location: 'Origin pickup',
    title: 'Pickup, photos, and title check',
    description: 'The vehicle is collected, photographed, inspected, and prepared for export based on title and condition requirements.',
    checkpoint: 'VIN, title, condition',
    icon: PackageCheck,
  },
  {
    number: '03',
    location: 'Export port',
    title: 'Container loading and ocean freight',
    description: 'Loading, port handoff, and ocean freight coordination are tracked before the vehicle moves into the transit corridor.',
    checkpoint: 'Container and bill of lading',
    icon: Ship,
  },
  {
    number: '04',
    location: 'Mersin, Turkey',
    title: 'Mersin port handoff',
    description: 'Turkey port arrival, document review, and onward movement are coordinated as a dedicated corridor checkpoint.',
    checkpoint: 'Turkey transit handoff',
    icon: Anchor,
  },
  {
    number: '05',
    location: 'UAE transit',
    title: 'UAE route control',
    description: 'When the shipment moves through UAE, the team controls timing, handoff visibility, and onward routing decisions.',
    checkpoint: 'Transit hub control',
    icon: FileCheck,
  },
  {
    number: '06',
    location: 'Afghanistan',
    title: 'Customs and province delivery',
    description: 'Final import support and delivery coordination to Herat, Kabul, Kandahar, Mazar-i-Sharif, and all provinces.',
    checkpoint: 'Customs + final mile',
    icon: Truck,
  },
];

const corridor = ['USA', 'Canada', 'Export port', 'Mersin', 'UAE', 'Afghanistan'];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] } },
};

export default function ProcessSection() {
  return (
    <section id="process" className="relative overflow-hidden bg-[var(--background)] py-20 text-[var(--text-primary)] sm:py-24">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(var(--accent-gold-rgb),0.55),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="grid gap-6 lg:grid-cols-[0.82fr_1fr] lg:items-end"
        >
          <div>
            <p className="text-sm font-bold uppercase text-[var(--accent-gold)]">Shipping process</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
              A corridor timeline from pickup to Afghan customs.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg lg:justify-self-end">
            Every milestone maps to a real vehicle-shipping handoff: origin pickup, export loading, Mersin, UAE transit, Afghanistan customs, and province delivery.
          </p>
        </motion.div>

        <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {corridor.map((stop, index) => (
              <div key={stop} className="relative rounded-md bg-[var(--background)] px-3 py-3 text-center">
                {index < corridor.length - 1 ? (
                  <ArrowRight className="absolute right-[-0.75rem] top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-[var(--accent-gold)] lg:block" />
                ) : null}
                <p className="text-xs font-black uppercase text-[var(--text-primary)]">{stop}</p>
              </div>
            ))}
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.article
                key={step.number}
                variants={itemVariants}
                className="group relative rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-[rgba(var(--accent-gold-rgb),0.55)] hover:shadow-[0_18px_38px_rgba(var(--text-primary-rgb),0.10)]"
              >
                {index < steps.length - 1 && (index + 1) % 3 !== 0 ? (
                  <div className="absolute right-[-1.1rem] top-10 z-10 hidden text-[var(--border)] xl:block">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-4xl font-black text-[rgba(var(--text-primary-rgb),0.14)] transition-colors group-hover:text-[rgba(var(--accent-gold-rgb),0.55)]">{step.number}</span>
                    <p className="mt-1 text-xs font-black uppercase text-[var(--accent-gold)]">{step.location}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-black text-[var(--text-primary)]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{step.description}</p>
                <div className="mt-6 flex items-center gap-2 rounded-md bg-[rgba(var(--accent-gold-rgb),0.08)] px-3 py-2 text-sm font-bold text-[var(--text-primary)]">
                  <CheckCircle2 className="h-4 w-4" />
                  {step.checkpoint}
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
