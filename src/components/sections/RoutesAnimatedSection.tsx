'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Container, MapPin, Ship, Truck } from 'lucide-react';

const journeySteps = [
  {
    step: '01',
    icon: Truck,
    location: 'USA / Canada',
    title: 'Pickup and export prep',
    description: 'Vehicle intake, inspection, auction or home pickup, title checks, and port loading.',
    duration: '1-5 days',
  },
  {
    step: '02',
    icon: Ship,
    location: 'Mersin, Turkey',
    title: 'Ocean freight corridor',
    description: 'Container movement through the Mediterranean with port handoff visibility.',
    duration: '18-28 days',
  },
  {
    step: '03',
    icon: Container,
    location: 'UAE transit',
    title: 'Hub coordination',
    description: 'Documentation, routing control, inspection support, and onward shipment planning.',
    duration: '3-7 days',
  },
  {
    step: '04',
    icon: CheckCircle2,
    location: 'Afghanistan',
    title: 'Customs and delivery',
    description: 'Final customs support and delivery to Herat, Kabul, Kandahar, Mazar, and beyond.',
    duration: '2-6 days',
  },
];

const nodes = [
  { id: 'canada', x: 250, y: 168, label: 'Canada' },
  { id: 'usa', x: 230, y: 222, label: 'USA' },
  { id: 'mersin', x: 555, y: 230, label: 'Mersin' },
  { id: 'uae', x: 604, y: 306, label: 'UAE' },
  { id: 'afghanistan', x: 632, y: 250, label: 'Afghanistan' },
];

const paths = [
  { path: 'M 250 168 Q 390 92 555 230', delay: 0, duration: 5 },
  { path: 'M 230 222 Q 398 150 555 230', delay: 0.4, duration: 5 },
  { path: 'M 555 230 Q 590 260 604 306', delay: 2.7, duration: 3 },
  { path: 'M 604 306 Q 632 290 632 250', delay: 4.2, duration: 2.4 },
];

const movers = [
  { cx: [250, 350, 470, 555], cy: [168, 98, 148, 230], delay: 0.3, icon: Ship },
  { cx: [230, 352, 468, 555], cy: [222, 156, 172, 230], delay: 1.0, icon: Ship },
  { cx: [555, 578, 594, 604], cy: [230, 252, 282, 306], delay: 3.1, icon: Container },
  { cx: [604, 620, 632], cy: [306, 286, 250], delay: 4.7, icon: Truck },
];

export default function RoutesAnimatedSection() {
  return (
    <section id="route" className="relative overflow-hidden bg-[var(--background)] py-20 sm:py-24">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(var(--accent-gold-rgb),0.65),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.62 }}
          >
            <p className="text-sm font-bold uppercase text-[var(--accent-gold)]">Global route</p>
            <h2 className="mt-4 max-w-xl text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
              Built for the real corridor into Afghanistan.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
              Your vehicle moves through a planned logistics chain: North American pickup, ocean freight to Mersin, UAE coordination when needed, and final customs-backed delivery across Afghanistan.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { label: 'Primary route', value: 'USA / Canada to Mersin' },
                { label: 'Transit control', value: 'Turkey and UAE handoffs' },
                { label: 'Final mile', value: 'All Afghan provinces' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">{item.label}</p>
                  <p className="mt-1 text-sm font-black text-[var(--text-primary)]">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.72, delay: 0.1 }}
            className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-[0_30px_90px_rgba(var(--text-primary-rgb),0.10)]"
          >
            <div className="absolute inset-0 bg-[url('/world-map.svg')] bg-contain bg-center bg-no-repeat opacity-[0.12]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(var(--panel-rgb),0.42),rgba(var(--panel-rgb),0.88))]" />

            <div className="relative aspect-[1.15/1] sm:aspect-[16/9]">
              <svg viewBox="0 0 950 620" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="premium-route-line" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(var(--accent-gold-rgb),0.22)" />
                    <stop offset="50%" stopColor="var(--accent-gold)" />
                    <stop offset="100%" stopColor="rgba(var(--accent-gold-rgb),0.36)" />
                  </linearGradient>
                  <filter id="premium-route-glow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {paths.map((path) => (
                  <path
                    key={`ghost-${path.path}`}
                    d={path.path}
                    fill="none"
                    stroke="rgba(var(--text-primary-rgb),0.12)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="7 9"
                  />
                ))}

                {paths.map((path) => (
                  <motion.path
                    key={path.path}
                    d={path.path}
                    fill="none"
                    stroke="url(#premium-route-line)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    filter="url(#premium-route-glow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: [0, 1, 1], opacity: [0, 1, 0.75] }}
                    viewport={{ once: false }}
                    transition={{ duration: path.duration, delay: path.delay, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' }}
                  />
                ))}

                {movers.map((mover, index) => {
                  const Icon = mover.icon;
                  return (
                    <motion.g
                      key={`mover-${index}`}
                      animate={{ x: mover.cx, y: mover.cy, opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 6.4, delay: mover.delay, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
                    >
                      <circle r="17" fill="rgba(var(--accent-gold-rgb),0.16)" stroke="rgba(var(--accent-gold-rgb),0.42)" />
                      <foreignObject x="-10" y="-10" width="20" height="20">
                        <Icon className="h-5 w-5 text-[var(--accent-gold)]" />
                      </foreignObject>
                    </motion.g>
                  );
                })}

                {nodes.map((node, index) => (
                  <g key={node.id}>
                    <motion.circle
                      cx={node.x}
                      cy={node.y}
                      r="7"
                      fill="var(--accent-gold)"
                      initial={{ scale: 0, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + index * 0.08, type: 'spring', stiffness: 260, damping: 18 }}
                    />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="13"
                      fill="none"
                      stroke="rgba(var(--accent-gold-rgb),0.45)"
                      strokeWidth="2"
                    />
                    <text x={node.x} y={node.y - 18} fill="var(--text-primary)" fontSize="13" fontWeight="800" textAnchor="middle">
                      {node.label}
                    </text>
                  </g>
                ))}
              </svg>

              <div className="absolute left-4 top-4 rounded-lg border border-[var(--border)] bg-[rgba(var(--panel-rgb),0.82)] px-4 py-3 text-[var(--text-primary)] backdrop-blur-xl sm:left-6 sm:top-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--text-secondary)]">
                  <Clock className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
                  Estimated corridor
                </div>
                <p className="mt-1 text-lg font-black">30-45 days</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {journeySteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.article
                key={step.step}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: index * 0.07 }}
                className="group rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-[rgba(var(--accent-gold-rgb),0.55)] hover:shadow-[0_18px_38px_rgba(var(--text-primary-rgb),0.10)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-black text-[rgba(var(--text-primary-rgb),0.18)]">{step.step}</span>
                </div>
                <p className="mt-5 text-xs font-bold uppercase text-[var(--accent-gold)]">{step.location}</p>
                <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{step.description}</p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--background)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)]">
                  <MapPin className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
                  {step.duration}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
