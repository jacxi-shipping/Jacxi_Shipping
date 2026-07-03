'use client';

import { motion, Variants } from 'framer-motion';
import { ArrowRight, CheckCircle2, FileText, PackageCheck, Ship, Truck } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Quote and route review',
    description: 'Share vehicle details, pickup location, destination province, and timing. We confirm the lane, paperwork needs, and estimated cost.',
    icon: FileText,
  },
  {
    number: '02',
    title: 'Pickup and inspection',
    description: 'Your vehicle is collected, photographed, inspected, secured, and prepared for export or container loading.',
    icon: PackageCheck,
  },
  {
    number: '03',
    title: 'Port and transit control',
    description: 'We coordinate ocean freight through Mersin and UAE route handoffs with visibility at each operational milestone.',
    icon: Ship,
  },
  {
    number: '04',
    title: 'Customs and delivery',
    description: 'Our team supports final customs clearance and delivery to the chosen Afghan city or province.',
    icon: Truck,
  },
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
              A calm, visible workflow from pickup to keys-in-hand.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg lg:justify-self-end">
            Each stage is designed to reduce uncertainty: clear milestones, document guidance, route visibility, and human support from quote to final delivery.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-10 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.article
                key={step.number}
                variants={itemVariants}
                className="group relative rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-[rgba(var(--accent-gold-rgb),0.55)] hover:shadow-[0_18px_38px_rgba(var(--text-primary-rgb),0.10)]"
              >
                {index < steps.length - 1 ? (
                  <div className="absolute right-[-1.1rem] top-10 z-10 hidden text-[var(--border)] xl:block">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-black text-[rgba(var(--text-primary-rgb),0.14)] transition-colors group-hover:text-[rgba(var(--accent-gold-rgb),0.55)]">{step.number}</span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="mt-8 text-xl font-black text-[var(--text-primary)]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{step.description}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-[var(--accent-gold)]">
                  <CheckCircle2 className="h-4 w-4" />
                  Managed by JACXI
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
