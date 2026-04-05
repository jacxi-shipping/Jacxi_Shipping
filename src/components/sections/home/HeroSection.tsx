import { CheckCircle, Globe, Package, ShieldCheck, Star } from 'lucide-react';
import HeroTrackingForm from './HeroTrackingForm';

const stats = [
  { label: 'USA Origin Network', value: '50 states', icon: Globe },
  { label: 'Vehicles Coordinated', value: '12k+', icon: Package },
  { label: 'Route Compliance', value: '99.8%', icon: CheckCircle },
  { label: 'Customer Rating', value: '4.9/5', icon: Star },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[var(--background)] pt-28 pb-20 sm:pt-32 sm:pb-24">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(var(--accent-gold-rgb),0.12),transparent_48%)]" />
        <div className="absolute right-[-8%] top-8 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-70" />
        <div className="absolute bottom-[-12%] left-[-5%] h-72 w-72 rounded-full bg-amber-100 blur-3xl opacity-70" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,black,transparent)] opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-[var(--text-secondary)] shadow-sm">
            <ShieldCheck className="h-4 w-4 text-[var(--accent-gold)]" />
            USA pickup, UAE consolidation, Afghanistan delivery
          </div>
          <h1 className="mx-auto max-w-5xl text-5xl font-bold leading-[1.05] text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
            Vehicle shipping built for the full USA to Afghanistan route.
          </h1>
          <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-[var(--text-secondary)] sm:text-xl">
            JACXI manages the export leg from the United States, coordinates the UAE handoff, and keeps Afghan customers informed through customs, transit, and final delivery planning.
          </p>
          <div className="mt-10">
            <HeroTrackingForm />
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <article
                key={stat.label}
                className="rounded-3xl border border-[var(--border)] bg-white/90 p-5 shadow-sm shadow-slate-900/5 backdrop-blur"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--panel)] text-[var(--accent-gold)]">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}