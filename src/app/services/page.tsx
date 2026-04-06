import Link from 'next/link';
import { ArrowRight, Car, Container, FileCheck, Globe, MapPin, Plane, Search, ShieldCheck, Truck } from 'lucide-react';
import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import Button from '@/components/design-system/Button';
import { auth } from '@/lib/auth';

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
    description: 'Secure ground transportation network connecting our Dubai hub to every province in Afghanistan, including Herat, Kabul, Kandahar, and beyond.',
    icon: Truck,
    badge: 'Full Coverage',
  },
  {
    title: 'Customs Clearance',
    description: 'Complete customs brokerage and documentation handling. We manage all import/export paperwork, duties, and regulatory requirements end-to-end.',
    icon: FileCheck,
    badge: 'Included',
  },
  {
    title: 'Vehicle Shipping Consulting',
    description: 'Advice on route planning, documentation readiness, shipping timelines, and the most suitable transport model for your vehicle.',
    icon: Car,
    badge: 'Guided',
  },
  {
    title: 'Live Tracking',
    description: 'Real-time shipment visibility with milestone updates from pickup through Dubai transit and final Afghanistan delivery.',
    icon: Search,
    badge: 'Live',
  },
];

const processSteps = [
  {
    number: '01',
    title: 'Request a Quote',
    description: 'Fill out our simple form with your vehicle details and destination. We will send you a competitive, transparent quote within 24 hours.',
    icon: MapPin,
  },
  {
    number: '02',
    title: 'Vehicle Pickup',
    description: 'Our team collects your vehicle from anywhere in the United States. We handle loading, securing, and all pre-departure documentation.',
    icon: Truck,
  },
  {
    number: '03',
    title: 'Dubai Transit Hub',
    description: 'Your vehicle passes through our Dubai hub with expert care, inspection, and customs processing handled by our specialists.',
    icon: Globe,
  },
  {
    number: '04',
    title: 'Afghanistan Delivery',
    description: 'Door-to-door delivery to your chosen province with full customs clearance. We notify you at every milestone of the journey.',
    icon: ShieldCheck,
  },
];

export default async function ServicesPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header isAuthenticated={Boolean(session?.user)} />
      <main className="pt-28">
        <section className="relative overflow-hidden border-b border-[var(--border)] bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(var(--accent-gold-rgb),0.12),transparent_52%)]" />
          <div className="container relative mx-auto px-4 py-20 text-center sm:px-6 lg:px-8">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-gold)]">Services</p>
            <p className="mx-auto max-w-xl text-sm font-semibold uppercase tracking-[0.28em] text-[var(--text-secondary)] sm:text-base">
              Shipping BeyondBoundaries.
            </p>
            <h1 className="mx-auto mt-5 max-w-5xl text-4xl font-bold leading-[0.98] md:text-6xl">
              Comprehensive logistics solutions for the full USA to Afghanistan route.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-[var(--text-secondary)]">
              Every service you need to move your vehicle from the USA to Afghanistan, handled under one roof.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/#quote">
                <Button size="lg">Get a Free Quote</Button>
              </Link>
              <Link href="/tracking">
                <Button variant="outline" size="lg" icon={<ArrowRight className="w-4 h-4" />} iconPosition="end">
                  Track a Shipment
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-gold)]">What We Do</p>
              <h2 className="text-3xl font-bold md:text-5xl">Comprehensive Logistics Solutions</h2>
              <p className="mt-5 text-lg leading-relaxed text-[var(--text-secondary)]">
                Every service you need to move your vehicle from the USA to Afghanistan, handled under one roof.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => {
                const Icon = service.icon;

                return (
                  <div key={service.title} className="flex min-h-[360px] flex-col rounded-[2rem] border border-[var(--border)] bg-[var(--background)] p-8 shadow-sm shadow-slate-900/5">
                    <div className="mb-6 inline-flex self-start rounded-full bg-[rgba(var(--accent-gold-rgb),0.12)] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-gold)]">
                      {service.badge}
                    </div>
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                      <Icon className="w-7 h-7 text-[var(--accent-gold)]" />
                    </div>
                    <h2 className="mb-3 text-2xl font-bold">{service.title}</h2>
                    <p className="leading-relaxed text-[var(--text-secondary)]">{service.description}</p>
                    <Link href="/#contact" className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--accent-gold)]">
                      Learn More
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--background)] py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-[var(--accent-gold)]">The Process</p>
              <h2 className="text-3xl font-bold md:text-5xl">Ship Your Vehicle in 4 Simple Steps</h2>
              <p className="mt-5 text-lg text-[var(--text-secondary)]">
                We&apos;ve engineered every step to be transparent, predictable, and stress-free.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {processSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <div key={step.title} className="flex min-h-[320px] flex-col rounded-[2rem] border border-[var(--border)] bg-white p-8 shadow-sm shadow-slate-900/5">
                    <div className="flex items-center justify-between">
                      <span className="text-4xl font-bold text-[var(--accent-gold)]">{step.number}</span>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--panel)]">
                        <Icon className="w-6 h-6 text-[var(--accent-gold)]" />
                      </div>
                    </div>
                    <h3 className="mt-8 mb-3 text-2xl font-bold">{step.title}</h3>
                    <p className="leading-relaxed text-[var(--text-secondary)]">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#0f172a] py-24 text-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-amber-300">Additional Support</p>
              <h2 className="text-3xl font-bold md:text-5xl">Built around the route, not generic international shipping.</h2>
              <p className="mt-5 text-lg leading-relaxed text-slate-300">
                Our service model covers export preparation in the USA, customs and hub coordination in Dubai, and structured inland delivery planning for Afghanistan.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                {
                  title: 'Route Planning',
                  text: 'We recommend the right movement plan based on urgency, destination, customs profile, and vehicle type.',
                },
                {
                  title: 'Documentation Control',
                  text: 'We keep paperwork aligned from pickup through release so your shipment does not stall during handoffs.',
                },
                {
                  title: 'Status Visibility',
                  text: 'Customers know when the vehicle is collected, shipped, processed through Dubai, and assigned for Afghanistan delivery.',
                },
              ].map((item) => (
                <article key={item.title} className="rounded-[2rem] border border-slate-700 bg-slate-900/65 p-8">
                  <h3 className="text-2xl font-bold">{item.title}</h3>
                  <p className="mt-4 leading-relaxed text-slate-300">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}