'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { ArrowRight, CheckCircle2, Container, MapPin, ShieldCheck, Ship, Truck } from 'lucide-react';

const stats = [
  { label: 'Vehicles delivered', value: '12,000+' },
  { label: 'Years operating', value: '14+' },
  { label: 'Afghan provinces', value: '34' },
  { label: 'Customer rating', value: '4.9/5' },
];

const trustPoints = [
  { label: 'Insured vehicle handling', icon: ShieldCheck },
  { label: 'Customs documentation', icon: CheckCircle2 },
  { label: 'Port-to-door coordination', icon: Truck },
];

const routePoints = [
  { label: 'USA / Canada', detail: 'Pickup and port loading' },
  { label: 'Mersin', detail: 'Turkey port handoff' },
  { label: 'UAE', detail: 'Transit coordination' },
  { label: 'Afghanistan', detail: 'Customs and delivery' },
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
    <section className="relative isolate overflow-hidden bg-[var(--background)] px-4 pb-10 pt-28 text-[var(--text-primary)] sm:px-6 sm:pb-12 sm:pt-32 lg:px-8">
      <Image
        src="/hero-bentley.png"
        alt="Premium vehicle prepared for international shipping"
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 -z-30 object-cover object-[68%_50%] opacity-[0.26]"
      />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,var(--background)_0%,rgba(var(--background-rgb),0.95)_43%,rgba(var(--background-rgb),0.72)_70%,var(--background)_100%)]" />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,rgba(var(--background-rgb),0.88)_0%,rgba(var(--background-rgb),0.62)_56%,var(--background)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[url('/grid.svg')] bg-[length:38px_38px] opacity-[0.18]" />

      <div className="mx-auto grid max-w-7xl gap-8 lg:min-h-[calc(82svh-8rem)] lg:grid-cols-[minmax(0,0.98fr)_minmax(360px,0.72fr)] lg:items-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl self-center lg:pb-10"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[rgba(var(--panel-rgb),0.78)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-[var(--accent-gold)] shadow-[0_0_16px_rgba(var(--accent-gold-rgb),0.45)]" />
            USA and Canada to Afghanistan vehicle logistics
          </motion.div>

          <motion.h1 variants={itemVariants} className="mt-7 max-w-4xl text-4xl font-black leading-[1.08] text-[var(--text-primary)] sm:text-6xl sm:leading-[1.02] lg:text-7xl">
            Premium vehicle shipping to Afghanistan
          </motion.h1>

          <motion.p variants={itemVariants} className="mt-6 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg sm:leading-8">
            JACXI Shipping moves cars from the USA and Canada through Mersin, Turkey and UAE corridors, then into Afghanistan with port coordination, customs support, tracking, and door-to-door delivery.
          </motion.p>

          <motion.div variants={itemVariants} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#quote"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--accent-gold)] px-6 py-4 text-sm font-black text-[var(--text-primary)] shadow-[0_18px_42px_rgba(var(--accent-gold-rgb),0.20)] transition-all hover:-translate-y-0.5 hover:brightness-105"
            >
              Get a free quote
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/tracking"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[rgba(var(--panel-rgb),0.82)] px-6 py-4 text-sm font-bold text-[var(--text-primary)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[var(--accent-gold)]"
            >
              Track shipment
              <MapPin className="h-4 w-4 text-[var(--accent-gold)]" />
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-7 grid gap-2 sm:grid-cols-3">
            {trustPoints.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[rgba(var(--panel-rgb),0.76)] px-3 py-3 text-sm font-semibold text-[var(--text-secondary)] backdrop-blur-md">
                  <Icon className="h-4 w-4 shrink-0 text-[var(--accent-gold)]" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.66, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:block"
        >
          <div className="rounded-lg border border-[var(--border)] bg-[rgba(var(--panel-rgb),0.78)] p-4 shadow-[0_28px_80px_rgba(var(--text-primary-rgb),0.10)] backdrop-blur-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">Active corridor</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">Multi-port routing with live handoff stages</p>
              </div>
              <Ship className="h-5 w-5 text-[var(--accent-gold)]" />
            </div>

            <div className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[rgba(var(--background-rgb),0.74)] p-4">
              <div className="absolute inset-0 bg-[url('/world-map.svg')] bg-contain bg-center bg-no-repeat opacity-[0.08]" />
              <div className="relative space-y-3">
                {routePoints.map((point, index) => (
                  <div key={point.label} className="grid grid-cols-[1.6rem_1fr] gap-3">
                    <div className="relative flex justify-center">
                      <span className="mt-1 h-3 w-3 rounded-full border border-[var(--accent-gold)] bg-[var(--panel)] shadow-[0_0_16px_rgba(var(--accent-gold-rgb),0.35)]" />
                      {index < routePoints.length - 1 ? <span className="absolute top-5 h-[calc(100%+0.5rem)] w-px bg-[linear-gradient(180deg,var(--accent-gold),rgba(var(--border-rgb),0.75))]" /> : null}
                    </div>
                    <div className="rounded-md border border-[var(--border)] bg-[rgba(var(--panel-rgb),0.72)] px-3 py-2">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{point.label}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{point.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { icon: Container, label: 'Containerized' },
                { icon: Ship, label: 'Ocean freight' },
                { icon: Truck, label: 'Final delivery' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-md border border-[var(--border)] bg-[rgba(var(--panel-rgb),0.70)] p-3 text-center">
                    <Icon className="mx-auto h-4 w-4 text-[var(--accent-gold)]" />
                    <p className="mt-2 text-[11px] font-bold text-[var(--text-secondary)]">{item.label}</p>
                  </div>
                );
              })}
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
          <div key={stat.label} className="rounded-lg border border-[var(--border)] bg-[rgba(var(--panel-rgb),0.76)] px-4 py-4 backdrop-blur-xl">
            <p className="text-2xl font-black text-[var(--text-primary)] sm:text-3xl">{stat.value}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">{stat.label}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
