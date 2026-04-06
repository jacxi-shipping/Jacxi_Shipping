import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import AboutMiniSection from '@/components/sections/AboutMiniSection';
import QuoteFormSection from '@/components/sections/QuoteFormSection';
import ContactSection from '@/components/sections/home/ContactSection';
import HeroSection from '@/components/sections/home/HeroSection';
import ProcessSection from '@/components/sections/home/ProcessSection';
import ProvinceCoverageSection from '@/components/sections/home/ProvinceCoverageSection';
import ServicesPreviewSection from '@/components/sections/home/ServicesPreviewSection';
import TestimonialsSection from '@/components/sections/home/TestimonialsSection';
import { auth } from '@/lib/auth';

export default async function Home() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-gold)] selection:text-white">
      <Header isAuthenticated={isAuthenticated} />
      <main>
        <HeroSection />
        <ServicesPreviewSection />
        <ProcessSection />
        <ProvinceCoverageSection />
        <TestimonialsSection />
        <QuoteFormSection />
        <AboutMiniSection />
        <ContactSection isAuthenticated={isAuthenticated} />
      </main>
      <Footer />
    </div>
  );
}
