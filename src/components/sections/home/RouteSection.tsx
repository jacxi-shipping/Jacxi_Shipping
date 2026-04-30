import { Anchor, FileCheck, MapPin, Truck } from 'lucide-react';

const milestones = [
  {
    title: 'USA export preparation',
    description: 'Vehicle pickup, condition intake, documentation review, and port booking are completed before departure.',
    icon: MapPin,
  },
  {
    title: 'UAE consolidation and customs',
    description: 'The UAE leg acts as the operational handoff point for container arrival, customs processing, and onward planning.',
    icon: Anchor,
  },
  {
    title: 'Afghanistan transit and release',
    description: 'Once transit is assigned, the shipment stays visible through final destination movement, release preparation, and customer delivery planning.',
    icon: Truck,
  },
];

const supportPoints = [
  'Herat-focused operations with support for other Afghan provinces',
  'Clear transition from container movement to destination transit',
  'Document and customs checkpoints aligned with the route',
  'Single customer-facing workflow across all handoffs',
];

export default function RouteSection() {
  return (
    <section className="bg-white py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-gold)]">The Route</p>
            <h2 className="text-4xl font-bold text-[var(--text-primary)] sm:text-5xl">From the USA to Afghanistan, with the UAE as the working hub.</h2>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[var(--text-secondary)]">
              Customers do not need separate providers for export, customs handoff, and destination transit. JACXI keeps the route connected so each milestone reflects what is actually happening to the shipment.
            </p>

            <div className="mt-10 space-y-5">
              {milestones.map((milestone, index) => {
                const Icon = milestone.icon;

                return (
                  <article key={milestone.title} className="flex gap-5 rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--accent-gold)] shadow-sm">
                      <Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Stage {index + 1}</p>
                      <h3 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{milestone.title}</h3>
                      <p className="mt-3 leading-relaxed text-[var(--text-secondary)]">{milestone.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm shadow-slate-900/5">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[var(--accent-gold)] shadow-sm">
              <FileCheck className="h-7 w-7" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">What customers get</h3>
            <p className="mt-4 leading-relaxed text-[var(--text-secondary)]">
              The landing page, the services page, and the tracking flow now describe the same operational model: one route, one handoff chain, and one record of progress.
            </p>
            <ul className="mt-8 space-y-4">
              {supportPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-[var(--text-secondary)]">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--accent-gold)]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}