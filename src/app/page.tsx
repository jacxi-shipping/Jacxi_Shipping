import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import AboutMiniSection from '@/components/sections/AboutMiniSection';
import QuoteFormSection from '@/components/sections/QuoteFormSection';
import CustomerProofSection from '@/components/sections/home/CustomerProofSection';
import CtaSection from '@/components/sections/home/CtaSection';
import HeroSection from '@/components/sections/home/HeroSection';
import RouteSection from '@/components/sections/home/RouteSection';
import ServicesPreviewSection from '@/components/sections/home/ServicesPreviewSection';
import WhyChooseSection from '@/components/sections/home/WhyChooseSection';
import { auth } from '@/lib/auth';

export default async function Home() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-gold)] selection:text-white">
      <Header isAuthenticated={isAuthenticated} />
      <main>
        <HeroSection />
        <WhyChooseSection />
        <ServicesPreviewSection />
        <RouteSection />
        <AboutMiniSection />
        <CustomerProofSection />
        <QuoteFormSection />
        <CtaSection isAuthenticated={isAuthenticated} />
      </main>
      <Footer />
    </div>
  );
}
