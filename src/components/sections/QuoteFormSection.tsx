'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Fade, Slide, Zoom, Grow, Box, CircularProgress } from '@mui/material';

const quoteSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters'),
	email: z.string().email('Invalid email address'),
	phone: z.string().min(10, 'Phone number must be at least 10 digits'),
	message: z.string().min(10, 'Message must be at least 10 characters'),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

export default function QuoteFormSection() {
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState('');
	const show = true;

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
			const response = await fetch('/api/quotes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(data),
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
		<section id="quote" className="py-24 bg-gradient-to-br from-gray-50 to-blue-50/30">
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
				<Fade in={show} timeout={800}>
					<Box className="text-center mb-12">
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
							Get Your <span className="text-[rgb(var(--jacxi-blue))]">Instant Quote</span>
						</h2>
						<p className="text-lg sm:text-xl text-gray-600">
							Fill out the form below and we&apos;ll get back to you within 24 hours
						</p>
					</Box>
				</Fade>

				<Slide in={show} direction="up" timeout={800}>
					<Box>
						<div className="bg-white border-2 border-gray-200 rounded-2xl sm:rounded-3xl shadow-2xl hover:shadow-3xl p-6 sm:p-8 md:p-12 transition-all duration-300">
							{submitted ? (
								<Zoom in={submitted} timeout={600}>
									<Box className="text-center py-12" role="alert" aria-live="polite">
										<Zoom in={submitted} timeout={400} style={{ transitionDelay: '200ms' }}>
											<CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-green-500 mx-auto mb-4" aria-hidden="true" />
										</Zoom>
										<Fade in={submitted} timeout={600} style={{ transitionDelay: '400ms' }}>
											<h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
												Quote Request Submitted!
											</h3>
										</Fade>
										<Fade in={submitted} timeout={600} style={{ transitionDelay: '600ms' }}>
											<p className="text-base sm:text-lg text-gray-600">
												We&apos;ll contact you within 24 hours with your personalized quote.
											</p>
										</Fade>
									</Box>
								</Zoom>
							) : (
								<form 
									onSubmit={handleSubmit(onSubmit)} 
									className="space-y-5 sm:space-y-6"
									noValidate
									aria-label="Quote request form"
								>
									<div className="grid md:grid-cols-2 gap-6">
										{/* Name */}
										<Fade in={show} timeout={600} style={{ transitionDelay: '200ms' }}>
											<Box>
												<label 
													htmlFor="name" 
													className="block text-sm sm:text-base font-medium text-gray-700 mb-2"
												>
													Full Name <span className="text-red-500" aria-label="required">*</span>
												</label>
												<Input
													id="name"
													{...register('name')}
													placeholder="John Doe"
													autoComplete="name"
													inputMode="text"
													aria-required="true"
													aria-invalid={errors.name ? 'true' : 'false'}
													aria-describedby={errors.name ? 'name-error' : undefined}
													className={`w-full px-4 py-3 sm:py-4 text-base rounded-xl border ${
														errors.name ? 'border-red-500 shake' : 'border-gray-300'
													} placeholder:text-gray-400 focus:border-[rgb(var(--jacxi-blue))] focus:ring-2 focus:ring-[rgb(var(--jacxi-blue))]/20 transition-all duration-200 touch-manipulation`}
												/>
												{errors.name && (
													<Slide in={!!errors.name} direction="right" timeout={300}>
														<p id="name-error" className="mt-2 text-sm text-red-500" role="alert">
															{errors.name.message}
														</p>
													</Slide>
												)}
											</Box>
										</Fade>

										{/* Email */}
										<Fade in={show} timeout={600} style={{ transitionDelay: '300ms' }}>
											<Box>
												<label 
													htmlFor="email" 
													className="block text-sm sm:text-base font-medium text-gray-700 mb-2"
												>
													Email Address <span className="text-red-500" aria-label="required">*</span>
												</label>
												<Input
													id="email"
													type="email"
													{...register('email')}
													placeholder="john@example.com"
													autoComplete="email"
													inputMode="email"
													aria-required="true"
													aria-invalid={errors.email ? 'true' : 'false'}
													aria-describedby={errors.email ? 'email-error' : undefined}
													className={`w-full px-4 py-3 sm:py-4 text-base rounded-xl border ${
														errors.email ? 'border-red-500 shake' : 'border-gray-300'
													} placeholder:text-gray-400 focus:border-[rgb(var(--jacxi-blue))] focus:ring-2 focus:ring-[rgb(var(--jacxi-blue))]/20 transition-all duration-200 touch-manipulation`}
												/>
												{errors.email && (
													<Slide in={!!errors.email} direction="right" timeout={300}>
														<p id="email-error" className="mt-2 text-sm text-red-500" role="alert">
															{errors.email.message}
														</p>
													</Slide>
												)}
											</Box>
										</Fade>
									</div>

									{/* Phone - Full Width */}
									<Fade in={show} timeout={600} style={{ transitionDelay: '400ms' }}>
										<Box>
											<label 
												htmlFor="phone" 
												className="block text-sm sm:text-base font-medium text-gray-700 mb-2"
											>
												Phone Number <span className="text-red-500" aria-label="required">*</span>
											</label>
											<Input
												id="phone"
												type="tel"
												{...register('phone')}
												placeholder="+1 (555) 123-4567"
												autoComplete="tel"
												inputMode="tel"
												aria-required="true"
												aria-invalid={errors.phone ? 'true' : 'false'}
												aria-describedby={errors.phone ? 'phone-error' : undefined}
												className={`w-full px-4 py-3 sm:py-4 text-base rounded-xl border ${
													errors.phone ? 'border-red-500 shake' : 'border-gray-300'
												} placeholder:text-gray-400 focus:border-[rgb(var(--jacxi-blue))] focus:ring-2 focus:ring-[rgb(var(--jacxi-blue))]/20 transition-all duration-200 touch-manipulation`}
											/>
											{errors.phone && (
												<Slide in={!!errors.phone} direction="right" timeout={300}>
													<p id="phone-error" className="mt-2 text-sm text-red-500" role="alert">
														{errors.phone.message}
													</p>
												</Slide>
											)}
										</Box>
									</Fade>

									{/* Message Box */}
									<Fade in={show} timeout={600} style={{ transitionDelay: '500ms' }}>
										<Box>
											<label 
												htmlFor="message" 
												className="block text-sm sm:text-base font-medium text-gray-700 mb-2"
											>
												Your Message <span className="text-red-500" aria-label="required">*</span>
											</label>
											<textarea
												id="message"
												{...register('message')}
												rows={6}
												placeholder="Tell us about your vehicle, pickup location, destination, and any special requirements..."
												aria-required="true"
												aria-invalid={errors.message ? 'true' : 'false'}
												aria-describedby={errors.message ? 'message-error' : undefined}
												className={`w-full px-4 py-3 sm:py-4 text-base rounded-xl border ${
													errors.message ? 'border-red-500 shake' : 'border-gray-300'
												} placeholder:text-gray-400 focus:border-[rgb(var(--jacxi-blue))] focus:ring-2 focus:ring-[rgb(var(--jacxi-blue))]/20 resize-none transition-all duration-200 touch-manipulation`}
											/>
											{errors.message && (
												<Slide in={!!errors.message} direction="right" timeout={300}>
													<p id="message-error" className="mt-2 text-sm text-red-500" role="alert">
														{errors.message.message}
													</p>
												</Slide>
											)}
										</Box>
									</Fade>

									{/* Error Message */}
									{error && (
										<Grow in={!!error} timeout={400}>
											<Box className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm sm:text-base flex items-center gap-2" role="alert" aria-live="assertive">
												<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
												{error}
											</Box>
										</Grow>
									)}

									{/* Submit Button */}
									<Grow in={show} timeout={600} style={{ transitionDelay: '600ms' }}>
										<Button
											type="submit"
											disabled={isSubmitting}
											aria-busy={isSubmitting}
											aria-label={isSubmitting ? "Submitting quote request" : "Submit quote request"}
											className="w-full bg-[rgb(var(--jacxi-blue))] hover:bg-[rgb(var(--jacxi-blue))]/90 text-white px-6 sm:px-8 py-4 sm:py-5 text-base sm:text-lg rounded-xl shadow-xl shadow-[rgb(var(--jacxi-blue))]/30 hover:shadow-2xl hover:shadow-[rgb(var(--jacxi-blue))]/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group touch-manipulation"
										>
											{isSubmitting ? (
												<span className="flex items-center justify-center">
													<CircularProgress size={20} sx={{ color: 'var(--background)', mr: 1 }} />
													Submitting...
												</span>
											) : (
												<span className="flex items-center justify-center">
													Get My Quote
													<Send className="ml-2 w-5 h-5" />
												</span>
											)}
										</Button>
									</Grow>
								</form>
							)}
						</div>
					</Box>
				</Slide>
			</div>
		</section>
	);
}
