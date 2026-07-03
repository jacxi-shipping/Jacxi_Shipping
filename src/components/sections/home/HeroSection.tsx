'use client';

import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import {
  ArrowRight,
  CirclePlay,
  FileCheck,
  ShieldCheck,
  Ship,
  Truck,
} from 'lucide-react';
import ShippingCapsuleScene from './ShippingCapsuleScene';

const stats = [
  { label: 'Vehicles delivered', value: '12,000+' },
  { label: 'Years operating', value: '14+' },
  { label: 'Afghan provinces', value: '34' },
  { label: 'Customer rating', value: '4.9/5' },
];

const corridorCards = [
  {
    title: 'Origin intake',
    detail: 'USA and Canada pickups',
    icon: Truck,
  },
  {
    title: 'Route choice',
    detail: 'Mersin or UAE options',
    icon: Ship,
  },
  {
    title: 'Import support',
    detail: 'Afghanistan customs delivery',
    icon: FileCheck,
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-[var(--background)] px-4 pb-10 pt-28 text-[var(--text-primary)] sm:px-6 sm:pb-14 sm:pt-32 lg:min-h-[calc(100svh-1rem)] lg:px-8">
      <div className="absolute inset-0 -z-20 bg-[url('/grid.svg')] bg-[length:38px_38px] opacity-[0.16]" />
      <div className="absolute right-[-18rem] top-20 -z-10 h-[42rem] w-[42rem] rounded-full bg-[rgba(var(--accent-gold-rgb),0.10)] blur-3xl" />
      <div className="absolute bottom-[-14rem] left-[28%] -z-10 h-[30rem] w-[30rem] rounded-full bg-[rgba(var(--text-primary-rgb),0.05)] blur-3xl" />

      <div className="mx-auto grid max-w-7xl gap-10 lg:min-h-[calc(100svh-10rem)] lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-2xl lg:pb-6"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[var(--accent-gold)] shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <span className="text-sm font-black uppercase tracking-[0.34em] text-[var(--text-primary)]">
              Safe. Fast. Reliable.
            </span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="mt-8 max-w-3xl text-5xl font-black leading-[0.98] text-[var(--text-primary)] sm:text-6xl lg:text-[5.45rem]">
            We ship{' '}
            <span className="block text-[var(--accent-gold)]">your car</span>
            {' '}
            <span className="block text-[0.52em] leading-[1.12] sm:text-[0.56em]">to Afghanistan</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="mt-6 max-w-xl text-lg leading-8 text-[var(--text-secondary)] sm:text-xl">
            Vehicle shipping from anywhere in <strong className="text-[var(--text-primary)]">USA and Canada</strong> to{' '}
            <strong className="text-[var(--accent-gold)]">Afghanistan</strong> using one of two routing options:
            through <strong className="text-[var(--text-primary)]">Mersin</strong> or through <strong className="text-[var(--text-primary)]">UAE</strong>.
          </motion.p>

          <motion.div variants={itemVariants} className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/#quote"
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-lg bg-[var(--accent-gold)] px-7 text-base font-black text-white shadow-[0_18px_42px_rgba(var(--accent-gold-rgb),0.22)] transition-all hover:-translate-y-0.5 hover:brightness-105"
            >
              Get a free quote
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(var(--panel-rgb),0.22)]">
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              href="/#process"
              className="inline-flex h-14 items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-[rgba(var(--panel-rgb),0.82)] px-6 text-sm font-black text-[var(--text-primary)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[var(--accent-gold)]"
            >
              <CirclePlay className="h-5 w-5 text-[var(--accent-gold)]" />
              How it works
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-5 hidden gap-2 sm:grid sm:grid-cols-3">
            {corridorCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="rounded-lg border border-[var(--border)] bg-[rgba(var(--panel-rgb),0.76)] p-3 shadow-sm backdrop-blur-xl">
                  <Icon className="h-4 w-4 text-[var(--accent-gold)]" />
                  <p className="mt-2 text-xs font-black uppercase text-[var(--text-primary)]">{card.title}</p>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">{card.detail}</p>
                </div>
              );
            })}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.76, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none relative -mt-24 min-h-[420px] lg:pointer-events-auto lg:mt-0 lg:min-h-[680px]"
        >
          <div className="absolute left-[-8%] top-3 z-20 hidden h-40 w-[92%] lg:block">
            <svg viewBox="0 0 1000 220" className="h-full w-full overflow-visible" aria-hidden="true">
              <path
                d="M 95 86 C 250 34 360 86 500 86 S 760 130 940 174"
                fill="none"
                stroke="rgba(var(--text-primary-rgb),0.62)"
                strokeDasharray="6 8"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <path
                d="M 95 124 C 290 156 520 138 685 154 S 840 194 940 174"
                fill="none"
                stroke="rgba(var(--text-primary-rgb),0.40)"
                strokeDasharray="6 8"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <motion.path
                d="M 95 86 C 250 34 360 86 500 86 S 760 130 940 174"
                fill="none"
                stroke="var(--accent-gold)"
                strokeDasharray="80 680"
                strokeLinecap="round"
                strokeWidth="3"
                animate={{ strokeDashoffset: [0, -760] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              />
              <motion.path
                d="M 95 124 C 290 156 520 138 685 154 S 840 194 940 174"
                fill="none"
                stroke="var(--accent-gold)"
                strokeDasharray="80 620"
                strokeLinecap="round"
                strokeWidth="3"
                animate={{ strokeDashoffset: [0, -700] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              />
            </svg>
          </div>

          <div className="absolute inset-x-[-1.25rem] bottom-[-1rem] top-10 z-10 overflow-visible lg:left-[2rem] lg:right-[-3rem] lg:top-16">
            <div className="absolute inset-x-[10%] bottom-[8%] h-24 rounded-full bg-[rgba(var(--text-primary-rgb),0.10)] blur-2xl" />
            <div className="absolute right-[2%] top-[5%] h-[78%] w-[78%] rounded-full bg-[radial-gradient(circle,rgba(var(--accent-gold-rgb),0.16),transparent_62%)]" />
            <div className="absolute left-[8%] top-[18%] h-[62%] w-[74%] rounded-full bg-[radial-gradient(circle,rgba(var(--panel-rgb),0.92),rgba(var(--panel-rgb),0)_66%)]" />
            <ShippingCapsuleScene className="absolute inset-0" />
          </div>

          <div className="absolute bottom-0 left-0 z-30 hidden rounded-lg border border-[var(--border)] bg-[rgba(var(--panel-rgb),0.88)] p-4 shadow-[0_16px_42px_rgba(var(--text-primary-rgb),0.12)] backdrop-blur-xl lg:block">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
                <Ship className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black text-[var(--text-primary)]">USA / Canada to Afghanistan</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Choose Mersin route or UAE route</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.58, delay: 0.46 }}
        className="mx-auto mt-8 grid max-w-7xl grid-cols-2 gap-2 sm:grid-cols-4 lg:mt-0"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-[var(--border)] bg-[rgba(var(--panel-rgb),0.82)] px-4 py-4 backdrop-blur-xl">
            <p className="text-2xl font-black text-[var(--text-primary)] sm:text-3xl">{stat.value}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">{stat.label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
