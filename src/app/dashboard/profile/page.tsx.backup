'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Section from '@/components/layout/Section';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
	ArrowLeft,
	Mail,
	Phone,
	ShieldCheck,
	User,
	MapPin,
	Loader2,
	CheckCircle2,
	AlertCircle,
} from 'lucide-react';

type ProfileFormState = {
	name: string;
	phone: string;
	address: string;
	city: string;
	country: string;
};

type ProfileResponse = {
	user: {
		id: string;
		name: string | null;
		email: string;
		role: string;
		phone: string | null;
		address: string | null;
		city: string | null;
		country: string | null;
		createdAt: string;
		updatedAt: string;
	};
};

const initialFormState: ProfileFormState = {
	name: '',
	phone: '',
	address: '',
	city: '',
	country: '',
};

const accountInfoItems = (user: ProfileResponse['user']) => [
	{ label: 'Email', icon: Mail, value: user.email },
	{
		label: 'Role',
		icon: ShieldCheck,
		value: user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase(),
	},
	{ label: 'Joined', icon: User, value: new Date(user.createdAt).toLocaleDateString() },
];

const personalInfoFields = (form: ProfileFormState) => [
	{ label: 'Phone', name: 'phone', placeholder: '+971 55 123 4567', value: form.phone, icon: Phone, type: 'tel' as const },
	{ label: 'Address', name: 'address', placeholder: 'Warehouse 5, Al Quoz', value: form.address, icon: MapPin, type: 'text' as const },
	{ label: 'City', name: 'city', placeholder: 'Dubai', value: form.city, icon: MapPin, type: 'text' as const },
	{ label: 'Country', name: 'country', placeholder: 'United Arab Emirates', value: form.country, icon: MapPin, type: 'text' as const },
];

