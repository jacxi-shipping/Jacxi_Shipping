'use client';

import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { ArrowRight, Container, Plane, ShieldCheck, Truck } from 'lucide-react';

const services = [
  {
    title: 'Ocean Freight',
    description: 'Cost-effective container shipping from US ports to Dubai, then ground transport to all Afghan provinces. Ideal for bulk and standard vehicle shipments.',
    icon: Container,
    badge: 'Most Popular',
    bentoClass: 'md:col-span-2 md:row-span-2 bg-gradient-to-br from-white to-[rgba(var(--accent-gold-rgb),0.05)]',
  },
  {
    title: 'Air Cargo',
    description: 'Expedited shipping for time-critical deliveries that need to arrive yesterday.',
    icon: Plane,
    badge: 'Fastest',
    bentoClass: 'md:col-span-1 md:row-span-1 border-white/40',
  },
  {
    title: 'Inland Transport',
    description: 'Secure ground transportation network connecting our hubs to every province.',
    icon: Truck,
    badge: 'Full Coverage',
    bentoClass: 'md:col-span-1 md:row-span-1 border-white/40',
  },
  {
    title: 'Customs Clearance',
    description: 'Complete customs brokerage and documentation handling. We manage all import/export paperwork, duties, and regulatory requirements end-to-end.',
    icon: ShieldCheck,
    badge: 'Included',
    bentoClass: 'md:col-span-2 md:row-span-1 border-white/40',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function ServicesPreviewSection() {
  return (
    <section id="services" className="relative py-32 px-4 sm:px-6 lg:px-8 bg-[var(--background)] overflow-hidden">
      {/* Decorative gradient blob for glassmorphism backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--accent-gold)]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center mb-20"
        >
          <span className="mb-4 inline-block text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">
            What We Do
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-6xl mb-6">
            Comprehensive <br />
            <span className="text-[var(--accent-gold)]">Logistics Solutions</span>
          </h2>
          <p className="text-lg leading-relaxed text-[var(--text-secondary)] opacity-80 max-w-2xl mx-auto">
            Experience our intelligent platform adapting to your logistics needs in real-time. Modular, scalable, and built for modern shipping demands.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[250px]"
        >
          {services.map((service, index) => {
            const Icon = service.icon;

            return (
              <motion.article 
                key={service.title} 
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -5 }}
                className={`group flex flex-col rounded-[2.5rem] border border-[var(--border)] bg-white/80 backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] p-8 transition-all ${service.bentoClass}`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3">
                    <Icon className="h-7 w-7 text-[var(--accent-gold)]" strokeWidth={1.5} />
                  </div>
                  <div className="rounded-full bg-[rgba(var(--accent-gold-rgb),0.1)] px-4 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[var(--accent-gold)]">
                    {service.badge}
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-3">{service.title}</h3>
                <p className="leading-relaxed text-[var(--text-secondary)] opacity-90 line-clamp-3">{service.description}</p>
                
                <div className="mt-auto pt-6">
                  <Link href="/services" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition-colors">
                    Learn More
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}