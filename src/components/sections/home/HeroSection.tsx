'use client';

import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import AnimatedWorldMap from '@/components/ui/AnimatedWorldMap';

const stats = [
  { label: 'Active Countries', value: '45+' },
  { label: 'Vehicles Shipped', value: '12,000+' },
  { label: 'On-Time Delivery', value: '99.8%' },
  { label: 'Client Satisfaction', value: '4.9/5' },
];

const trustPoints = [
  { title: 'Licensed Customs Broker', detail: 'Fully accredited' },
  { title: 'Insured & Bonded', detail: 'Full coverage' },
  { title: 'Door-to-Door Service', detail: 'All Afghan provinces' },
  { title: 'Real-Time GPS Tracking', detail: 'Live updates' },
  { title: '14+ Years Experience', detail: 'Industry veteran' },
];

const staggerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[var(--background)] pt-32 pb-24 lg:pt-40">
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center mix-blend-multiply opacity-50 z-0">
        <AnimatedWorldMap />
      </div>

      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[var(--accent-gold)]/20 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-slate-300/40 to-transparent blur-[100px] pointer-events-none" />

      <motion.div 
        variants={staggerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl text-center">
          <motion.div variants={itemVariants} className="inline-block mb-6 px-4 py-1.5 rounded-full border border-[var(--border)] bg-white/50 backdrop-blur-md">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--accent-gold)]">
              Shipping Beyond Boundaries
            </span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="mx-auto text-5xl font-extrabold leading-[1.05] tracking-tight text-[var(--text-primary)] sm:text-6xl lg:text-[7rem]">
            Global Transit, <br className="hidden md:block"/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-gold)] to-yellow-600">Local Precision.</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)] sm:text-xl">
            The most trusted vehicle shipping service adapting to your behavior in real-time. Door-to-door delivery with full customs clearance and white-glove service.
          </motion.p>
          
          <motion.div variants={itemVariants} className="mt-10 flex flex-col justify-center gap-4 sm:flex-row items-center">
            <Link
              href="/#quote"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-[var(--accent-gold)] px-8 py-4 text-base font-semibold text-white transition-all hover:scale-105 active:scale-95 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]"
            >
              <span className="relative z-10">Get a Free Quote</span>
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-yellow-500 to-[var(--accent-gold)] opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
            <Link
              href="/tracking"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-white/60 backdrop-blur-md px-8 py-4 text-base font-semibold text-[var(--text-primary)] transition-all hover:bg-white hover:border-slate-300 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)]"
            >
              Track Shipment
              <ArrowRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-20 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-white/60 backdrop-blur-2xl px-6 py-6 text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.04)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50 z-0"/>
                <p className="relative z-10 text-3xl font-bold tracking-tight text-[var(--text-primary)]">{stat.value}</p>
                <p className="relative z-10 mt-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          <motion.p variants={itemVariants} className="mt-12 text-sm font-medium tracking-[0.15em] text-[var(--text-secondary)] uppercase">
            USA → Mersin, Turkey → Herat, Afghanistan
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
}