export default function ProfilePage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [profile, setProfile] = useState<ProfileResponse['user'] | null>(null);
	const [form, setForm] = useState<ProfileFormState>(initialFormState);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [serverMessage, setServerMessage] = useState<string | null>(null);
	const [serverError, setServerError] = useState<string | null>(null);

	useEffect(() => {
		if (status === 'loading') return;
		if (!session) {
			router.replace('/auth/signin?callbackUrl=/dashboard/profile');
			return;
		}

		const fetchProfile = async () => {
			try {
				setLoading(true);
				const response = await fetch('/api/profile', { cache: 'no-store' });
				const payload = (await response.json()) as ProfileResponse & { message?: string };
				if (!response.ok || !payload.user) {
					throw new Error(payload.message ?? 'Failed to load profile');
				}

				setProfile(payload.user);
				setForm({
					name: payload.user.name ?? '',
					phone: payload.user.phone ?? '',
					address: payload.user.address ?? '',
					city: payload.user.city ?? '',
					country: payload.user.country ?? '',
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unable to fetch profile information';
				setServerError(message);
			} finally {
				setLoading(false);
			}
		};

		fetchProfile();
	}, [session, status, router]);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.target;
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!profile) return;

		setSaving(true);
		setServerMessage(null);
		setServerError(null);

		try {
			const response = await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form),
			});

			const payload = (await response.json()) as ProfileResponse & { message?: string };

			if (!response.ok || !payload.user) {
				throw new Error(payload.message ?? 'Failed to update profile');
			}

			setProfile(payload.user);
			setForm({
				name: payload.user.name ?? '',
				phone: payload.user.phone ?? '',
				address: payload.user.address ?? '',
				city: payload.user.city ?? '',
				country: payload.user.country ?? '',
			});
			setServerMessage('Profile updated successfully');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'An unexpected error occurred';
			setServerError(message);
		} finally {
			setSaving(false);
		}
	};

	if (status === 'loading' || loading) {
		return (
			<Section className="min-h-screen bg-[var(--text-primary)] flex items-center justify-center">
				<div className="text-center space-y-4 text-white/70">
					<div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/30 border-t-cyan-400" />
					<p>Loading your profile...</p>
				</div>
			</Section>
		);
	}

	if (!profile) {
		return (
			<Section className="min-h-screen bg-[var(--text-primary)] flex items-center justify-center">
				<div className="max-w-md space-y-4 text-center">
					<h2 className="text-xl font-semibold text-white">Profile unavailable</h2>
					<p className="text-white/70">{serverError || 'We could not load your profile details at the moment.'}</p>
				</div>
			</Section>
		);
	}

	const accountInfo = accountInfoItems(profile);
	const personalFields = personalInfoFields(form);

	return (
		<div className="min-h-screen bg-[var(--text-primary)]">
			<div className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--text-primary)] via-[var(--text-primary)] to-[var(--text-primary)]" />
			<div className="absolute inset-0 -z-10 opacity-[0.04]">
				<svg className="h-full w-full" preserveAspectRatio="none">
					<pattern id="profile-grid" width="32" height="32" patternUnits="userSpaceOnUse">
						<path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
					</pattern>
					<rect width="100%" height="100%" fill="url(#profile-grid)" />
				</svg>
			</div>

			<Section className="pb-4 pt-6">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<Link href="/dashboard">
							<Button variant="outline" size="sm" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10">
								<ArrowLeft className="w-4 h-4 mr-2" />
								Dashboard
							</Button>
						</Link>
						<div>
							<h1 className="text-2xl sm:text-3xl font-semibold text-white">Profile</h1>
							<p className="text-white/60 text-sm">Manage your personal information and account security.</p>
						</div>
					</div>
					<Button variant="outline" size="sm" className="border-white/20 text-white/70 hover:bg-white/10" disabled>
						Manage Passwords
					</Button>
				</div>
			</Section>

			<Section className="pb-16">
				<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
					<motion.div
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4 }}
						className="space-y-6 xl:col-span-2"
					>
						<Card className="border-white/10 bg-white/[0.03] backdrop-blur-sm">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-white text-lg">
									<User className="h-5 w-5 text-cyan-300" />
									Account Overview
								</CardTitle>
							</CardHeader>
							<CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
								{accountInfo.map(({ label, icon: Icon, value }) => (
									<div key={label} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
										<div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50">
											<Icon className="h-4 w-4 text-cyan-300" />
											<span>{label}</span>
										</div>
										<p className="text-sm text-white/80">{value}</p>
									</div>
								))}
							</CardContent>
						</Card>

						<Card className="border-white/10 bg-white/[0.03] backdrop-blur-sm">
							<CardHeader>
								<CardTitle className="text-white text-lg">Personal Details</CardTitle>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleSubmit} className="space-y-6">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div className="space-y-2">
											<label htmlFor="name" className="text-sm font-medium text-white/70">Full Name</label>
											<input
												type="text"
												id="name"
												name="name"
												value={form.name}
												onChange={handleChange}
												placeholder="Sara Al Mansouri"
												className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
											/>
										</div>
										{personalFields.map(({ label, name, placeholder, value, icon: Icon, type }) => (
											<div key={name} className="space-y-2">
												<label htmlFor={name} className="text-sm font-medium text-white/70">{label}</label>
												<div className="relative">
													<Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
													<input
														type={type}
														id={name}
														name={name}
														value={value}
														onChange={handleChange}
														placeholder={placeholder}
														className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 pl-9 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
													/>
												</div>
											</div>
										))}
									</div>

									{serverMessage && (
										<div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
											<CheckCircle2 className="h-4 w-4" />
											<span>{serverMessage}</span>
										</div>
									)}
									{serverError && (
										<div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
											<AlertCircle className="h-4 w-4" />
											<span>{serverError}</span>
										</div>
									)}

									<div className="flex justify-end gap-3">
										<Button
											type="button"
											variant="outline"
											onClick={() => {
												setForm({
													name: profile.name ?? '',
													phone: profile.phone ?? '',
													address: profile.address ?? '',
													city: profile.city ?? '',
													country: profile.country ?? '',
												});
												setServerMessage(null);
												setServerError(null);
											}}
											className="border-white/20 text-white/70 hover:bg-white/10"
										>
											Reset
										</Button>
										<Button
											type="submit"
											disabled={saving}
											className="bg-[var(--accent-gold)] text-white hover:bg-[var(--accent-gold)] shadow-cyan-500/30"
										>
											{saving ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin mr-2" />
													Saving...
												</>
											) : (
												'Update Profile'
											)}
										</Button>
									</div>
								</form>
							</CardContent>
						</Card>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, delay: 0.1 }}
						className="space-y-6"
					>
						<Card className="border-white/10 bg-white/[0.03] backdrop-blur-sm">
							<CardHeader>
								<CardTitle className="text-white text-lg">Security Tips</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 text-sm text-white/70">
								<p>Protect your account by keeping your email secure and enabling two-factor authentication when available.</p>
								<p>If you suspect unusual activity, reach out to support immediately.</p>
							</CardContent>
						</Card>

						<Card className="border-white/10 bg-white/[0.03] backdrop-blur-sm">
							<CardHeader>
								<CardTitle className="text-white text-lg">Need Assistance?</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4 text-sm text-white/70">
								<p>Our support team is available to help with any account updates or security concerns.</p>
								<Button variant="outline" className="w-full border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10">
									Contact Support
								</Button>
							</CardContent>
						</Card>
					</motion.div>
				</div>
			</Section>
		</div>
	);
}
