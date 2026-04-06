import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[var(--background)] pt-28 pb-24 sm:pt-32 sm:pb-28 lg:pt-36 lg:pb-32">
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <p className="landing-reveal mx-auto max-w-xl text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--text-secondary)] sm:text-sm" style={{ animationDelay: '40ms' }}>
            Shipping BeyondBoundaries.
          </p>
          <h1 className="landing-reveal mx-auto mt-4 max-w-5xl text-[3.35rem] font-bold leading-[0.94] tracking-[-0.04em] text-[var(--text-primary)] sm:text-[4.25rem] lg:text-[5.4rem]" style={{ animationDelay: '120ms' }}>
            Shipping Beyond
            <span className="block text-[var(--accent-gold)]">Boundaries.</span>
          </h1>
          <p className="landing-reveal mx-auto mt-6 max-w-[54rem] text-[1.05rem] leading-8 text-[var(--text-secondary)] sm:text-xl" style={{ animationDelay: '220ms' }}>
            The most trusted vehicle shipping service from the USA to Afghanistan - via Dubai UAE. Door-to-door delivery with full customs clearance, real-time tracking, and white-glove service.
          </p>
          <div className="landing-reveal mt-9 flex flex-col justify-center gap-4 sm:flex-row" style={{ animationDelay: '320ms' }}>
            <Link
              href="/#quote"
              className="inline-flex items-center justify-center rounded-2xl bg-[var(--accent-gold)] px-7 py-4 text-base font-semibold text-white shadow-lg shadow-amber-200 transition-transform hover:-translate-y-0.5"
            >
              Get a Free Quote
            </Link>
            <Link
              href="/tracking"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-7 py-4 text-base font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
            >
              Track Your Shipment
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {stats.map((stat, index) => (
              <article
                key={stat.label}
                className="landing-reveal rounded-[1.75rem] border border-[var(--border)] bg-white px-5 py-5 text-center shadow-sm shadow-slate-900/5"
                style={{ animationDelay: `${420 + index * 90}ms` }}
              >
                <p className="text-[1.85rem] font-bold leading-none text-[var(--text-primary)]">{stat.value}</p>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">{stat.label}</p>
              </article>
            ))}
          </div>

          <div className="mx-auto mt-10 grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {trustPoints.map((point, index) => (
              <div
                key={point.title}
                className="landing-reveal rounded-[1.4rem] border border-[var(--border)] bg-white px-4 py-4 text-center"
                style={{ animationDelay: `${620 + index * 80}ms` }}
              >
                <p className="text-sm font-semibold text-[var(--text-primary)]">{point.title}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{point.detail}</p>
              </div>
            ))}
          </div>

          <p className="landing-reveal mt-8 text-sm font-medium tracking-[0.08em] text-[var(--text-secondary)]" style={{ animationDelay: '860ms' }}>
            USA → Dubai UAE → Afghanistan
          </p>
        </div>
      </div>
    </section>
  );
}