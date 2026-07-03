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
  const videoY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const videoOpacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 0.85, 0.6]);
  const highlightY = useTransform(scrollYProgress, [0, 1], ['0%', '-25%']);

  return (
    <section ref={sectionRef} className="relative isolate box-border min-h-[100svh] overflow-hidden bg-[var(--background)] px-4 pb-12 pt-28 text-[var(--text-primary)] sm:px-6 lg:px-8 xl:min-h-[90svh] flex flex-col justify-center">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 -z-20 bg-[url('/grid.svg')] bg-[length:40px_40px] opacity-[0.12]" style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)' }} />
      <div className="absolute right-[-15%] top-10 -z-10 h-[50vw] w-[50vw] max-w-[800px] max-h-[800px] rounded-full bg-[rgba(var(--accent-gold-rgb),0.12)] blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] -z-10 h-[40vw] w-[40vw] max-w-[600px] max-h-[600px] rounded-full bg-[rgba(8,112,184,0.06)] blur-[100px]" />

      <div className="mx-auto grid h-full w-full max-w-7xl gap-8 lg:grid-cols-[1fr_1fr] xl:grid-cols-[1.1fr_0.9fr] lg:items-center relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col justify-center pt-8 sm:pt-12 lg:pt-0"
        >
          {/* Trust Badge */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-white/60 px-2 py-1.5 pr-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] backdrop-blur-md self-start">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-gold)] text-white shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-90">
              #1 North America to Afghanistan
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={itemVariants} className="mt-8 max-w-3xl text-[2.5rem] font-bold leading-[1.05] tracking-tight text-[var(--text-primary)] sm:text-[3.5rem] lg:text-[4rem] xl:text-[4.75rem]">
            Ship your vehicle <br className="hidden sm:block"/>
            <span className="relative inline-block mt-2">
              <span className="relative z-10 text-[var(--accent-gold)] px-2">with confidence</span>
              <span className="absolute bottom-2 left-0 right-0 h-4 bg-[rgba(var(--accent-gold-rgb),0.2)] -z-10 transform -rotate-1"></span>
            </span>
            <span className="block mt-2 text-[0.45em] font-medium leading-[1.3] text-[var(--text-secondary)]">to Afghanistan</span>
          </motion.h1>

          {/* Value Prop text */}
          <motion.p variants={itemVariants} className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--text-secondary)] sm:text-xl md:leading-relaxed">
            Premium vehicle logistics from <span className="font-semibold text-[var(--text-primary)]">USA and Canada</span> to{' '}
            <span className="font-semibold text-[var(--text-primary)]">Afghanistan</span>. Expert handling through guaranteed <span className="font-semibold text-[var(--text-primary)]">Mersin</span> or <span className="font-semibold text-[var(--text-primary)]">UAE</span> routing.
          </motion.p>

          {/* Call to Actions */}
          <motion.div variants={itemVariants} className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/#quote"
              className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-xl bg-[var(--text-primary)] px-8 text-base font-semibold text-white shadow-[0_8px_30px_rgba(var(--text-primary-rgb),0.2)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(var(--text-primary-rgb),0.3)] hover:-translate-y-0.5"
            >
              <span className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[150%] skew-x-[-20deg] group-hover:animate-[shimmer_1.5s_ease-out_infinite]" />
              <span className="relative z-10">Get a free quote</span>
              <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1" />
            </Link>
            <Link
              href="/#process"
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-white/50 px-8 text-base font-medium text-[var(--text-primary)] backdrop-blur-sm transition-all hover:bg-white hover:border-[var(--accent-gold)] hover:shadow-sm"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(var(--accent-gold-rgb),0.1)] text-[var(--accent-gold)] group-hover:bg-[var(--accent-gold)] group-hover:text-white transition-colors duration-300">
                <CirclePlay className="h-4 w-4" />
              </div>
              How it works
            </Link>
          </motion.div>

          {/* Corridor Features */}
          <motion.div variants={itemVariants} className="mt-12 hidden md:flex items-center gap-6 pt-8 border-t border-[rgba(var(--border-rgb),0.5)]">
            {corridorCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="flex items-start gap-4 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-[var(--border)] group-hover:border-[var(--accent-gold)] transition-colors">
                    <Icon className="h-4 w-4 text-[var(--accent-gold)]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{card.title}</h3>
                    <p className="mt-1 text-xs text-[var(--text-secondary)] leading-snug">{card.detail}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </motion.div>

        {/* Cinematic Video Showcase */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-8 h-[40vh] min-h-[320px] w-full sm:h-[50vh] lg:mt-0 lg:h-[75vh] max-h-[800px] flex items-center justify-center lg:justify-end"
        >
          <motion.div
            style={{ y: videoY, scale: videoScale, opacity: videoOpacity }}
            className="group relative h-full w-full max-w-[540px] overflow-hidden rounded-3xl border border-[rgba(255,255,255,0.8)] bg-white/40 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] will-change-transform"
          >
            {/* Elegant inner shadow/border overlay */}
            <div className="absolute inset-0 z-20 rounded-3xl ring-1 ring-inset ring-black/5 pointer-events-none" />
            
            <video
              className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              src="/Pull-back_to_wide_shot_202607030933.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Vehicle shipping hero preview"
            />
            
            {/* Sophisticated Gradients */}
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
            <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent_50%)] mix-blend-overlay" />

            {/* Glowing Accent Line */}
            <motion.div
              style={{ y: highlightY }}
              className="pointer-events-none absolute left-0 top-[20%] z-30 h-px w-full bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-60"
            />

            {/* Floating Info Card */}
            <div className="absolute bottom-6 left-6 right-6 z-30 transform transition-transform duration-500 group-hover:-translate-y-2">
              <div className="rounded-2xl border border-white/20 bg-black/40 p-4 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-gold)] text-white shadow-lg">
                      <Ship className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white tracking-wide">Direct Routes</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-white/80">
                        <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                        Live tracking active
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

    </section>
  );
}
