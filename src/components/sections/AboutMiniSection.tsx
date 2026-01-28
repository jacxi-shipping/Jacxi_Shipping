'use client';

import Image from 'next/image';
import { Building2 } from 'lucide-react';
import { Fade, Slide, Box } from '@mui/material';

export default function AboutMiniSection() {
	const show = true;

	return (
		<section id="about" className="py-24 bg-white">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="grid lg:grid-cols-2 gap-12 items-center">
					{/* Left - Image/Visual */}
					<Slide in={show} direction="right" timeout={800}>
						<Box className="relative">
							<div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl relative">
								{/* Car Shipping Photo */}
								<Image
									src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=2070&auto=format&fit=crop"
									alt="JACXI Vehicle Shipping Services"
									fill
									className="object-cover"
									priority
								/>
								{/* Overlay Badge */}
								<Fade in={show} timeout={1000} style={{ transitionDelay: '400ms' }}>
									<Box className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
										<div className="flex items-center gap-3">
											<div className="w-12 h-12 rounded-xl bg-[rgb(var(--jacxi-blue))] flex items-center justify-center flex-shrink-0">
												<Building2 className="w-6 h-6 text-white" />
											</div>
											<div>
												<p className="font-bold text-gray-900">Modern Logistics</p>
												<p className="text-sm text-gray-600">USA to Afghanistan</p>
											</div>
										</div>
									</Box>
								</Fade>
							</div>
							{/* Decorative Elements */}
							<div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[rgb(var(--uae-gold))]/20 rounded-full blur-3xl" />
						</Box>
					</Slide>

					{/* Right - Content */}
					<Slide in={show} direction="left" timeout={800}>
						<Box className="space-y-6">
							<Fade in={show} timeout={800} style={{ transitionDelay: '200ms' }}>
								<div>
									<h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
										About <span className="text-[rgb(var(--jacxi-blue))]">Us</span>
									</h2>
									<p className="text-lg text-gray-600 leading-relaxed mb-6">
										Launched in 2025, JACXI Shipping was founded to solve the challenges that people 
										in Afghanistan faced when shipping vehicles from the USA. We identified every pain 
										point in the traditional process and built a modern solution from the ground up.
									</p>
								</div>
							</Fade>

							{/* Dashboard Features */}
							<Fade in={show} timeout={800} style={{ transitionDelay: '400ms' }}>
								<div className="bg-gradient-to-br from-[rgb(var(--jacxi-blue))]/5 to-[rgb(var(--uae-gold))]/5 rounded-2xl p-6 border border-[rgb(var(--jacxi-blue))]/10">
									<h3 className="text-lg font-bold text-gray-900 mb-4">Dashboard Features</h3>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										{[
											'Real-time vehicle tracking',
											'Digital document management',
											'Transparent cost breakdown',
											'Live shipment updates',
											'Invoice generation & payment',
											'Direct messaging with support',
										].map((feature, index) => (
											<Fade
												key={index}
												in={show}
												timeout={400}
												style={{ transitionDelay: `${600 + index * 100}ms` }}
											>
												<div className="flex items-center gap-2">
													<div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--jacxi-blue))]" />
													<span className="text-sm text-gray-700">{feature}</span>
												</div>
											</Fade>
										))}
									</div>
								</div>
							</Fade>
						</Box>
					</Slide>
				</div>
			</div>
		</section>
	);
}
