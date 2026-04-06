import { CheckCircle2 } from 'lucide-react';

const highlights = [
  'Licensed & Bonded',
  '14+ Years Experience',
  'All Provinces Covered',
  'Free Consultation',
];

const metrics = [
  { value: '14+', label: 'Years in Business' },
  { value: '12,000+', label: 'Vehicles Shipped' },
  { value: '4.9/5', label: 'Customer Satisfaction' },
  { value: '45+', label: 'Countries Served' },
];

export default function AboutMiniSection() {
	return (
		<section id="about" className="bg-white py-28">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-3xl text-center">
							<p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-[rgb(var(--uae-gold))]">Our Story</p>
							<h2 className="mb-4 text-3xl font-bold tracking-[-0.03em] text-gray-900 sm:text-4xl lg:text-[3.2rem]">
								About JACXI Shipping
							</h2>
							<p className="mb-6 text-lg leading-8 text-gray-600">
									JACXI Shipping has been pioneering vehicle logistics from the United States to Afghanistan for over a decade. Operating through our Dubai hub, we provide seamless door-to-door delivery with complete customs clearance, real-time tracking, and white-glove service.
							</p>
							<p className="text-lg leading-8 text-gray-600">
								We understand the unique needs of Afghan expatriates and businesses importing vehicles - and we&apos;ve built our entire operation around making that process simple, transparent, and reliable.
							</p>
						</div>

				<div className="mt-12 rounded-[2rem] border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm shadow-slate-900/5 sm:p-8">
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{highlights.map((item) => (
							<div className="flex items-center justify-center gap-3 rounded-2xl bg-white px-4 py-4 text-center shadow-sm" key={item}>
								<CheckCircle2 className="h-4 w-4 text-[rgb(var(--jacxi-blue))]" />
								<span className="text-sm font-medium text-gray-700">{item}</span>
							</div>
						))}
					</div>
					<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{metrics.map((metric) => (
							<div className="rounded-2xl bg-white p-5 text-center shadow-sm" key={metric.label}>
								<p className="text-2xl font-bold text-gray-900">{metric.value}</p>
								<p className="mt-1 text-sm text-gray-600">{metric.label}</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
