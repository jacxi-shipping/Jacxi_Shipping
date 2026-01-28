'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Fade, Slide, Zoom, Grow, Box } from '@mui/material';
import { 
  ArrowRight, 
  Globe, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Search,
  Star,
  Ship,
  TrendingUp,
  Anchor,
  Truck,
  CheckCircle,
  Package
} from 'lucide-react';
import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import Button from '@/components/design-system/Button';
import { StatsCard } from '@/components/design-system';
import { useInView } from '@/hooks/useInView';

// --- Components ---

function Hero() {
  const [mounted, setMounted] = useState(false);
  
  // Trigger animations on mount
  useState(() => {
    // Small delay to ensure client-side hydration for animations
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  });

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[var(--background)] pt-20">
      {/* Abstract Background - Light Theme Friendly */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(var(--accent-gold-rgb),0.05)_0%,transparent_70%)]" />
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[100px] opacity-60" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-amber-50 rounded-full blur-[100px] opacity-60" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,black,transparent)]" style={{ opacity: 0.03 }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        <Slide in={mounted} direction="down" timeout={800}>
          <div className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[var(--border)] shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-[var(--accent-gold)] animate-pulse"></span>
            <span className="text-xs font-bold text-[var(--text-secondary)] tracking-widest uppercase">Global Logistics Redefined</span>
          </div>
        </Slide>

        <Fade in={mounted} timeout={1000}>
          <h1 
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-[var(--text-primary)] mb-8 max-w-6xl mx-auto leading-[1.1]"
          >
            <span className="block">Shipping Beyond</span>
            <span className="block text-[var(--accent-gold)]">Boundaries.</span>
          </h1>
        </Fade>

        <Fade in={mounted} timeout={1500}>
          <p 
            className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-12 leading-relaxed font-normal"
          >
            Experience premium logistics with precision tracking, white-glove service, and a global network that moves your world forward.
          </p>
        </Fade>

        {/* Tracking Input */}
        <Zoom in={mounted} timeout={500} style={{ transitionDelay: '300ms' }}>
          <div className="w-full max-w-lg mx-auto relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-gold)] to-blue-500 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-10"></div>
            <div className="relative bg-white border border-[var(--border)] rounded-2xl p-2 flex items-center shadow-xl transition-colors duration-300 focus-within:border-[var(--accent-gold)]">
              <div className="pl-4 text-[var(--text-secondary)]">
                <Search className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                placeholder="Enter Tracking ID (e.g., JX-82910)" 
                className="w-full bg-transparent border-none text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-0 px-4 py-3 text-base font-medium outline-none"
              />
              <Link href="/tracking">
                <Button size="lg" icon={<ArrowRight className="w-4 h-4" />} iconPosition="end">
                  Track
                </Button>
              </Link>
            </div>
          </div>
        </Zoom>

        {/* Floating Stats - Using Dashboard Components Styled */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-6xl mx-auto">
          {[
            { label: "Active Countries", value: "45+", icon: Globe, variant: "default" },
            { label: "Shipments/Year", value: "12k+", icon: Package, variant: "info" },
            { label: "On-Time Delivery", value: "99.8%", icon: CheckCircle, variant: "success" },
            { label: "Client Satisfaction", value: "4.9/5", icon: Star, variant: "warning" },
          ].map((stat, i) => (
            <Slide 
              key={i} 
              in={mounted} 
              direction="up" 
              timeout={600}
              style={{ transitionDelay: `${500 + i * 100}ms` }}
            >
              <div>
                <StatsCard
                  title={stat.label}
                  value={stat.value}
                  icon={<stat.icon className="w-5 h-5" />}
                  variant={stat.variant as any}
                  size="sm"
                />
              </div>
            </Slide>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: any, index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1, once: true });

  return (
    <div ref={ref}>
      <Slide in={isInView} direction="up" timeout={600} style={{ transitionDelay: `${index * 100}ms` }}>
        <div className="group relative p-8 rounded-3xl bg-white border border-[var(--border)] hover:border-[var(--accent-gold)] transition-all duration-500 hover:shadow-xl hover:shadow-[rgba(var(--accent-gold-rgb),0.1)]">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-[var(--panel)] border border-[var(--border)] group-hover:bg-[var(--accent-gold)] group-hover:text-white transition-colors duration-300 text-[var(--text-primary)]`}>
            <feature.icon className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">{feature.title}</h3>
          <p className="text-[var(--text-secondary)] leading-relaxed font-light">{feature.description}</p>
        </div>
      </Slide>
    </div>
  );
}

function Features() {
  const features = [
    {
      title: "Global Reach",
      description: "Seamless shipping to over 45 countries with streamlined customs clearance and local expertise.",
      icon: Globe,
    },
    {
      title: "Real-Time Tracking",
      description: "Watch your cargo move across the globe with live GPS updates and proactive notifications.",
      icon: MapPin,
    },
    {
      title: "Secure Handling",
      description: "White-glove service ensuring your valuable assets arrive in pristine condition, every time.",
      icon: ShieldCheck,
    },
    {
      title: "Fast Delivery",
      description: "Optimized routes and priority handling for time-sensitive shipments that can't wait.",
      icon: Clock,
    }
  ];

  return (
    <section className="py-32 bg-[var(--panel)] relative clip-path-slant">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-20 text-center max-w-3xl mx-auto">
          <span className="text-[var(--accent-gold)] font-bold tracking-widest uppercase text-sm mb-4 block">Our Promise</span>
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-6">Why Industry Leaders Choose Us</h2>
          <p className="text-[var(--text-secondary)] text-lg font-light">We don't just move cargo; we engineer reliability into every mile of the journey.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feature, i) => (
            <FeatureCard key={i} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ title, desc, icon: Icon, index }: { title: string, desc: string, icon: any, index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1, once: true });

  return (
    <div ref={ref}>
      <Grow in={isInView} timeout={800} style={{ transitionDelay: `${index * 150}ms` }}>
        <div className="group relative h-[450px] rounded-3xl overflow-hidden cursor-pointer border border-[var(--border)] bg-white shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-white to-[var(--panel)] opacity-50" />
          
          <div className="absolute inset-0 flex flex-col p-8 z-10">
            <div className="flex-1">
              <div className="w-16 h-16 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center mb-8 group-hover:bg-[var(--accent-gold)] group-hover:text-white transition-colors duration-300">
                <Icon className="w-8 h-8 text-[var(--text-primary)] group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-3xl font-bold text-[var(--text-primary)] mb-4 leading-tight">{title}</h3>
              <p className="text-[var(--text-secondary)] font-light leading-relaxed">
                {desc}
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-[var(--accent-gold)] font-bold text-sm tracking-wider uppercase transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
              Explore Service <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </Grow>
    </div>
  );
}

function ServicesPreview() {
  return (
    <section id="services" className="py-32 bg-[var(--background)] text-[var(--text-primary)] overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-6xl font-bold mb-4 text-[var(--text-primary)]">Comprehensive<br/><span className="text-[var(--text-secondary)]">Logistics Solutions</span></h2>
          </div>
          <Link href="/services">
            <Button variant="outline" size="lg" icon={<ArrowRight className="w-4 h-4" />} iconPosition="end">
              View All Services
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ServiceCard 
            title="Ocean Freight" 
            desc="Cost-effective global container shipping solutions tailored for bulk transport."
            icon={Anchor}
            index={0}
          />
          <ServiceCard 
            title="Air Cargo" 
            desc="Expedited shipping for time-critical deliveries that need to be there yesterday."
            icon={TrendingUp}
            index={1}
          />
          <ServiceCard 
            title="Inland Transport" 
            desc="Secure ground transportation network connecting ports to your door."
            icon={Truck}
            index={2}
          />
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  const { ref, isInView } = useInView({ threshold: 0.5, once: true });

  return (
    <section ref={ref} className="py-32 bg-[var(--panel)] flex items-center justify-center border-y border-[var(--border)]">
      <Fade in={isInView} timeout={1000}>
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="mb-10 flex justify-center gap-2">
            {[1,2,3,4,5].map(i => <Star key={i} className="w-6 h-6 text-[var(--accent-gold)] fill-[var(--accent-gold)]" />)}
          </div>
          <h2 className="text-3xl md:text-5xl font-serif text-[var(--text-primary)] mb-12 leading-tight">
            "The level of precision and care JACXI brings to logistics is unmatched. They handled our fleet shipment with absolute professionalism."
          </h2>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-full mb-4 border-2 border-[var(--border)] overflow-hidden shadow-md flex items-center justify-center">
               <span className="text-xl font-bold text-[var(--text-secondary)]">SJ</span>
            </div>
            <p className="text-xl font-bold text-[var(--text-primary)]">Sarah Jenkins</p>
            <p className="text-[var(--text-secondary)] font-medium">Director of Operations, AutoMotive Global</p>
          </div>
        </div>
      </Fade>
    </section>
  );
}

function CTA() {
  const { ref, isInView } = useInView({ threshold: 0.3, once: true });

  return (
    <section ref={ref} className="py-32 relative overflow-hidden bg-white">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white to-[var(--panel)]" />
      
      <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
        <Zoom in={isInView} timeout={800}>
          <h2 className="text-5xl md:text-7xl font-bold text-[var(--text-primary)] mb-8 tracking-tight">Ready to ship?</h2>
        </Zoom>
        <Fade in={isInView} timeout={1000} style={{ transitionDelay: '300ms' }}>
          <p className="text-xl text-[var(--text-secondary)] font-light max-w-2xl mb-12">
            Get a competitive quote in minutes and start your journey with the world's most reliable logistics partner.
          </p>
        </Fade>
        
        <div className="flex flex-col sm:flex-row gap-6 w-full justify-center">
          <Link href="/auth/signin">
            <Button size="lg" className="px-10 py-4 text-lg">
              Get a Quote
            </Button>
          </Link>
          <Link href="/#contact">
            <Button variant="outline" size="lg" className="px-10 py-4 text-lg">
              Contact Sales
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// --- Main Page Component ---

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-gold)] selection:text-white">
      <Header />
      <main>
        <Hero />
        <Features />
        <ServicesPreview />
        <Testimonial />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
