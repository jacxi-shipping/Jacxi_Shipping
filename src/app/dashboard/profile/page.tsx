'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Box, Avatar, Divider } from '@mui/material';
import {
	User,
	Mail,
	Phone,
	MapPin,
	Shield,
	Calendar,
	Save,
	RotateCcw,
	Image as ImageIcon,
} from 'lucide-react';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, Breadcrumbs, toast, EmptyState, StatsCard, DashboardPageSkeleton, FormField } from '@/components/design-system';

type ProfileFormState = {
	name: string;
	phone: string;
	address: string;
	city: string;
	country: string;
	image: string;
};

type ProfileResponse = {
	user: {
		id: string;
		name: string | null;
		email: string;
		image: string | null;
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
	image: '',
};

export default function ProfilePage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [profile, setProfile] = useState<ProfileResponse['user'] | null>(null);
	const [form, setForm] = useState<ProfileFormState>(initialFormState);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

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
					image: payload.user.image ?? '',
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unable to fetch profile information';
				toast.error(message);
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
				image: payload.user.image ?? '',
			});
			toast.success('Profile updated successfully');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'An unexpected error occurred';
			toast.error(message);
		} finally {
			setSaving(false);
		}
	};

	const handleReset = () => {
		if (!profile) return;
		setForm({
			name: profile.name ?? '',
			phone: profile.phone ?? '',
			address: profile.address ?? '',
			city: profile.city ?? '',
			country: profile.country ?? '',
			image: profile.image ?? '',
		});
		toast.info('Form reset to saved values');
	};

	if (status === 'loading' || loading) {
		return <DashboardPageSkeleton />;
	}

	if (!profile) {
		return (
			<DashboardSurface>
				<EmptyState
					icon={<User className="w-12 h-12" />}
					title="Profile Unavailable"
					description="We could not load your profile details at the moment."
				/>
			</DashboardSurface>
		);
	}

	const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	return (
		<DashboardSurface>
			{/* Breadcrumbs */}
			<Box sx={{ px: 2, pt: 2 }}>
				<Breadcrumbs />
			</Box>

			<PageHeader
				title="Profile"
				description="Manage your personal information and account settings"
			/>

			{/* Account Stats */}
			<Box sx={{ px: 2, mb: 3 }}>
				<DashboardGrid className="grid-cols-1 md:grid-cols-3">
					<StatsCard
						icon={<Mail style={{ fontSize: 18 }} />}
						title="Email"
						value={profile.email}
						variant="info"
						size="md"
					/>
					<StatsCard
						icon={<Shield style={{ fontSize: 18 }} />}
						title="Role"
						value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
						variant="success"
						size="md"
					/>
					<StatsCard
						icon={<Calendar style={{ fontSize: 18 }} />}
						title="Member Since"
						value={memberSince}
						variant="default"
						size="md"
					/>
				</DashboardGrid>
			</Box>

			<Box sx={{ px: 2, pb: 4 }}>
				<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
					{/* Main Profile Form */}
					<Box>
						<DashboardPanel
							title="Personal Information"
							description="Update your personal details and contact information"
						>
							<Box component="form" onSubmit={handleSubmit}>
								<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
									{/* Avatar Section */}
									<Box>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
											<Avatar
												sx={{
													width: 80,
													height: 80,
													bgcolor: 'var(--accent-gold)',
													fontSize: '2rem',
													fontWeight: 600,
												}}
												src={profile.image || undefined}
											>
												{(profile.name || profile.email)[0].toUpperCase()}
											</Avatar>
											<Box>
												<Box sx={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', mb: 0.5 }}>
													{profile.name || 'User'}
												</Box>
												<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
													{profile.email}
												</Box>
											</Box>
										</Box>
									</Box>

									<Divider sx={{ borderColor: 'var(--border)' }} />

									{/* Name & Phone */}
									<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
										<FormField
											label="Full Name"
											name="name"
											value={form.name}
											onChange={handleChange}
											placeholder="Enter your full name"
											leftIcon={<User className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>

										<FormField
											label="Phone Number"
											name="phone"
											value={form.phone}
											onChange={handleChange}
											placeholder="+1 (555) 123-4567"
											leftIcon={<Phone className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>
									</Box>

									{/* Address */}
									<Box>
										<FormField
											label="Address"
											name="address"
											value={form.address}
											onChange={handleChange}
											placeholder="123 Main Street"
											leftIcon={<MapPin className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>
									</Box>

									{/* City & Country */}
									<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
										<FormField
											label="City"
											name="city"
											value={form.city}
											onChange={handleChange}
											placeholder="New York"
											leftIcon={<MapPin className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>

										<FormField
											label="Country"
											name="country"
											value={form.country}
											onChange={handleChange}
											placeholder="United States"
											leftIcon={<MapPin className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>
									</Box>

									{/* Image URL */}
									<Box>
										<FormField
											label="Profile Image URL"
											name="image"
											value={form.image}
											onChange={handleChange}
											placeholder="https://example.com/image.jpg"
											leftIcon={<ImageIcon className="w-4 h-4 text-[var(--text-secondary)]" />}
										/>
									</Box>

									{/* Action Buttons */}
									<Box>
										<Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
											<Button
												type="button"
												variant="outline"
												size="sm"
												icon={<RotateCcw className="w-4 h-4" />}
												onClick={handleReset}
												disabled={saving}
											>
												Reset
											</Button>
											<Button
												type="submit"
												variant="primary"
												size="sm"
												icon={<Save className="w-4 h-4" />}
												disabled={saving}
											>
												{saving ? 'Saving...' : 'Save Changes'}
											</Button>
										</Box>
									</Box>
								</Box>
							</Box>
						</DashboardPanel>
					</Box>

					{/* Sidebar - Security Tips */}
					<Box>
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
							<DashboardPanel
								title="Security Tips"
								description="Keep your account safe"
							>
								<Box sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
									<ul style={{ listStyle: 'disc', paddingLeft: '1.25rem', margin: 0 }}>
										<li style={{ marginBottom: '0.5rem' }}>Use a strong, unique password</li>
										<li style={{ marginBottom: '0.5rem' }}>Enable two-factor authentication</li>
										<li style={{ marginBottom: '0.5rem' }}>Keep your contact info up to date</li>
										<li style={{ marginBottom: '0.5rem' }}>Review account activity regularly</li>
									</ul>
								</Box>
							</DashboardPanel>

							<DashboardPanel
								title="Account Info"
							>
								<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
									<Box>
										<Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>
											Account ID
										</Box>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
											{profile.id.slice(0, 8)}...
										</Box>
									</Box>
									<Divider sx={{ borderColor: 'var(--border)' }} />
									<Box>
										<Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mb: 0.5 }}>
											Last Updated
										</Box>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
											{new Date(profile.updatedAt).toLocaleDateString()}
										</Box>
									</Box>
								</Box>
							</DashboardPanel>
						</Box>
					</Box>
				</Box>
			</Box>
		</DashboardSurface>
	);
}
