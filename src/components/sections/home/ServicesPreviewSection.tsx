import Link from 'next/link';
import { ArrowRight, Container, Plane, ShieldCheck, Truck } from 'lucide-react';

const services = [
  {
    title: 'Ocean Freight',
    description: 'Cost-effective container shipping from US ports to Dubai, then ground transport to all Afghan provinces. Ideal for bulk and standard vehicle shipments.',
    icon: Container,
    badge: 'Most Popular',
  },
  {
    title: 'Air Cargo',
    description: 'Expedited shipping for time-critical deliveries that need to arrive yesterday. Premium handling and the fastest door-to-door transit times available.',
    icon: Plane,
    badge: 'Fastest',
  },
  {
    title: 'Inland Transport',
    description: 'Secure ground transportation network connecting our Dubai hub to every province in Afghanistan - Herat, Kabul, Kandahar, Mazar-i-Sharif, and beyond.',
    icon: Truck,
    badge: 'Full Coverage',
  },
  {
    title: 'Customs Clearance',
    description: 'Complete customs brokerage and documentation handling. We manage all import/export paperwork, duties, and regulatory requirements end-to-end.',
    icon: ShieldCheck,
    badge: 'Included',
  },
];

export default function ServicesPreviewSection() {
  return (
    <section id="services" className="bg-white py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-[var(--accent-gold)]">What We Do</p>
          <h2 className="text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl lg:text-[3.2rem]">Comprehensive Logistics Solutions</h2>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            Every service you need to move your vehicle from the USA to Afghanistan - handled under one roof.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <article key={service.title} className="flex min-h-[380px] flex-col rounded-[2rem] border border-[var(--border)] bg-[var(--background)] p-8 shadow-sm shadow-slate-900/5 transition-transform hover:-translate-y-1">
                <div className="mb-7 inline-flex self-start rounded-full bg-[rgba(var(--accent-gold-rgb),0.12)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent-gold)]">
                  {service.badge}
                </div>
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[var(--accent-gold)] shadow-sm">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">{service.title}</h3>
                <p className="mt-4 leading-8 text-[var(--text-secondary)]">{service.description}</p>
                <Link href="/services" className="mt-auto inline-flex items-center gap-2 pt-10 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--accent-gold)]">
                  Learn More
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}