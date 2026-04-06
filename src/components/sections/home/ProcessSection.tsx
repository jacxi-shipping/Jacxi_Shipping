import { FileText, PackageCheck, PlaneTakeoff, Truck } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Request a Quote',
    description: 'Fill out our simple form with your vehicle details and destination. We\'ll send you a competitive, transparent quote within 24 hours.',
    icon: FileText,
  },
  {
    number: '02',
    title: 'Vehicle Pickup',
    description: 'Our team collects your vehicle from anywhere in the United States. We handle loading, securing, and all pre-departure documentation.',
    icon: PackageCheck,
  },
  {
    number: '03',
    title: 'Dubai Transit Hub',
    description: 'Your vehicle passes through our state-of-the-art Dubai hub with expert care, inspection, and customs processing handled by our specialists.',
    icon: PlaneTakeoff,
  },
  {
    number: '04',
    title: 'Afghanistan Delivery',
    description: 'Door-to-door delivery to your chosen province with full customs clearance. We notify you at every milestone of the journey.',
    icon: Truck,
  },
];

export default function ProcessSection() {
  return (
    <section id="process" className="bg-[var(--background)] py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-[var(--accent-gold)]">The Process</p>
          <h2 className="text-3xl font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl lg:text-[3.2rem]">Ship Your Vehicle in 4 Simple Steps</h2>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            We&apos;ve engineered every step to be transparent, predictable, and stress-free.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <article key={step.number} className="flex min-h-[340px] flex-col rounded-[2rem] border border-[var(--border)] bg-white p-8 shadow-sm shadow-slate-900/5">
                <div className="flex items-center justify-between">
                  <span className="text-[2.6rem] font-bold leading-none text-[var(--accent-gold)]">{step.number}</span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--panel)] text-[var(--accent-gold)]">
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="mt-8 text-[1.7rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">{step.title}</h3>
                <p className="mt-4 leading-8 text-[var(--text-secondary)]">{step.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}