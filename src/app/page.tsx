import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import HeroSection from '@/components/sections/HeroSection';
import ServicesSection from '@/components/sections/ServicesSection';
import WhyChooseSection from '@/components/sections/WhyChooseSection';
import ProcessSection from '@/components/sections/ProcessSection';
import RoutesSection from '@/components/sections/RoutesSection';
import TrustSection from '@/components/sections/TrustSection';
import TestimonialsSection from '@/components/sections/TestimonialsSection';
import BrandsSection from '@/components/sections/BrandsSection';
import AboutMiniSection from '@/components/sections/AboutMiniSection';
import QuoteFormSection from '@/components/sections/QuoteFormSection';
import { auth } from '@/lib/auth';

export default async function Home() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-gold)] selection:text-white">
      <Header isAuthenticated={isAuthenticated} />
      <main>
        <HeroSection />
        <ServicesSection />
        <WhyChooseSection />
        <ProcessSection />
        <RoutesSection />
        <TrustSection />
        <TestimonialsSection />
        <BrandsSection />
        <AboutMiniSection />
        <QuoteFormSection />
      </main>
      <Footer />
    </div>
  );
}
