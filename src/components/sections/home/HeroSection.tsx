'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, type Variants } from 'framer-motion';
import {
  ArrowRight,
  CirclePlay,
  FileCheck,
  ShieldCheck,
  Ship,
  Truck,
} from 'lucide-react';

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
  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const videoY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const videoOpacity = useTransform(scrollYProgress, [0, 0.82, 1], [1, 0.92, 0.72]);
  const highlightY = useTransform(scrollYProgress, [0, 1], ['0%', '-18%']);

  return (
    <section ref={sectionRef} className="relative isolate overflow-hidden bg-[var(--background)] px-4 pb-10 pt-28 text-[var(--text-primary)] sm:px-6 sm:pb-14 sm:pt-32 lg:min-h-[calc(100svh-1rem)] lg:px-8">
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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="relative -mt-10 min-h-[450px] sm:-mt-20 sm:min-h-[550px] lg:mt-0 lg:min-h-[720px] w-full"
        >
          <motion.div
            style={{ y: videoY, scale: videoScale, opacity: videoOpacity }}
            className="absolute inset-0 z-10 overflow-hidden rounded-[2rem] border border-[rgba(var(--panel-rgb),0.42)] bg-[rgba(var(--panel-rgb),0.34)] shadow-[0_34px_90px_rgba(var(--text-primary-rgb),0.16)] will-change-transform"
          >
            <video
              className="h-full w-full object-cover object-center"
              src="/Pull-back_to_wide_shot_202607030933.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Vehicle shipping hero preview"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(var(--background-rgb),0.28)_0%,rgba(var(--background-rgb),0.02)_42%,rgba(var(--background-rgb),0.18)_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_34%,rgba(255,255,255,0.30),transparent_28%),radial-gradient(circle_at_18%_78%,rgba(var(--accent-gold-rgb),0.16),transparent_34%)] mix-blend-screen" />
          </motion.div>

          <motion.div
            style={{ y: highlightY }}
            className="pointer-events-none absolute left-[8%] top-[16%] z-20 h-px w-[76%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.96),transparent)] shadow-[0_0_26px_rgba(255,255,255,0.70)]"
          />
          <div className="pointer-events-none absolute inset-x-[9%] bottom-[8%] z-0 h-[18%] rounded-full bg-[rgba(var(--text-primary-rgb),0.16)] blur-3xl" />

          <div className="absolute bottom-10 left-0 z-30 hidden rounded-lg border border-[var(--border)] bg-[rgba(var(--panel-rgb),0.88)] p-4 shadow-[0_16px_42px_rgba(var(--text-primary-rgb),0.12)] backdrop-blur-xl lg:block">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
                <Ship className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black text-[var(--text-primary)]">USA / Canada to Afghanistan</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Cinematic shipment preview</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

    </section>
  );
}
