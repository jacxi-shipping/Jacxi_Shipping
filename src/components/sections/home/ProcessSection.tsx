'use client';

import { motion, Variants } from 'framer-motion';
import { Anchor, ArrowRight, CheckCircle2, FileCheck, FileText, PackageCheck, Ship } from 'lucide-react';

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
    location: 'Route selection',
    title: 'Mersin route or UAE route',
    description: 'The shipment is planned through one of two available routes, either Mersin, Turkey or UAE, based on lane timing and cost.',
    checkpoint: 'One selected route',
    icon: Anchor,
  },
  {
    number: '05',
    location: 'Afghanistan',
    title: 'Customs and province delivery',
    description: 'Final import support and delivery coordination to Herat, Kabul, Kandahar, Mazar-i-Sharif, and all provinces.',
    checkpoint: 'Customs + final mile',
    icon: FileCheck,
  },
];

const corridor = ['USA / Canada', 'Export port', 'Mersin or UAE', 'Afghanistan'];

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
            <p className="text-sm font-extrabold uppercase tracking-widest text-[var(--accent-gold)]">Shipping process</p>
            <h2 className="mt-4 max-w-2xl text-[2rem] font-extrabold leading-[1.1] tracking-tight text-[var(--text-primary)] sm:text-[3rem] lg:text-[3.5rem]">
              A route-selected timeline from pickup to <br className="hidden lg:block"/>
              <span className="text-[var(--text-secondary)]">Afghan customs.</span>
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)] sm:text-xl lg:justify-self-end">
            Every milestone maps to the real workflow: pickup anywhere in the <span className="font-semibold text-[var(--text-primary)]">USA or Canada</span>, export loading, one selected route through <span className="font-semibold text-[var(--text-primary)]">Mersin</span> or <span className="font-semibold text-[var(--text-primary)]">UAE</span>, then <span className="font-semibold text-[var(--text-primary)]">Afghanistan</span> customs and delivery.
          </p>
        </motion.div>

        <div className="mt-12 rounded-2xl border border-[rgba(var(--border-rgb),0.5)] bg-white/50 p-4 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {corridor.map((stop, index) => (
              <div key={stop} className="relative rounded-xl border border-[rgba(var(--border-rgb),0.6)] bg-white px-4 py-4 text-center shadow-sm">
                {index < corridor.length - 1 ? (
                  <ArrowRight className="absolute right-[-1.15rem] top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 text-[var(--accent-gold)] opacity-70 lg:block" />
                ) : null}
                <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--text-primary)]">{stop}</p>
              </div>
            ))}
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.article
                key={step.number}
                variants={itemVariants}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[rgba(var(--border-rgb),0.6)] bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--accent-gold)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--accent-gold)] to-yellow-200 transform origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100" />
                
                {index < steps.length - 1 && (index + 1) % 3 !== 0 ? (
                  <div className="absolute right-[-1.5rem] top-1/2 z-10 hidden text-[var(--border)] xl:block">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                ) : null}
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <span className="text-[3.5rem] font-extrabold text-[rgba(var(--text-primary-rgb),0.06)] leading-none transition-colors duration-300 group-hover:text-[rgba(var(--accent-gold-rgb),0.4)]">{step.number}</span>
                      <p className="mt-2 text-[10px] font-extrabold uppercase tracking-widest text-[var(--accent-gold)]">{step.location}</p>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(var(--accent-gold-rgb),0.08)] group-hover:bg-[var(--accent-gold)] transition-colors duration-300 shadow-inner">
                      <Icon className="h-6 w-6 text-[var(--accent-gold)] group-hover:text-white transition-colors duration-300" />
                    </div>
                  </div>
                  <h3 className="text-xl font-extrabold leading-tight text-[var(--text-primary)] mb-3">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)] mb-6">{step.description}</p>
                </div>
                
                <div className="relative z-10 mt-auto flex items-center gap-2.5 rounded-xl bg-[rgba(var(--accent-gold-rgb),0.06)] px-4 py-3 text-sm font-bold text-[var(--accent-gold)] shadow-sm border border-[rgba(var(--accent-gold-rgb),0.2)]">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  {step.checkpoint}
                </div>
                
                {/* Elegant decorative background blur */}
                <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-[rgba(var(--accent-gold-rgb),0.04)] blur-[30px] transition-all duration-500 group-hover:bg-[rgba(var(--accent-gold-rgb),0.08)] group-hover:scale-150" />
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
