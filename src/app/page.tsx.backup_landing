import Header from '@/components/sections/Header';
import HeroSection from '@/components/sections/HeroSection';
import ServicesSection from '@/components/sections/ServicesSection';
import WhyChooseSection from '@/components/sections/WhyChooseSection';
import ProcessSection from '@/components/sections/ProcessSection';
import RoutesSection from '@/components/sections/RoutesSection';
// import TrustSection from '@/components/sections/TrustSection';
// import TestimonialsSection from '@/components/sections/TestimonialsSection';
// import BrandsSection from '@/components/sections/BrandsSection';
import AboutMiniSection from '@/components/sections/AboutMiniSection';
import QuoteFormSection from '@/components/sections/QuoteFormSection';
import Footer from '@/components/sections/Footer';
import FloatingCTA from '@/components/ui/FloatingCTA';

export default function Home() {
	return (
		<>
			{/* Skip Links for Accessibility */}
			<a href="#main-content" className="skip-link">
				Skip to main content
			</a>
			<a href="#services" className="skip-link" style={{ left: '150px' }}>
				Skip to services
			</a>
			<a href="#quote" className="skip-link" style={{ left: '300px' }}>
				Skip to quote form
			</a>
			
			<Header />
			<main id="main-content" tabIndex={-1}>
				<HeroSection />
				<ServicesSection />
				<WhyChooseSection />
				<ProcessSection />
				<RoutesSection />
				{/* <TrustSection /> */}
				{/* <TestimonialsSection /> */}
				{/* <BrandsSection /> */}
				<AboutMiniSection />
				<QuoteFormSection />
			</main>
			<Footer />
			<FloatingCTA />
		</>
	);
}
