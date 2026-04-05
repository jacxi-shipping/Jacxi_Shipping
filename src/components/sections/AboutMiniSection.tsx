import Image from 'next/image';
import { Building2 } from 'lucide-react';

export default function AboutMiniSection() {
	return (
		<section id="about" className="bg-white py-24">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="grid lg:grid-cols-2 gap-12 items-center">
					<div className="relative">
							<div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl relative">
								<Image
									src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=2070&auto=format&fit=crop"
									alt="JACXI Vehicle Shipping Services"
									fill
									className="object-cover"
									priority
								/>
									<div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur-sm">
										<div className="flex items-center gap-3">
											<div className="w-12 h-12 rounded-xl bg-[rgb(var(--jacxi-blue))] flex items-center justify-center flex-shrink-0">
												<Building2 className="w-6 h-6 text-white" />
											</div>
											<div>
												<p className="font-bold text-gray-900">Route-managed shipping</p>
												<p className="text-sm text-gray-600">USA to UAE to Afghanistan</p>
											</div>
										</div>
									</div>
							</div>
							<div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[rgb(var(--uae-gold))]/20 rounded-full blur-3xl" />
					</div>

					<div className="space-y-6">
								<div>
									<p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-[rgb(var(--uae-gold))]">About JACXI</p>
									<h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
										Built for Afghan customers shipping vehicles from the United States.
									</h2>
									<p className="text-lg text-gray-600 leading-relaxed mb-6">
										JACXI was created to remove the confusion Afghan buyers face when a vehicle leaves the USA, passes through the UAE, and then changes into destination transit. We built the workflow around that route so customers know who is handling the shipment at each stage.
									</p>
									<p className="text-lg text-gray-600 leading-relaxed">
										That means one team overseeing export preparation, customs paperwork, container movement, UAE coordination, and final release planning into Herat and other Afghan destinations.
									</p>
								</div>

								<div className="bg-gradient-to-br from-[rgb(var(--jacxi-blue))]/5 to-[rgb(var(--uae-gold))]/5 rounded-2xl p-6 border border-[rgb(var(--jacxi-blue))]/10">
									<h3 className="text-lg font-bold text-gray-900 mb-4">What stays visible</h3>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										{[
											'Container assignment and movement',
											'UAE handoff and customs progress',
											'Destination transit milestones',
											'Delivery readiness and release status',
											'Document and invoice visibility',
											'One communication trail for support',
										].map((feature, index) => (
												<div className="flex items-center gap-2" key={index}>
													<div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--jacxi-blue))]" />
													<span className="text-sm text-gray-700">{feature}</span>
												</div>
										))}
									</div>
								</div>
					</div>
				</div>
			</div>
		</section>
	);
}
