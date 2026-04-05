import Link from 'next/link';
import { ArrowRight, Car, Container, FileCheck, Globe, MapPin, Search, ShieldCheck, Truck } from 'lucide-react';
import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import Button from '@/components/design-system/Button';
import { auth } from '@/lib/auth';

const services = [
  {
    title: 'Vehicle Shipping',
    description: 'End-to-end vehicle export handling from auction pickup and storage through port departure and overseas delivery planning.',
    icon: Car,
  },
  {
    title: 'Container Loading',
    description: 'Container planning, inventory verification, loading coordination, and secure handoff for international departure.',
    icon: Container,
  },
  {
    title: 'Customs Clearance',
    description: 'Documentation review and customs coordination across departure, transit, and destination checkpoints.',
    icon: FileCheck,
  },
  {
    title: 'Live Tracking',
    description: 'Operational status visibility with milestone-driven tracking from origin to final destination transit.',
    icon: Search,
  },
  {
    title: 'Route Coordination',
    description: 'Structured planning for USA to Afghanistan moves routed through UAE operations and handoff points.',
    icon: Globe,
  },
  {
    title: 'Final-Mile Transit',
    description: 'Transit assignment and destination delivery coordination once shipments leave their originating container workflow.',
    icon: Truck,
  },
];

const processSteps = [
  {
    title: 'Plan the shipment',
    description: 'We review the vehicle, route, timing, and required documentation before cargo moves.',
    icon: MapPin,
  },
  {
    title: 'Secure the handoff',
    description: 'Container, customs, and transit checkpoints are coordinated so status changes stay accurate and auditable.',
    icon: ShieldCheck,
  },
  {
    title: 'Track to delivery',
    description: 'Customers follow the shipment from export through destination transit without losing workflow visibility.',
    icon: Search,
  },
];

export default async function ServicesPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header isAuthenticated={Boolean(session?.user)} />
      <main className="pt-28">
        <section className="bg-white border-b border-[var(--border)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-gold)] mb-4">Services</p>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Shipping services built for the full route</h1>
            <p className="max-w-3xl mx-auto text-lg text-[var(--text-secondary)] leading-relaxed">
              JACXI combines USA export handling, UAE customs coordination, and Afghanistan transit planning into one workflow designed specifically for vehicle shipping customers on this route.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/#contact">
                <Button size="lg">Request a Quote</Button>
              </Link>
              <Link href="/tracking">
                <Button variant="outline" size="lg" icon={<ArrowRight className="w-4 h-4" />} iconPosition="end">
                  Track a Shipment
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 bg-[var(--panel)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-gold)] mb-4">Service areas</p>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Coverage across each shipping stage</h2>
              <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
                From origin-yard dispatch to container loading and destination transit, each service follows the real operational handoff points in the Jacxi route.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {services.map((service) => {
                const Icon = service.icon;

                return (
                  <div key={service.title} className="rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center mb-6">
                      <Icon className="w-7 h-7 text-[var(--text-primary)]" />
                    </div>
                    <h2 className="text-2xl font-bold mb-3">{service.title}</h2>
                    <p className="text-[var(--text-secondary)] leading-relaxed">{service.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 bg-white border-y border-[var(--border)]">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-gold)] mb-4">How it works</p>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Operational clarity at each handoff</h2>
              <p className="text-lg text-[var(--text-secondary)]">
                The service model mirrors the actual shipment lifecycle, so customers and staff see the same route milestones from export through final-mile transit.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {processSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <div key={step.title} className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-8">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-12 h-12 rounded-xl bg-white border border-[var(--border)] flex items-center justify-center">
                        <Icon className="w-6 h-6 text-[var(--text-primary)]" />
                      </div>
                      <span className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">Step {index + 1}</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                    <p className="text-[var(--text-secondary)] leading-relaxed">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}