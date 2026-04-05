import Link from 'next/link';
import { ArrowRight, Car, Container, Search, Truck } from 'lucide-react';

const services = [
  {
    title: 'USA vehicle intake',
    description: 'Pickup coordination, yard handling, condition documentation, and export preparation before the vehicle moves to port.',
    icon: Car,
  },
  {
    title: 'Container operations',
    description: 'Container loading, inventory control, and departure coordination with clear status milestones through the ocean leg.',
    icon: Container,
  },
  {
    title: 'UAE handoff and customs',
    description: 'Dubai-area transfer planning, customs coordination, and onward routing before Afghanistan transit begins.',
    icon: Truck,
  },
  {
    title: 'Tracking and release visibility',
    description: 'Customers can follow shipment progress from container movement to destination transit and delivery readiness.',
    icon: Search,
  },
];

export default function ServicesPreviewSection() {
  return (
    <section id="services" className="bg-[var(--background)] py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-gold)]">Services</p>
            <h2 className="text-4xl font-bold text-[var(--text-primary)] sm:text-5xl">One team across export, handoff, and destination transit.</h2>
            <p className="mt-5 text-lg leading-relaxed text-[var(--text-secondary)]">
              Every service line is shaped around the route Afghan customers actually use: USA sourcing and export, UAE coordination, and structured delivery planning into Afghanistan.
            </p>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center gap-2 self-start rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
          >
            View all services
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <article key={service.title} className="rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm shadow-slate-900/5">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--panel)] text-[var(--accent-gold)]">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-primary)]">{service.title}</h3>
                <p className="mt-4 leading-relaxed text-[var(--text-secondary)]">{service.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}