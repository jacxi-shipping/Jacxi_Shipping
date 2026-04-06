'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, CheckCircle } from 'lucide-react';

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

export default function QuoteFormSection() {
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

	const onSubmit = async (data: QuoteFormData) => {
		setError('');
		try {
			const message = [
				`Vehicle Make: ${data.vehicleMake}`,
				`Vehicle Model: ${data.vehicleModel}`,
				`Vehicle Year: ${data.vehicleYear}`,
				`Pickup Location (US): ${data.pickupLocation}`,
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
		<section id="quote" className="bg-[var(--background)] py-28">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<div className="mb-12 text-center">
					<p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-[var(--accent-gold)]">Free Quote</p>
					<h2 className="text-3xl font-bold tracking-[-0.03em] text-gray-900 sm:text-4xl lg:text-[3.2rem]">Get Your Free Quote</h2>
					<p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-gray-600">
						Fill out the form below and we&apos;ll get back to you within 24 hours.
					</p>
				</div>

				<div className="mx-auto max-w-5xl rounded-[2rem] border border-[var(--border)] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8 md:p-12">
							{submitted ? (
								<div className="py-16 text-center" role="alert" aria-live="polite">
									<CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" aria-hidden="true" />
									<h3 className="text-2xl font-bold text-gray-900">Quote Request Submitted!</h3>
									<p className="mx-auto mt-3 max-w-xl text-base text-gray-600 sm:text-lg">
										We&apos;ll review your route and contact you within 24 hours with the next steps.
									</p>
								</div>
							) : (
								<form 
									onSubmit={handleSubmit(onSubmit)} 
									className="space-y-6"
									noValidate
									aria-label="Quote request form"
								>
									<div className="grid gap-6 md:grid-cols-2">
										<div>
												<label 
													htmlFor="fullName" 
													className="mb-2 block text-sm font-medium uppercase tracking-[0.08em] text-gray-700"
												>
													Full Name <span className="text-red-500" aria-label="required">*</span>
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
													className={`w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors ${
														errors.fullName ? 'border-red-500' : 'border-gray-300'
													} focus:border-[#0f172a]`}
												/>
												{errors.fullName && (
													<p id="fullName-error" className="mt-2 text-sm text-red-500" role="alert">
														{errors.fullName.message}
													</p>
												)}
										</div>

										<div>
												<label 
													htmlFor="email" 
													className="mb-2 block text-sm font-medium uppercase tracking-[0.08em] text-gray-700"
												>
													Email Address <span className="text-red-500" aria-label="required">*</span>
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
													className={`w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors ${
														errors.email ? 'border-red-500' : 'border-gray-300'
													} focus:border-[#0f172a]`}
												/>
												{errors.email && (
													<p id="email-error" className="mt-2 text-sm text-red-500" role="alert">
														{errors.email.message}
													</p>
												)}
										</div>
									</div>

									<div className="grid gap-6 md:grid-cols-2">
										<div>
											<label 
												htmlFor="phone" 
												className="mb-2 block text-sm font-medium uppercase tracking-[0.08em] text-gray-700"
											>
												Phone Number <span className="text-red-500" aria-label="required">*</span>
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
												className={`w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors ${
													errors.phone ? 'border-red-500' : 'border-gray-300'
												} focus:border-[#0f172a]`}
											/>
											{errors.phone && (
													<p id="phone-error" className="mt-2 text-sm text-red-500" role="alert">
														{errors.phone.message}
													</p>
											)}
										</div>
										<div>
											<label htmlFor="vehicleYear" className="mb-2 block text-sm font-medium uppercase tracking-[0.08em] text-gray-700">
												Vehicle Year <span className="text-red-500" aria-label="required">*</span>
											</label>
											<input
												id="vehicleYear"
												{...register('vehicleYear')}
												placeholder="2020"
												inputMode="numeric"
												aria-required="true"
												aria-invalid={errors.vehicleYear ? 'true' : 'false'}
												className={`w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors focus:border-[#0f172a] ${errors.vehicleYear ? 'border-red-500' : 'border-gray-300'}`}
											/>
											{errors.vehicleYear && <p className="mt-2 text-sm text-red-500">{errors.vehicleYear.message}</p>}
										</div>
									</div>

									<div className="grid gap-6 md:grid-cols-2">
										<div>
											<label htmlFor="vehicleMake" className="mb-2 block text-sm font-medium uppercase tracking-[0.08em] text-gray-700">
												Vehicle Make <span className="text-red-500" aria-label="required">*</span>
											</label>
											<input
												id="vehicleMake"
												{...register('vehicleMake')}
												placeholder="Toyota"
												className={`w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors focus:border-[#0f172a] ${errors.vehicleMake ? 'border-red-500' : 'border-gray-300'}`}
											/>
											{errors.vehicleMake && <p className="mt-2 text-sm text-red-500">{errors.vehicleMake.message}</p>}
										</div>
										<div>
											<label htmlFor="vehicleModel" className="mb-2 block text-sm font-medium uppercase tracking-[0.08em] text-gray-700">
												Vehicle Model <span className="text-red-500" aria-label="required">*</span>
											</label>
											<input
												id="vehicleModel"
												{...register('vehicleModel')}
												placeholder="Land Cruiser"
												className={`w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors focus:border-[#0f172a] ${errors.vehicleModel ? 'border-red-500' : 'border-gray-300'}`}
											/>
											{errors.vehicleModel && <p className="mt-2 text-sm text-red-500">{errors.vehicleModel.message}</p>}
										</div>
									</div>

									<div className="grid gap-6 md:grid-cols-2">
										<div>
											<label htmlFor="pickupLocation" className="mb-2 block text-sm font-medium uppercase tracking-[0.08em] text-gray-700">
												Pickup Location (US) <span className="text-red-500" aria-label="required">*</span>
											</label>
											<input
												id="pickupLocation"
												{...register('pickupLocation')}
												placeholder="Houston, Texas"
												className={`w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors focus:border-[#0f172a] ${errors.pickupLocation ? 'border-red-500' : 'border-gray-300'}`}
											/>
											{errors.pickupLocation && <p className="mt-2 text-sm text-red-500">{errors.pickupLocation.message}</p>}
										</div>
										<div>
											<label htmlFor="destinationProvince" className="mb-2 block text-sm font-medium uppercase tracking-[0.08em] text-gray-700">
												Destination Province <span className="text-red-500" aria-label="required">*</span>
											</label>
											<input
												id="destinationProvince"
												{...register('destinationProvince')}
												placeholder="Herat"
												className={`w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors focus:border-[#0f172a] ${errors.destinationProvince ? 'border-red-500' : 'border-gray-300'}`}
											/>
											{errors.destinationProvince && <p className="mt-2 text-sm text-red-500">{errors.destinationProvince.message}</p>}
										</div>
									</div>

									<div>
											<label 
													htmlFor="additionalNotes" 
												className="mb-2 block text-sm font-medium uppercase tracking-[0.08em] text-gray-700"
											>
													Additional Notes
											</label>
											<textarea
													id="additionalNotes"
													{...register('additionalNotes')}
												rows={6}
													placeholder="Tell us anything we should know about the shipment, route timing, or customs requirements..."
												className={`w-full resize-none rounded-xl border px-4 py-3 text-base outline-none transition-colors ${
														errors.additionalNotes ? 'border-red-500' : 'border-gray-300'
												} focus:border-[#0f172a]`}
											/>
												{errors.additionalNotes && (
													<p id="additionalNotes-error" className="mt-2 text-sm text-red-500" role="alert">
														{errors.additionalNotes.message}
													</p>
											)}
									</div>

									{error ? <p className="text-sm text-red-600">{error}</p> : null}

										<button
											type="submit"
											disabled={isSubmitting}
											aria-busy={isSubmitting}
											aria-label={isSubmitting ? "Submitting quote request" : "Submit quote request"}
											className="inline-flex w-full items-center justify-center rounded-xl bg-[#0f172a] px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
										>
											{isSubmitting ? (
												<span className="flex items-center justify-center">Submitting...</span>
											) : (
												<span className="flex items-center justify-center">
													Request My Free Quote
													<ArrowRight className="ml-2 h-5 w-5" />
												</span>
											)}
										</button>

										<p className="text-center text-sm text-gray-500">We respond within 24 hours. No obligations.</p>
								</form>
							)}
				</div>
			</div>
		</section>
	);
}
