'use client';

import { motion } from 'framer-motion';
import { Smartphone, MapPin, Receipt, Bell, ShieldCheck, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: <MapPin className="h-5 w-5" />,
    title: 'Live Tracking',
    description: 'Monitor your vehicles in real-time as they move from the USA to Afghanistan.'
  },
  {
    icon: <Receipt className="h-5 w-5" />,
    title: 'Finance & Invoices',
    description: 'View custom ledgers, pay invoices, and download receipts directly to your device.'
  },
  {
    icon: <Bell className="h-5 w-5" />,
    title: 'Instant Alerts',
    description: 'Get notified immediately about customs clearance, arrivals, and document uploads.'
  }
];

export default function MobileAppPromoSection() {
  return (
    <section className="relative overflow-hidden bg-[var(--background)] py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-8 items-center">
          
          {/* Text Content */}
          <div className="max-w-xl">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-gold)]">
              Customer Web App
            </h2>
            <p className="mt-4 text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
              Everything you need, right in your pocket.
            </p>
            <p className="mt-6 text-lg leading-8 text-[var(--text-secondary)]">
              No need to download from an app store. Our progressive web app (PWA) gives you full access to your personalized client portal directly from your mobile browser. Track shipments, download documents, and manage finances effortlessly.
            </p>
            
            <dl className="mt-10 max-w-xl space-y-6 text-base leading-7 text-[var(--text-secondary)]">
              {features.map((feature) => (
                <div key={feature.title} className="relative pl-12">
                  <dt className="inline font-semibold text-[var(--text-primary)]">
                    <div className="absolute left-1 top-1 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]">
                      {feature.icon}
                    </div>
                    {feature.title}
                  </dt>{' '}
                  <dd className="inline">{feature.description}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 flex items-center gap-x-6">
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--text-primary)] px-6 py-3.5 text-sm font-semibold text-[var(--background)] shadow-sm hover:bg-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-all"
              >
                Access Portal
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Illustration Content (CSS Mockup + Floating Elements) */}
          <div className="relative flex justify-center lg:justify-end py-10 lg:py-0">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[var(--accent-gold)]/20 blur-[100px] rounded-full pointer-events-none" />

            <div className="relative w-full max-w-[320px]">
              {/* Floating Element 1 - Notification */}
              <motion.div 
                className="absolute -left-12 top-20 z-20 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-xl shadow-slate-200/50 dark:bg-zinc-800 dark:shadow-none border border-slate-100 dark:border-zinc-700"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Cleared Customs</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">Dubai Port</p>
                </div>
              </motion.div>

              {/* Floating Element 2 - Payment */}
              <motion.div 
                className="absolute -right-8 bottom-32 z-20 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-xl shadow-slate-200/50 dark:bg-zinc-800 dark:shadow-none border border-slate-100 dark:border-zinc-700"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Invoice Paid</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">-$1,250.00</p>
                </div>
              </motion.div>

              {/* The Mobile Phone Mockup */}
              <motion.div 
                className="relative z-10 w-full aspect-[9/19] rounded-[2.5rem] bg-white dark:bg-zinc-900 shadow-2xl border-[8px] border-slate-900 overflow-hidden ring-1 ring-slate-900/5"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-20" />
                
                {/* Screen Content UI Simulation */}
                <div className="h-full w-full bg-slate-50 dark:bg-zinc-950 flex flex-col pt-12 overflow-hidden">
                  
                  {/* Top Bar Area */}
                  <div className="px-5 pb-4">
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Welcome back,</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">Ahmad Logistics</p>
                  </div>

                  {/* Summary Cards */}
                  <div className="px-5 grid grid-cols-2 gap-3 mb-6">
                    <div className="rounded-xl bg-[var(--accent-gold)] p-3 text-white shadow-md shadow-amber-200/50">
                      <p className="text-[10px] font-medium opacity-80">Active Shipments</p>
                      <p className="text-2xl font-bold mt-1">12</p>
                    </div>
                    <div className="rounded-xl bg-white dark:bg-zinc-800 p-3 shadow-sm border border-slate-100 dark:border-zinc-700">
                      <p className="text-[10px] font-medium text-slate-500 dark:text-zinc-400">Due Balance</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">$4.2K</p>
                    </div>
                  </div>

                  {/* Tracking widget */}
                  <div className="px-5 mb-4 flex-1">
                    <div className="h-full rounded-2xl bg-white dark:bg-zinc-800 shadow-sm border border-slate-100 dark:border-zinc-700 p-4">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Live Tracking</p>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">In Transit</span>
                      </div>
                      
                      {/* Fake Map / Route line */}
                      <div className="relative h-full min-h-[140px] flex items-center justify-center bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-zinc-800 overflow-hidden">
                        {/* Route Line */}
                        <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-200 dark:bg-zinc-700 -translate-y-1/2 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-[var(--accent-gold)] w-1/2"
                            animate={{ width: ["0%", "50%"] }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                          />
                        </div>
                        
                        {/* Route Nodes */}
                        <div className="absolute top-1/2 left-4 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-white bg-slate-300 dark:border-zinc-800 dark:bg-zinc-600 z-10" />
                        <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-4 border-white bg-[var(--accent-gold)] shadow-lg shadow-amber-200/50 dark:border-zinc-800 dark:shadow-none z-10 flex items-center justify-center">
                           <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        </div>
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-white bg-slate-300 dark:border-zinc-800 dark:bg-zinc-600 z-10" />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Navigation Fake */}
                  <div className="h-16 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-around px-6">
                    <div className="w-5 h-5 rounded-md bg-[var(--accent-gold)]" />
                    <div className="w-5 h-5 rounded-md bg-slate-300 dark:bg-zinc-700" />
                    <div className="w-5 h-5 rounded-md bg-slate-300 dark:bg-zinc-700" />
                    <div className="w-5 h-5 rounded-md bg-slate-300 dark:bg-zinc-700" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
