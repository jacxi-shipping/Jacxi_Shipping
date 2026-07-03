'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, Car, CheckCircle, Clock, FileText, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const quoteSchema = z.object({
	fullName: z.string().min(2, 'Name must be at least 2 characters'),
	email: z.string().email('Invalid email address'),
	phone: z.string().min(10, 'Phone number must be at least 10 digits'),
	vehicleMake: z.string().min(2, 'Vehicle make is required'),
	vehicleModel: z.string().min(1, 'Vehicle model is required'),
	vehicleYear: z.string().min(4, 'Vehicle year is required'),
	pickupLocation: z.string().min(2, 'Pickup location is required'),
	destinationProvince: z.string().min(2, 'Destination province is required'),
	additionalNotes: z.string().optional(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

const fieldClassName = 'w-full rounded-lg border bg-[var(--panel)] px-4 py-3 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-gold)] focus:ring-4 focus:ring-[rgba(var(--accent-gold-rgb),0.16)]';
const labelClassName = 'mb-2 block text-sm font-black uppercase text-[var(--text-secondary)]';

export default function QuoteFormSection() {
	const didApplyCalculatorPrefill = useRef(false);
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState('');

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		reset,
	} = useForm<QuoteFormData>({
		resolver: zodResolver(quoteSchema),
	});

	useEffect(() => {
		if (didApplyCalculatorPrefill.current) return;
		if (typeof window === 'undefined') return;

		const params = new URLSearchParams(window.location.search);
		const pickupState = params.get('pickupState');
		const pickupStateName = params.get('pickupStateName');
		const destinationProvince = params.get('destinationProvince');
		const vehicleType = params.get('vehicleType');
		const estimateLow = params.get('estimateLow');
		const estimateHigh = params.get('estimateHigh');
		if (!pickupState && !destinationProvince && !vehicleType) return;

		didApplyCalculatorPrefill.current = true;
		reset({
			fullName: '',
			email: '',
			phone: '',
			vehicleMake: '',
			vehicleModel: '',
			vehicleYear: '',
			pickupLocation: pickupStateName && pickupState ? `${pickupStateName} (${pickupState})` : pickupStateName || pickupState || '',
			destinationProvince: destinationProvince || '',
			additionalNotes: [
				vehicleType ? `Calculator vehicle type: ${vehicleType}` : '',
				estimateLow && estimateHigh ? `Calculator estimate range: $${Number(estimateLow).toLocaleString()} - $${Number(estimateHigh).toLocaleString()}` : '',
			].filter(Boolean).join('\n'),
		});
	}, [reset]);

	const onSubmit = async (data: QuoteFormData) => {
		setError('');
		try {
			const message = [
				`Vehicle Make: ${data.vehicleMake}`,
				`Vehicle Model: ${data.vehicleModel}`,
				`Vehicle Year: ${data.vehicleYear}`,
				`Pickup Location: ${data.pickupLocation}`,
				`Destination Province: ${data.destinationProvince}`,
				`Additional Notes: ${data.additionalNotes?.trim() || 'None provided'}`,
			].join('\n');

			const response = await fetch('/api/quotes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: data.fullName,
					email: data.email,
					phone: data.phone,
					message,
				}),
			});

			if (response.ok) {
				setSubmitted(true);
				setTimeout(() => {
					setSubmitted(false);
					reset();
				}, 4000);
			} else {
				setError('Failed to submit quote. Please try again.');
			}
		} catch (error) {
			console.error('Error submitting quote:', error);
			setError('Network error. Please check your connection and try again.');
		}
	};

	return (
		<section id="quote" className="relative overflow-hidden bg-[var(--background)] py-20 text-[var(--text-primary)] sm:py-24">
			<div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
					<motion.div
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: '-80px' }}
						transition={{ duration: 0.6 }}
						className="lg:sticky lg:top-28"
					>
						<p className="text-sm font-bold uppercase text-[var(--accent-gold)]">Free quote</p>
						<h2 className="mt-4 max-w-xl text-4xl font-black leading-tight text-[var(--text-primary)] sm:text-5xl">
							Start with the exact lane, vehicle, and destination.
						</h2>
						<p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
							Send your shipment details and the JACXI team will review route options, documents, timing, and next steps.
						</p>

						<div className="mt-8 grid gap-3">
							{[
								{ icon: Clock, title: '24-hour response', detail: 'A real coordinator reviews your details.' },
								{ icon: ShieldCheck, title: 'No obligation', detail: 'Use the quote to plan before committing.' },
								{ icon: FileText, title: 'Document guidance', detail: 'We flag title and customs requirements early.' },
							].map((item) => {
								const Icon = item.icon;
								return (
									<div key={item.title} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
										<div className="flex gap-3">
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
												<Icon className="h-5 w-5" />
											</div>
											<div>
												<p className="font-black text-[var(--text-primary)]">{item.title}</p>
												<p className="mt-1 text-sm text-[var(--text-secondary)]">{item.detail}</p>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: '-80px' }}
						transition={{ duration: 0.6, delay: 0.08 }}
						className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] shadow-[0_24px_80px_rgba(var(--text-primary-rgb),0.10)]"
					>
						<div className="border-b border-[var(--border)] bg-[var(--background)] p-5 sm:p-6">
							<div className="flex items-center gap-3">
								<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]">
									<Car className="h-5 w-5" />
								</div>
								<div>
									<h3 className="text-xl font-black text-[var(--text-primary)]">Vehicle quote request</h3>
									<p className="mt-1 text-sm text-[var(--text-secondary)]">USA / Canada to Afghanistan route planning</p>
								</div>
							</div>
						</div>

						<div className="p-5 sm:p-6 lg:p-8">
							{submitted ? (
								<div className="py-16 text-center" role="alert" aria-live="polite">
									<CheckCircle className="mx-auto mb-4 h-16 w-16 text-[var(--success)]" aria-hidden="true" />
									<h3 className="text-2xl font-black text-[var(--text-primary)]">Quote request submitted</h3>
									<p className="mx-auto mt-3 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
										We&apos;ll review your route and contact you within 24 hours with the next steps.
									</p>
								</div>
							) : (
								<form
									onSubmit={handleSubmit(onSubmit)}
									className="space-y-5"
									noValidate
									aria-label="Quote request form"
								>
									<div className="grid gap-5 md:grid-cols-2">
										<div>
											<label htmlFor="fullName" className={labelClassName}>
												Full name <span className="text-[var(--error)]" aria-label="required">*</span>
											</label>
											<input
												id="fullName"
												{...register('fullName')}
												placeholder="John Doe"
												autoComplete="name"
												inputMode="text"
												aria-required="true"
												aria-invalid={errors.fullName ? 'true' : 'false'}
												aria-describedby={errors.fullName ? 'fullName-error' : undefined}
												className={`${fieldClassName} ${errors.fullName ? 'border-[var(--error)]' : 'border-[var(--border)]'}`}
											/>
											{errors.fullName && (
												<p id="fullName-error" className="mt-2 text-sm text-[var(--error)]" role="alert">
													{errors.fullName.message}
												</p>
											)}
										</div>

										<div>
											<label htmlFor="email" className={labelClassName}>
												Email address <span className="text-[var(--error)]" aria-label="required">*</span>
											</label>
											<input
												id="email"
												type="email"
												{...register('email')}
												placeholder="john@example.com"
												autoComplete="email"
												inputMode="email"
												aria-required="true"
												aria-invalid={errors.email ? 'true' : 'false'}
												aria-describedby={errors.email ? 'email-error' : undefined}
												className={`${fieldClassName} ${errors.email ? 'border-[var(--error)]' : 'border-[var(--border)]'}`}
											/>
											{errors.email && (
												<p id="email-error" className="mt-2 text-sm text-[var(--error)]" role="alert">
													{errors.email.message}
												</p>
											)}
										</div>
									</div>

									<div className="grid gap-5 md:grid-cols-2">
										<div>
											<label htmlFor="phone" className={labelClassName}>
												Phone number <span className="text-[var(--error)]" aria-label="required">*</span>
											</label>
											<input
												id="phone"
												type="tel"
												{...register('phone')}
												placeholder="+1 (555) 123-4567"
												autoComplete="tel"
												inputMode="tel"
												aria-required="true"
												aria-invalid={errors.phone ? 'true' : 'false'}
												aria-describedby={errors.phone ? 'phone-error' : undefined}
												className={`${fieldClassName} ${errors.phone ? 'border-[var(--error)]' : 'border-[var(--border)]'}`}
											/>
											{errors.phone && (
												<p id="phone-error" className="mt-2 text-sm text-[var(--error)]" role="alert">
													{errors.phone.message}
												</p>
											)}
										</div>
										<div>
											<label htmlFor="vehicleYear" className={labelClassName}>
												Vehicle year <span className="text-[var(--error)]" aria-label="required">*</span>
											</label>
											<input
												id="vehicleYear"
												{...register('vehicleYear')}
												placeholder="2020"
												inputMode="numeric"
												aria-required="true"
												aria-invalid={errors.vehicleYear ? 'true' : 'false'}
												className={`${fieldClassName} ${errors.vehicleYear ? 'border-[var(--error)]' : 'border-[var(--border)]'}`}
											/>
											{errors.vehicleYear && <p className="mt-2 text-sm text-[var(--error)]">{errors.vehicleYear.message}</p>}
										</div>
									</div>

									<div className="grid gap-5 md:grid-cols-2">
										<div>
											<label htmlFor="vehicleMake" className={labelClassName}>
												Vehicle make <span className="text-[var(--error)]" aria-label="required">*</span>
											</label>
											<input
												id="vehicleMake"
												{...register('vehicleMake')}
												placeholder="Toyota"
												className={`${fieldClassName} ${errors.vehicleMake ? 'border-[var(--error)]' : 'border-[var(--border)]'}`}
											/>
											{errors.vehicleMake && <p className="mt-2 text-sm text-[var(--error)]">{errors.vehicleMake.message}</p>}
										</div>
										<div>
											<label htmlFor="vehicleModel" className={labelClassName}>
												Vehicle model <span className="text-[var(--error)]" aria-label="required">*</span>
											</label>
											<input
												id="vehicleModel"
												{...register('vehicleModel')}
												placeholder="Land Cruiser"
												className={`${fieldClassName} ${errors.vehicleModel ? 'border-[var(--error)]' : 'border-[var(--border)]'}`}
											/>
											{errors.vehicleModel && <p className="mt-2 text-sm text-[var(--error)]">{errors.vehicleModel.message}</p>}
										</div>
									</div>

									<div className="grid gap-5 md:grid-cols-2">
										<div>
											<label htmlFor="pickupLocation" className={labelClassName}>
												Pickup location <span className="text-[var(--error)]" aria-label="required">*</span>
											</label>
											<input
												id="pickupLocation"
												{...register('pickupLocation')}
												placeholder="Houston, Texas"
												className={`${fieldClassName} ${errors.pickupLocation ? 'border-[var(--error)]' : 'border-[var(--border)]'}`}
											/>
											{errors.pickupLocation && <p className="mt-2 text-sm text-[var(--error)]">{errors.pickupLocation.message}</p>}
										</div>
										<div>
											<label htmlFor="destinationProvince" className={labelClassName}>
												Destination province <span className="text-[var(--error)]" aria-label="required">*</span>
											</label>
											<input
												id="destinationProvince"
												{...register('destinationProvince')}
												placeholder="Herat"
												className={`${fieldClassName} ${errors.destinationProvince ? 'border-[var(--error)]' : 'border-[var(--border)]'}`}
											/>
											{errors.destinationProvince && <p className="mt-2 text-sm text-[var(--error)]">{errors.destinationProvince.message}</p>}
										</div>
									</div>

									<div>
										<label htmlFor="additionalNotes" className={labelClassName}>
											Additional notes
										</label>
										<textarea
											id="additionalNotes"
											{...register('additionalNotes')}
											rows={6}
											placeholder="Tell us anything we should know about the shipment, timing, title status, or customs requirements..."
											className={`${fieldClassName} resize-none ${errors.additionalNotes ? 'border-[var(--error)]' : 'border-[var(--border)]'}`}
										/>
										{errors.additionalNotes && (
											<p id="additionalNotes-error" className="mt-2 text-sm text-[var(--error)]" role="alert">
												{errors.additionalNotes.message}
											</p>
										)}
									</div>

									{error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}

									<button
										type="submit"
										disabled={isSubmitting}
										aria-busy={isSubmitting}
										aria-label={isSubmitting ? 'Submitting quote request' : 'Submit quote request'}
										className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--accent-gold)] px-6 py-4 text-base font-black text-[var(--text-primary)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:opacity-60"
									>
										{isSubmitting ? (
											<span className="flex items-center justify-center">Submitting...</span>
										) : (
											<span className="flex items-center justify-center">
												Request my free quote
												<ArrowRight className="ml-2 h-5 w-5" />
											</span>
										)}
									</button>

									<p className="text-center text-sm text-[var(--text-secondary)]">We respond within 24 hours. No obligations.</p>
								</form>
							)}
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
