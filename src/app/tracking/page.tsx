'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { AlertCircle, CheckCircle2, Clock, MapPin, Search, ArrowLeft, Ship, Package } from 'lucide-react';
import Link from 'next/link';
import Footer from '@/components/sections/Footer';

interface TrackingEventEntry {
	id: string;
	status: string;
	statusCode?: string;
	location?: string;
	terminal?: string;
	timestamp?: string;
	actual: boolean;
	description?: string;
}

interface TrackingDetails {
	containerNumber: string;
	containerType?: string;
	shipmentStatus?: string;
	origin?: string;
	destination?: string;
	currentLocation?: string;
	estimatedArrival?: string;
	estimatedDeparture?: string;
	progress?: number | null;
	company?: {
		name?: string;
		url?: string | null;
		scacs?: string[];
	};
	events: TrackingEventEntry[];
}

const normalizeProgress = (value: TrackingDetails['progress']) => {
	if (typeof value !== 'number' || Number.isNaN(value)) return null;
	return Math.min(100, Math.max(0, Math.round(value)));
};

const formatDisplayDate = (value?: string) => {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleString(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
};

export default function TrackingPage() {
	const [trackingNumber, setTrackingNumber] = useState('');
	const [trackingDetails, setTrackingDetails] = useState<TrackingDetails | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleTrack = async () => {
		const value = trackingNumber.trim();
		if (!value) {
			setErrorMessage('Enter a container or tracking number to continue.');
			setTrackingDetails(null);
			return;
		}

		setIsLoading(true);
		setErrorMessage(null);
		setTrackingDetails(null);

		try {
			const response = await fetch('/api/tracking', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ trackNumber: value, needRoute: true }),
			});

			const payload = (await response.json()) as {
				tracking?: TrackingDetails;
				message?: string;
			};

			if (!response.ok) {
				setErrorMessage(payload?.message || 'Unable to fetch tracking information.');
				return;
			}

			const details: TrackingDetails | undefined = payload?.tracking;
			if (!details) {
				setErrorMessage('No tracking data returned for that number.');
				return;
			}

			setTrackingDetails(details);
		} catch (error: unknown) {
			console.error('Tracking error:', error);
			setErrorMessage(error instanceof Error ? error.message : 'Failed to fetch tracking information.');
		} finally {
			setIsLoading(false);
		}
	};

	const progressValue = normalizeProgress(trackingDetails?.progress);
	const timelineEvents = (trackingDetails?.events || []).map((event) => ({
		...event,
		displayTimestamp: formatDisplayDate(event.timestamp) || event.timestamp || 'Pending update',
		icon: event.actual ? CheckCircle2 : Clock,
	}));

	return (
		<>
			{/* Simple Header with Back Button */}
			<header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<Link href="/">
								<Button variant="outline" size="sm" className="flex items-center gap-2">
									<ArrowLeft className="w-4 h-4" />
									Back to Home
								</Button>
							</Link>
							<div className="h-6 w-px bg-gray-300" />
							<div className="flex items-center gap-2">
								<Ship className="w-6 h-6 text-blue-600" />
								<span className="text-lg font-bold text-gray-900">Track Shipment</span>
							</div>
						</div>
						<Link href="/">
							<div className="flex items-center gap-2">
								<Ship className="w-7 h-7 text-blue-600" />
								<span className="text-xl font-bold text-gray-900">JACXI Shipping</span>
							</div>
						</Link>
					</div>
				</div>
			</header>

			<main className="min-h-screen bg-gradient-to-br from-[rgb(var(--soft-white))] via-white to-blue-50/30 pt-24 pb-16">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
					{/* Page Header */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						className="text-center mb-12"
					>
						<h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
							Track Your <span className="text-[rgb(var(--jacxi-blue))]">Shipment</span>
						</h1>
						<p className="text-xl text-gray-600">
							Enter your container or tracking number to get real-time updates
						</p>
					</motion.div>

					{/* Tracking Input Card */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.1 }}
						className="mb-10"
					>
					<div className="backdrop-blur-md bg-white/80 border border-gray-200/50 rounded-2xl shadow-xl p-6 sm:p-8">
						<form 
							onSubmit={(e) => {
								e.preventDefault();
								handleTrack();
							}}
							className="flex flex-col sm:flex-row gap-3"
							role="search"
							aria-label="Container tracking search"
						>
							<div className="flex-1 relative">
								<label htmlFor="tracking-input" className="sr-only">
									Container or tracking number
								</label>
								<Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden="true" />
								<input
									id="tracking-input"
									type="text"
									value={trackingNumber}
									onChange={(event) => setTrackingNumber(event.target.value)}
									onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
									placeholder="Enter container number (e.g., UETU6059142)"
									autoComplete="off"
									aria-required="true"
									aria-describedby={errorMessage ? 'tracking-error' : undefined}
									className="w-full pl-12 pr-4 py-4 text-base rounded-xl bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--jacxi-blue))]/50 focus:border-[rgb(var(--jacxi-blue))] transition-all touch-manipulation"
								/>
							</div>
							<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
								<Button
									type="submit"
									disabled={isLoading}
									aria-busy={isLoading}
									aria-label={isLoading ? "Tracking shipment" : "Track shipment"}
									className="sm:w-auto w-full bg-[rgb(var(--jacxi-blue))] hover:bg-[rgb(var(--jacxi-blue))]/90 text-white px-8 py-4 text-base rounded-xl shadow-lg shadow-[rgb(var(--jacxi-blue))]/25 hover:shadow-xl hover:shadow-[rgb(var(--jacxi-blue))]/35 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group touch-manipulation"
								>
									{isLoading && (
										<motion.div
											initial={{ x: "-100%" }}
											animate={{ x: "200%" }}
											transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
											className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
											aria-hidden="true"
										/>
									)}
									{isLoading ? (
										<span className="flex items-center justify-center">
											<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true" />
											Tracking...
										</span>
									) : (
										<span className="flex items-center justify-center">
											<Search className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" aria-hidden="true" />
											Track Now
										</span>
									)}
								</Button>
							</motion.div>
						</form>

							{errorMessage && (
								<motion.div
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 mt-4"
								>
									<AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
									<span>{errorMessage}</span>
								</motion.div>
							)}
						</div>
					</motion.div>

					{/* Tracking Results */}
					{trackingDetails && (
						<div className="space-y-8">
							{/* Container Details Card */}
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.4, delay: 0.1 }}
								className="backdrop-blur-md bg-white/80 border border-gray-200/50 rounded-2xl shadow-xl p-6 sm:p-8"
							>
								<h2 className="text-2xl font-bold text-gray-900 mb-6">Container Details</h2>
								
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
									<div>
										<h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">Container Number</h3>
										<p className="text-lg font-bold text-gray-900 break-all">{trackingDetails.containerNumber}</p>
										{trackingDetails.company?.name && (
											<p className="text-xs text-gray-500 mt-1">Carrier: {trackingDetails.company.name}</p>
										)}
									</div>
									<div>
										<h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">Status</h3>
										<span className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--jacxi-blue))]/40 bg-[rgb(var(--jacxi-blue))]/10 px-4 py-1.5 text-sm font-medium text-[rgb(var(--jacxi-blue))]">
											{trackingDetails.shipmentStatus || 'In Transit'}
										</span>
									</div>
									<div>
										<h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">Current Location</h3>
										<p className="text-gray-900 text-sm font-medium">
											{trackingDetails.currentLocation || 'Not available'}
										</p>
									</div>
									<div>
										<h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">Estimated Arrival</h3>
										<p className="text-gray-900 text-sm font-medium">
											{formatDisplayDate(trackingDetails.estimatedArrival) || 'Not available'}
										</p>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-sm">
									<div>
										<h4 className="text-xs uppercase tracking-wide text-gray-500 mb-1">Origin</h4>
										<p className="text-gray-900 font-medium">{trackingDetails.origin || 'Not available'}</p>
									</div>
									<div>
										<h4 className="text-xs uppercase tracking-wide text-gray-500 mb-1">Destination</h4>
										<p className="text-gray-900 font-medium">{trackingDetails.destination || 'Not available'}</p>
									</div>
									<div>
										<h4 className="text-xs uppercase tracking-wide text-gray-500 mb-1">Container Type</h4>
										<p className="text-gray-900 font-medium">{trackingDetails.containerType || 'Not available'}</p>
									</div>
								</div>

								{progressValue !== null && (
									<div className="space-y-2">
										<div className="flex items-center justify-between text-sm">
											<span className="font-medium text-gray-700">Shipping Progress</span>
											<span className="font-bold text-[rgb(var(--jacxi-blue))]">{progressValue}%</span>
										</div>
										<div className="h-3 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
											<div
												className="h-full bg-gradient-to-r from-[rgb(var(--jacxi-blue))] to-[rgb(var(--jacxi-blue))]/80 transition-all duration-500"
												style={{ width: `${progressValue}%` }}
											/>
										</div>
									</div>
								)}
							</motion.div>

							{/* Timeline Events */}
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.4, delay: 0.2 }}
								className="space-y-4"
							>
								<h2 className="text-2xl font-bold text-gray-900">Tracking Timeline</h2>
								<div className="space-y-3">
									{timelineEvents.length === 0 && (
										<div className="rounded-xl border border-gray-200 bg-white/80 px-6 py-4 text-sm text-gray-600">
											No tracking events available yet.
										</div>
									)}
									{timelineEvents.map((event) => {
										const Icon = event.icon;
										return (
											<div key={event.id} className="backdrop-blur-md bg-white/80 border border-gray-200/50 rounded-xl px-6 py-4 hover:shadow-lg transition-shadow duration-300">
												<div className="flex flex-col gap-2">
													<div className="flex items-center gap-3">
														<Icon className={`w-5 h-5 ${event.actual ? 'text-green-500' : 'text-gray-400'}`} />
														<span className="text-base font-semibold text-gray-900">{event.status}</span>
													</div>
													<div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 ml-8">
														{event.location && (
															<span className="inline-flex items-center gap-1.5">
																<MapPin className="w-4 h-4" /> 
																{event.location}
															</span>
														)}
														<span className="inline-flex items-center gap-1.5">
															<Clock className="w-4 h-4" />
															{event.displayTimestamp}
														</span>
													</div>
													{event.description && (
														<p className="text-sm text-gray-600 ml-8">{event.description}</p>
													)}
												</div>
											</div>
										);
									})}
								</div>
							</motion.div>
						</div>
					)}

					{/* Help Section */}
					{!trackingDetails && !errorMessage && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.3 }}
							className="backdrop-blur-md bg-white/80 border border-gray-200/50 rounded-2xl shadow-xl p-8 text-center"
						>
							<Package className="w-16 h-16 text-[rgb(var(--jacxi-blue))] mx-auto mb-4" />
							<h3 className="text-xl font-bold text-gray-900 mb-2">Need Help Finding Your Tracking Number?</h3>
							<p className="text-gray-600 mb-4">
								Your container number should be provided in your booking confirmation email or shipping documents.
							</p>
							<p className="text-sm text-gray-500">
								For assistance, contact us at <a href="tel:+971501234567" className="text-[rgb(var(--jacxi-blue))] hover:underline">+971 50 123 4567</a>
							</p>
						</motion.div>
					)}
				</div>
			</main>
			<Footer />
		</>
	);
}

