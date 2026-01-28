'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, ArrowLeft, Bell, Palette, Shield, Activity, Sun, Moon, Database, RefreshCw, UploadCloud } from 'lucide-react';

import Section from '@/components/layout/Section';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const DEFAULT_SETTINGS = {
	theme: 'futuristic',
	accentColor: 'var(--accent-gold)',
	sidebarDensity: 'comfortable',
	animationsEnabled: true,
	notifyShipmentEmail: true,
	notifyShipmentPush: true,
	notifyPaymentEmail: true,
	notifyCriticalSms: false,
	twoFactorEnabled: false,
	language: 'en',
};

type ProfileData = {
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

type UserSettingsData = {
	theme: string;
	accentColor: string;
	sidebarDensity: string;
	animationsEnabled: boolean;
	notifyShipmentEmail: boolean;
	notifyShipmentPush: boolean;
	notifyPaymentEmail: boolean;
	notifyCriticalSms: boolean;
	twoFactorEnabled: boolean;
	language: string;
	createdAt: string;
	updatedAt: string;
};

type Message = {
	type: 'success' | 'error';
	text: string;
};

type BackupInfo = {
	lastBackupAt: string | null;
	backupPath: string | null;
};

type BackupState = {
	loading: boolean;
	running: boolean;
	lastMessage: Message | null;
	info: BackupInfo | null;
};

const accentOptions = ['var(--accent-gold)', 'var(--accent-gold)', 'var(--accent-gold)', 'var(--accent-gold)', 'var(--accent-gold)', 'var(--accent-gold)'];
const themeOptions: Array<{ value: string; label: string; icon: React.ReactNode }> = [
	{ value: 'futuristic', label: 'Futuristic Dark', icon: <Palette className="w-3.5 h-3.5" /> },
	{ value: 'dark', label: 'Classic Dark', icon: <Moon className="w-3.5 h-3.5" /> },
	{ value: 'light', label: 'Adaptive Light', icon: <Sun className="w-3.5 h-3.5" /> },
];

const inputStyle =
	'w-full rounded-lg border border-cyan-500/30 bg-[var(--text-primary)] px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent';
const selectStyle =
	'w-full rounded-lg border border-cyan-500/30 bg-[var(--text-primary)] px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-transparent';

const formatRelativeTime = (value?: string | null) => {
	if (!value) return 'Just now';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Just now';
	const diffMs = Date.now() - date.getTime();
	const minutes = Math.round(diffMs / 60000);
	if (minutes <= 1) return 'Just now';
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours} hr ago`;
	const days = Math.round(hours / 24);
	if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
	return date.toLocaleDateString();
};

export default function SettingsPage() {
	const { data: session, status } = useSession();
	const router = useRouter();

	const [mounted, setMounted] = useState(false);
	const [profile, setProfile] = useState<ProfileData | null>(null);
	const [profileForm, setProfileForm] = useState({ name: '', phone: '', address: '', city: '', country: '' });
	const [settings, setSettings] = useState<UserSettingsData | null>(null);
	const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);
	const [backupState, setBackupState] = useState<BackupState>({
		loading: true,
		running: false,
		info: null,
		lastMessage: null,
	});
	const [backupFile, setBackupFile] = useState<File | null>(null);

	const [profileLoading, setProfileLoading] = useState(true);
	const [settingsLoading, setSettingsLoading] = useState(true);

	const [savingProfile, setSavingProfile] = useState(false);
	const [savingPreferences, setSavingPreferences] = useState(false);
	const [savingNotifications, setSavingNotifications] = useState(false);
	const [savingSecurity, setSavingSecurity] = useState(false);

	const [message, setMessage] = useState<Message | null>(null);

	const profileSectionRef = useRef<HTMLDivElement>(null);
	const preferencesSectionRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (status === 'loading') return;

		const role = session?.user?.role;
		if (!session || role !== 'admin') {
			router.replace('/dashboard');
			return;
		}

		setMounted(true);
	}, [session, status, router]);

	useEffect(() => {
		if (!mounted || status !== 'authenticated') return;

		const fetchProfile = async () => {
			try {
				setProfileLoading(true);
				const response = await fetch('/api/profile');
				if (!response.ok) throw new Error('Failed to load profile');
				const data = await response.json();
				const user: ProfileData = data.user;
				setProfile(user);
				setProfileForm({
					name: user.name ?? '',
					phone: user.phone ?? '',
					address: user.address ?? '',
					city: user.city ?? '',
					country: user.country ?? '',
				});
			} catch (error) {
				console.error(error);
				setMessage({ type: 'error', text: 'Unable to load profile data.' });
			} finally {
				setProfileLoading(false);
			}
		};

		const fetchSettings = async () => {
			try {
				setSettingsLoading(true);
				const response = await fetch('/api/settings');
				if (!response.ok) throw new Error('Failed to load settings');
				const data = await response.json();
				const values: UserSettingsData = data.settings;
				setSettings(values);
				setSettingsForm({
					theme: values.theme,
					accentColor: values.accentColor,
					sidebarDensity: values.sidebarDensity,
					animationsEnabled: values.animationsEnabled,
					notifyShipmentEmail: values.notifyShipmentEmail,
					notifyShipmentPush: values.notifyShipmentPush,
					notifyPaymentEmail: values.notifyPaymentEmail,
					notifyCriticalSms: values.notifyCriticalSms,
					twoFactorEnabled: values.twoFactorEnabled,
					language: values.language,
				});
			} catch (error) {
				console.error(error);
				setMessage({ type: 'error', text: 'Unable to load settings data.' });
			} finally {
				setSettingsLoading(false);
			}
		};

		const fetchBackupInfo = async () => {
			try {
				const response = await fetch('/api/settings/backup', { cache: 'no-store' });
				if (!response.ok) throw new Error('Failed to load backup info');
				const data = await response.json();
				setBackupState((prev) => ({
					...prev,
					info: {
						lastBackupAt: data.lastBackupAt ?? null,
						backupPath: data.backupPath ?? null,
					},
					loading: false,
				}));
			} catch (error) {
				console.error(error);
				setBackupState((prev) => ({ ...prev, loading: false, lastMessage: { type: 'error', text: 'Unable to load backup status.' } }));
			}
		};

		fetchProfile();
		fetchSettings();
		fetchBackupInfo();
	}, [mounted, status]);

	const showMessage = (msg: Message) => {
		setMessage(msg);
		setTimeout(() => setMessage(null), 4000);
	};

	const showBackupMessage = useCallback((msg: Message) => {
		setBackupState((prev) => ({ ...prev, lastMessage: msg }));
		setTimeout(() => setBackupState((prev) => ({ ...prev, lastMessage: null })), 5000);
	}, []);

	const handleProfileFieldChange = (field: keyof typeof profileForm, value: string) => {
		setProfileForm((prev) => ({ ...prev, [field]: value }));
	};

	const resetProfileForm = () => {
		if (!profile) return;
		setProfileForm({
			name: profile.name ?? '',
			phone: profile.phone ?? '',
			address: profile.address ?? '',
			city: profile.city ?? '',
			country: profile.country ?? '',
		});
	};

	const handleSaveProfile = async (event: React.FormEvent) => {
		event.preventDefault();
		setSavingProfile(true);
		try {
			const payload = {
				name: profileForm.name,
				phone: profileForm.phone,
				address: profileForm.address,
				city: profileForm.city,
				country: profileForm.country,
			};
			const response = await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!response.ok) throw new Error('Failed to update profile');
			const data = await response.json();
			setProfile(data.user);
			showMessage({ type: 'success', text: 'Profile updated successfully.' });
		} catch (error) {
			console.error(error);
			showMessage({ type: 'error', text: 'Unable to update profile. Please try again.' });
		} finally {
			setSavingProfile(false);
		}
	};

	const updateSettings = async (fields: Partial<typeof settingsForm>, successMessage: string) => {
		try {
			const response = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(fields),
			});
			if (!response.ok) throw new Error('Failed to update settings');
			const data = await response.json();
			const values: UserSettingsData = data.settings;
			setSettings(values);
			setSettingsForm({
				theme: values.theme,
				accentColor: values.accentColor,
				sidebarDensity: values.sidebarDensity,
				animationsEnabled: values.animationsEnabled,
				notifyShipmentEmail: values.notifyShipmentEmail,
				notifyShipmentPush: values.notifyShipmentPush,
				notifyPaymentEmail: values.notifyPaymentEmail,
				notifyCriticalSms: values.notifyCriticalSms,
				twoFactorEnabled: values.twoFactorEnabled,
				language: values.language,
			});
			showMessage({ type: 'success', text: successMessage });
		} catch (error) {
			console.error(error);
			showMessage({ type: 'error', text: 'Unable to update settings. Please try again.' });
		}
	};

	const handleSavePreferences = async (event: React.FormEvent) => {
		event.preventDefault();
		setSavingPreferences(true);
		await updateSettings(
			{
				theme: settingsForm.theme,
				accentColor: settingsForm.accentColor,
				sidebarDensity: settingsForm.sidebarDensity,
				animationsEnabled: settingsForm.animationsEnabled,
				language: settingsForm.language,
			},
			'Interface preferences saved.'
		);
		setSavingPreferences(false);
	};

	const handleSaveNotifications = async (event: React.FormEvent) => {
		event.preventDefault();
		setSavingNotifications(true);
		await updateSettings(
			{
				notifyShipmentEmail: settingsForm.notifyShipmentEmail,
				notifyShipmentPush: settingsForm.notifyShipmentPush,
				notifyPaymentEmail: settingsForm.notifyPaymentEmail,
				notifyCriticalSms: settingsForm.notifyCriticalSms,
			},
			'Notification preferences saved.'
		);
		setSavingNotifications(false);
	};

	const handleToggleTwoFactor = async () => {
		setSavingSecurity(true);
		await updateSettings(
			{ twoFactorEnabled: !settingsForm.twoFactorEnabled },
			settingsForm.twoFactorEnabled ? 'Two-factor authentication disabled.' : 'Two-factor authentication enabled.'
		);
		setSavingSecurity(false);
	};

	const handleResetPreferences = async () => {
		setSavingPreferences(true);
		setSettingsForm((prev) => ({ ...prev, ...DEFAULT_SETTINGS }));
		await updateSettings(DEFAULT_SETTINGS, 'Preferences reset to defaults.');
		setSavingPreferences(false);
	};

	const handleExportProfile = () => {
		if (!profile || !settings) return;
		const payload = {
			profile,
			settings,
			exportedAt: new Date().toISOString(),
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `jacxi-admin-settings-${profile.email.replace(/[^a-z0-9-]/gi, '_')}.json`;
		anchor.click();
		URL.revokeObjectURL(url);
		showMessage({ type: 'success', text: 'Profile exported as JSON.' });
	};

	const runBackupAction = async (action: 'backup' | 'restore', backupContent?: string) => {
		setBackupState((prev) => ({ ...prev, running: true, lastMessage: null }));
		try {
			const response = await fetch('/api/settings/backup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action, ...(action === 'restore' ? { backupContent } : {}) }),
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data?.message || `Failed to ${action} database.`);
			}
			setBackupState((prev) => ({
				...prev,
				info: {
					lastBackupAt: data.lastBackupAt ?? prev.info?.lastBackupAt ?? null,
					backupPath: data.backupPath ?? prev.info?.backupPath ?? null,
				},
				lastMessage: null,
			}));
			showBackupMessage({ type: 'success', text: data?.message || 'Backup operation completed.' });
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : `Unable to ${action} database.`;
			showBackupMessage({ type: 'error', text: message });
		} finally {
			setBackupState((prev) => ({ ...prev, running: false }));
		}
	};

	const handleCreateBackup = async () => {
		await runBackupAction('backup');
	};

	const handleBackupFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0] ?? null;
		setBackupFile(file);
	};

	const handleRestoreBackup = async () => {
		if (!backupFile) {
			showBackupMessage({ type: 'error', text: 'Select a backup JSON file before restoring.' });
			return;
		}
		try {
			const content = await backupFile.text();
			await runBackupAction('restore', content);
			setBackupFile(null);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : 'Failed to read backup file.';
			showBackupMessage({ type: 'error', text: message });
		}
	};

	const notificationSummary = useMemo(() => {
		const channels = [];
		if (settingsForm.notifyShipmentEmail || settingsForm.notifyPaymentEmail) channels.push('Email');
		if (settingsForm.notifyShipmentPush) channels.push('Push');
		if (settingsForm.notifyCriticalSms) channels.push('SMS');
		return channels.length ? channels.join(' + ') : 'Notifications disabled';
	}, [settingsForm]);

	const backupSummary = useMemo(() => {
		if (backupState.running) {
			return {
				label: 'Database Backups',
				value: 'Running…',
				description: 'Backup/restore operation in progress.',
				accent: 'cyan' as const,
			};
		}

		if (backupState.info?.lastBackupAt) {
			return {
				label: 'Database Backups',
				value: 'Healthy',
				description: `Last backup ${formatRelativeTime(backupState.info.lastBackupAt)}.`,
				accent: 'cyan' as const,
			};
		}

		return {
			label: 'Database Backups',
			value: 'Pending',
			description: 'No backups detected yet. Create one now.',
			accent: 'cyan' as const,
		};
	}, [backupState]);

	const quickStats = useMemo(() => {
		const securityValue = settingsForm.twoFactorEnabled ? '92%' : '68%';
		const securityDescription = settingsForm.twoFactorEnabled
			? 'MFA enabled for administrative sign-ins.'
			: 'Enable MFA to raise your security score.';

		const notificationChannels = notificationSummary;
		const notificationValue = settingsForm.notifyShipmentEmail || settingsForm.notifyShipmentPush ? 'Active' : 'Review Needed';
		const notificationDescription = settingsForm.notifyShipmentEmail || settingsForm.notifyShipmentPush
			? `Channels: ${notificationChannels}`
			: 'Activate at least one channel to stay informed.';

		const layoutValue = settingsForm.sidebarDensity === 'compact' ? 'Compact Ops View' : 'Comfortable Default';
		const layoutDescription = settingsForm.animationsEnabled
			? 'Subtle motion enhancements enabled.'
			: 'Animations disabled for focused workflow.';

		return [
			{ label: 'Security Score', value: securityValue, description: securityDescription, accent: 'cyber' as const },
			{ label: 'Notification Health', value: notificationValue, description: notificationDescription, accent: 'blue' as const },
			{ label: 'Interface Layout', value: layoutValue, description: layoutDescription, accent: 'purple' as const },
			backupSummary,
		];
	}, [settingsForm, notificationSummary, backupSummary]);

	const activityFeed = useMemo(() => {
		const items: Array<{
			id: string;
			title: string;
			description: string;
			timestamp: string;
			icon: ComponentType<{ className?: string; strokeWidth?: number }>;
			color: string;
			border: string;
		}> = [];
		if (settings) {
			items.push({
				id: 'two-factor',
				title: settings.twoFactorEnabled ? 'Two-factor authentication active' : 'Two-factor authentication disabled',
				description: settings.twoFactorEnabled
					? 'Authenticator devices are required for admin sign-in.'
					: 'Enable MFA to protect privileged access.',
				timestamp: formatRelativeTime(settings.updatedAt),
				icon: Shield,
				color: settings.twoFactorEnabled ? 'text-emerald-300' : 'text-sky-300',
				border: settings.twoFactorEnabled ? 'border-emerald-500/30' : 'border-sky-500/30',
			});
			items.push({
				id: 'notifications',
				title: `Notification routing: ${notificationSummary}`,
				description: 'Shipment, payment, and critical alerts follow your configured channels.',
				timestamp: formatRelativeTime(settings.updatedAt),
				icon: Bell,
				color: 'text-cyan-300',
				border: 'border-cyan-500/30',
			});
		}
		if (profile) {
			items.push({
				id: 'profile-update',
				title: 'Profile details updated',
				description: `Name, contact, or address edited for ${profile.email}.`,
				timestamp: formatRelativeTime(profile.updatedAt),
				icon: User,
				color: 'text-blue-300',
				border: 'border-blue-500/30',
			});
		}
		return items.slice(0, 3);
	}, [settings, profile, notificationSummary]);

	const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

	const handleToggle = (field: keyof typeof settingsForm) => {
		setSettingsForm((prev) => ({ ...prev, [field]: !prev[field] }));
	};

	const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
		if (!ref.current) return;
		ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};

	if (!mounted) {
		return (
			<div className="min-h-screen bg-[var(--text-primary)] flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/30 border-t-cyan-400" />
			</div>
		);
	}

	return (
		<>
			<Section className="relative bg-[var(--text-primary)] py-8 sm:py-12 lg:py-16 overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-[var(--text-primary)] via-[var(--text-primary)] to-[var(--text-primary)]" />
				<div className="absolute inset-0 opacity-[0.03]">
					<svg className="w-full h-full" preserveAspectRatio="none">
						<defs>
							<pattern id="grid-settings" width="40" height="40" patternUnits="userSpaceOnUse">
								<path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
							</pattern>
						</defs>
						<rect width="100%" height="100%" fill="url(#grid-settings)" className="text-cyan-400" />
					</svg>
				</div>

				<div className="relative z-10 space-y-8">
					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
						<div className="flex items-start gap-5">
							<div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/30 via-cyan-500/10 to-transparent border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/20">
								<div className="absolute inset-0 rounded-2xl bg-cyan-500/20 blur-xl" />
								<User className="relative w-8 h-8 text-white" strokeWidth={1.8} />
							</div>
							<div>
								<motion.h1
									initial={{ opacity: 0, y: 18 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.5 }}
									className="text-3xl sm:text-4xl font-semibold text-white"
								>
									Admin Settings
								</motion.h1>
								<motion.p
									initial={{ opacity: 0, y: 18 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.5, delay: 0.1 }}
									className="text-lg text-white/70"
								>
									Fine-tune the Jacxi admin experience, security posture, and notification workflows.
								</motion.p>
							</div>
						</div>

						<div className="flex flex-wrap gap-3">
							<Button
								variant="outline"
								className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
								onClick={() => scrollToSection(profileSectionRef)}
							>
								<User className="w-4 h-4 mr-2" />
								Edit Profile
							</Button>
							<Link href="/dashboard">
								<Button variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
									<ArrowLeft className="w-4 h-4 mr-2" />
									Back to Dashboard
								</Button>
							</Link>
						</div>
					</div>

					{message && (
						<div
							className={`rounded-lg border px-4 py-3 text-sm backdrop-blur-sm lg:max-w-xl ${
								message.type === 'success'
									? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
									: 'border-red-500/30 bg-red-500/10 text-red-200'
							}`}
						>
							{message.text}
						</div>
					)}

					<motion.div
						initial={{ opacity: 0, y: 18 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.15 }}
						className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
					>
						{quickStats.map((stat) => (
							<div
								key={stat.label}
								className={`rounded-xl border bg-[var(--text-primary)]/70 backdrop-blur-md p-5 shadow-lg ${
									stat.accent === 'cyber'
										? 'border-cyan-500/40 shadow-cyan-500/20'
										: stat.accent === 'blue'
										? 'border-blue-500/30 shadow-blue-500/20'
										: 'border-purple-500/30 shadow-purple-500/20'
								}`}
							>
								<p className="text-xs font-semibold uppercase tracking-wider text-white/50">{stat.label}</p>
								<p className="text-3xl font-semibold text-white mt-2">{stat.value}</p>
								<p className="text-xs text-white/40 mt-2">{stat.description}</p>
							</div>
						))}
					</motion.div>
				</div>
			</Section>

			<Section className="bg-[var(--text-primary)] py-8 sm:py-12">
				<div className="max-w-7xl mx-auto space-y-10">
					<motion.div
						initial={{ opacity: 0, y: 18 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.1 }}
						className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6"
					>
						<div className="rounded-xl border border-cyan-500/30 bg-[var(--text-primary)]/70 backdrop-blur-md p-6 shadow-lg shadow-cyan-500/10">
							<div className="flex items-center gap-4">
								<div className="w-14 h-14 rounded-2xl border border-cyan-500/30 bg-[var(--text-primary)]/60 flex items-center justify-center">
									<Activity className="w-7 h-7 text-cyan-300" strokeWidth={1.6} />
								</div>
								<div>
									<h2 className="text-2xl font-semibold text-white">Account overview</h2>
									<p className="text-sm text-white/60">Active session: {session?.user?.email}</p>
								</div>
							</div>

							<div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="rounded-lg border border-white/10 bg-white/5 p-4">
									<p className="text-xs text-white/50 uppercase tracking-wide">Email</p>
									<p className="text-sm font-medium text-white mt-2">{session?.user?.email}</p>
								</div>
								<div className="rounded-lg border border-white/10 bg-white/5 p-4">
									<p className="text-xs text-white/50 uppercase tracking-wide">Role</p>
									<p className="text-sm font-medium text-white mt-2">{session?.user?.role?.toUpperCase() ?? 'ADMIN'}</p>
								</div>
								<div className="rounded-lg border border-white/10 bg-white/5 p-4">
									<p className="text-xs text-white/50 uppercase tracking-wide">Timezone</p>
									<p className="text-sm font-medium text-white mt-2">{timezone}</p>
								</div>
								<div className="rounded-lg border border-white/10 bg-white/5 p-4">
									<p className="text-xs text-white/50 uppercase tracking-wide">Profile updated</p>
									<p className="text-sm font-medium text-white mt-2">{formatRelativeTime(profile?.updatedAt)}</p>
								</div>
							</div>

							<div className="mt-6 flex flex-wrap gap-3">
								<Button className="bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)] text-white" onClick={() => scrollToSection(profileSectionRef)}>
									Edit profile details
								</Button>
								<Button
									variant="outline"
									className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
									onClick={handleExportProfile}
								>
									Export profile JSON
								</Button>
							</div>
						</div>

						<div className="rounded-xl border border-purple-500/30 bg-[var(--text-primary)]/60 backdrop-blur-md p-6 shadow-lg shadow-purple-500/10">
							<h3 className="text-lg font-semibold text-white">Recent security activity</h3>
							<p className="text-xs text-white/50 mb-4">Snapshots derived from your latest settings and profile updates.</p>
							<div className="space-y-4">
								{activityFeed.map((activity) => {
									const Icon = activity.icon;
									return (
										<div key={activity.id} className={`rounded-lg border ${activity.border} bg-white/5 p-4 flex gap-3 items-start`}>
											<div className="p-2 rounded-lg bg-white/10">
												<Icon className={`w-4 h-4 ${activity.color}`} strokeWidth={1.6} />
											</div>
											<div className="space-y-1">
												<p className="text-sm font-semibold text-white">{activity.title}</p>
												<p className="text-xs text-white/60">{activity.description}</p>
												<p className="text-[10px] uppercase tracking-wider text-white/40">{activity.timestamp}</p>
											</div>
										</div>
									);
								})}
								{activityFeed.length === 0 && (
									<div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/60">
										No recent changes detected.
									</div>
								)}
							</div>
						</div>
					</motion.div>

					<motion.div
						ref={profileSectionRef}
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.1 }}
						className="rounded-2xl border bg-[var(--text-primary)]/70 backdrop-blur-lg p-6 shadow-xl shadow-cyan-500/10 border-cyan-500/20"
					>
						<div className="flex items-start gap-4 mb-6">
							<div className="w-12 h-12 rounded-xl border border-cyan-500/40 bg-cyan-500/10 flex items-center justify-center">
								<User className="w-6 h-6 text-cyan-300" strokeWidth={1.6} />
							</div>
							<div>
								<h2 className="text-2xl font-semibold text-white">Profile & identity</h2>
								<p className="text-sm text-white/60">Update your display name and contact information shared across Jacxi.</p>
							</div>
						</div>

						<form onSubmit={handleSaveProfile} className="space-y-6">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<div>
									<label className="text-xs font-semibold text-white/60 uppercase tracking-wide">Full name</label>
									<Input
										value={profileForm.name}
										onChange={(event) => handleProfileFieldChange('name', event.target.value)}
										className={inputStyle}
										placeholder="Jacxi Admin"
									/>
								</div>
								<div>
									<label className="text-xs font-semibold text-white/60 uppercase tracking-wide">Phone number</label>
									<Input
										value={profileForm.phone}
										onChange={(event) => handleProfileFieldChange('phone', event.target.value)}
										className={inputStyle}
										placeholder="+971 50 000 0000"
									/>
								</div>
								<div>
									<label className="text-xs font-semibold text-white/60 uppercase tracking-wide">Address</label>
									<Input
										value={profileForm.address}
										onChange={(event) => handleProfileFieldChange('address', event.target.value)}
										className={inputStyle}
										placeholder="Warehouse 12, Dubai Logistics City"
									/>
								</div>
								<div>
									<label className="text-xs font-semibold text-white/60 uppercase tracking-wide">City</label>
									<Input
										value={profileForm.city}
										onChange={(event) => handleProfileFieldChange('city', event.target.value)}
										className={inputStyle}
										placeholder="Dubai"
									/>
								</div>
								<div>
									<label className="text-xs font-semibold text-white/60 uppercase tracking-wide">Country</label>
									<Input
										value={profileForm.country}
										onChange={(event) => handleProfileFieldChange('country', event.target.value)}
										className={inputStyle}
										placeholder="United Arab Emirates"
									/>
								</div>
								<div>
									<label className="text-xs font-semibold text-white/60 uppercase tracking-wide">Primary email</label>
									<Input value={session?.user?.email ?? ''} disabled className={`${inputStyle} opacity-70`} />
								</div>
							</div>

							<div className="flex flex-wrap gap-3">
								<Button type="submit" disabled={savingProfile || profileLoading} className="bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)] text-white">
									{savingProfile ? 'Saving…' : 'Save profile'}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={resetProfileForm}
									disabled={savingProfile || profileLoading}
									className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
								>
									Reset changes
								</Button>
							</div>
						</form>
					</motion.div>

					<motion.div
						ref={preferencesSectionRef}
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.15 }}
						className="grid grid-cols-1 xl:grid-cols-2 gap-6"
					>
						<div className="rounded-2xl border bg-[var(--text-primary)]/70 backdrop-blur-lg p-6 shadow-xl shadow-blue-500/10 border-blue-500/20">
							<div className="flex items-start gap-4 mb-6">
								<div className="w-12 h-12 rounded-xl border border-blue-500/40 bg-blue-500/10 flex items-center justify-center">
									<Palette className="w-6 h-6 text-blue-200" strokeWidth={1.6} />
								</div>
								<div>
									<h2 className="text-2xl font-semibold text-white">Interface preferences</h2>
									<p className="text-sm text-white/60">Choose theme, accent colour, language, and density for the Jacxi dashboard.</p>
								</div>
							</div>

							<form onSubmit={handleSavePreferences} className="space-y-5">
								<div>
									<label className="text-xs font-semibold text-white/60 uppercase tracking-wide">Theme</label>
									<select
										value={settingsForm.theme}
										onChange={(event) => setSettingsForm((prev) => ({ ...prev, theme: event.target.value }))}
										className={selectStyle}
									>
										{themeOptions.map((option) => (
											<option key={option.value} value={option.value} className="bg-[var(--text-primary)]">
												{option.label}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="text-xs font-semibold text-white/60 uppercase tracking-wide">Primary accent</label>
									<div className="flex flex-wrap gap-3 mt-2">
										{accentOptions.map((color) => (
											<button
												key={color}
												type="button"
												onClick={() => setSettingsForm((prev) => ({ ...prev, accentColor: color }))}
												className={`h-9 w-9 rounded-full border transition ${
													settingsForm.accentColor === color ? 'border-white/80 ring-2 ring-white/40' : 'border-white/20'
												}`}
												style={{ background: color }}
											/>
										))}
										<input
											type="color"
											value={settingsForm.accentColor}
											onChange={(event) => setSettingsForm((prev) => ({ ...prev, accentColor: event.target.value }))}
											className="h-9 w-16 cursor-pointer rounded-lg border border-white/20 bg-[var(--text-primary)]"
											title="Pick custom accent"
										/>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="text-xs font-semibold text-white/60 uppercase tracking-wide">Sidebar density</label>
										<select
											value={settingsForm.sidebarDensity}
											onChange={(event) => setSettingsForm((prev) => ({ ...prev, sidebarDensity: event.target.value }))}
											className={selectStyle}
										>
											<option value="comfortable" className="bg-[var(--text-primary)]">
												Comfortable (default)
											</option>
											<option value="compact" className="bg-[var(--text-primary)]">
												Compact (ops teams)
											</option>
										</select>
									</div>
									<div>
										<label className="text-xs font-semibold text-white/60 uppercase tracking-wide">Language</label>
										<select
											value={settingsForm.language}
											onChange={(event) => setSettingsForm((prev) => ({ ...prev, language: event.target.value }))}
											className={selectStyle}
										>
											<option value="en" className="bg-[var(--text-primary)]">
												English
											</option>
											<option value="ar" className="bg-[var(--text-primary)]">
												Arabic
											</option>
											<option value="fr" className="bg-[var(--text-primary)]">
												French
											</option>
										</select>
									</div>
								</div>

								<div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
									<div>
										<p className="text-sm font-medium text-white">Motion & animations</p>
										<p className="text-xs text-white/50">Subtle transitions and parallax components within the dashboard.</p>
									</div>
									<button
										type="button"
										onClick={() => handleToggle('animationsEnabled')}
										className={`relative h-8 w-14 rounded-full border transition ${
											settingsForm.animationsEnabled
												? 'border-cyan-500 bg-cyan-500/30'
												: 'border-white/20 bg-white/10'
										}`}
									>
										<span
											className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white transition ${
												settingsForm.animationsEnabled ? 'translate-x-6' : 'translate-x-0'
											}`}
										/>
									</button>
								</div>

								<div className="flex flex-wrap gap-3 pt-2">
									<Button type="submit" disabled={savingPreferences || settingsLoading} className="bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)] text-white">
										{savingPreferences ? 'Saving…' : 'Save preferences'}
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={handleResetPreferences}
										disabled={savingPreferences || settingsLoading}
										className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
									>
										Restore defaults
									</Button>
								</div>
							</form>
						</div>

						<div className="rounded-2xl border bg-[var(--text-primary)]/70 backdrop-blur-lg p-6 shadow-xl shadow-sky-500/10 border-sky-500/20">
							<div className="flex items-start gap-4 mb-6">
								<div className="w-12 h-12 rounded-xl border border-sky-500/30 bg-sky-500/10 flex items-center justify-center">
									<Bell className="w-6 h-6 text-sky-200" strokeWidth={1.6} />
								</div>
								<div>
									<h2 className="text-2xl font-semibold text-white">Notification rules</h2>
									<p className="text-sm text-white/60">Route shipment, payment, and critical alerts to the channels your team monitors.</p>
								</div>
							</div>

							<form onSubmit={handleSaveNotifications} className="space-y-4">
								{[
									{
										key: 'notifyShipmentEmail' as const,
										label: 'Shipment status updates',
										description: 'Receive email notifications when shipment milestones change.',
									},
									{
										key: 'notifyShipmentPush' as const,
										label: 'Push notifications',
										description: 'Deliver real-time alerts to the Jacxi mobile app.',
									},
									{
										key: 'notifyPaymentEmail' as const,
										label: 'Payment reminders',
										description: 'Daily summaries for unpaid invoices and overdue balances.',
									},
									{
										key: 'notifyCriticalSms' as const,
										label: 'Critical SMS escalation',
										description: 'Emergency text messages for customs holds or exceptions.',
									},
								].map((item) => (
									<button
										key={item.key}
										type="button"
										onClick={() => handleToggle(item.key)}
										className={`w-full rounded-xl border px-4 py-3 text-left transition ${
											settingsForm[item.key]
												? 'border-sky-500/30 bg-sky-500/10'
												: 'border-white/10 bg-white/5 hover:border-white/20'
										}`}
									>
										<div className="flex items-center justify-between gap-3">
											<div>
												<p className="text-sm font-medium text-white">{item.label}</p>
												<p className="text-xs text-white/60">{item.description}</p>
											</div>
											<span className={`text-xs font-semibold uppercase tracking-wide ${settingsForm[item.key] ? 'text-sky-200' : 'text-white/40'}`}>
												{settingsForm[item.key] ? 'Enabled' : 'Disabled'}
											</span>
										</div>
									</button>
								))}

								<div className="flex flex-wrap gap-3 pt-2">
									<Button type="submit" disabled={savingNotifications || settingsLoading} className="bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)] text-white">
										{savingNotifications ? 'Saving…' : 'Save notification rules'}
									</Button>
								</div>
							</form>
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="rounded-2xl border bg-[var(--text-primary)]/70 backdrop-blur-lg p-6 shadow-xl shadow-purple-500/10 border-purple-500/20"
					>
						<div className="flex items-start gap-4 mb-6">
							<div className="w-12 h-12 rounded-xl border border-purple-500/40 bg-purple-500/10 flex items-center justify-center">
								<Shield className="w-6 h-6 text-purple-200" strokeWidth={1.6} />
							</div>
							<div>
								<h2 className="text-2xl font-semibold text-white">Security & access</h2>
								<p className="text-sm text-white/60">Protect privileged actions with MFA and escalation rules.</p>
							</div>
						</div>

						<div className="space-y-4">
							<div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-start justify-between gap-4">
								<div>
									<p className="text-sm font-medium text-white">Two-factor authentication</p>
									<p className="text-xs text-white/60">Require authenticator verification for admin dashboard sign-in.</p>
								</div>
								<Button onClick={handleToggleTwoFactor} disabled={savingSecurity || settingsLoading} className="bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)] text-white">
									{savingSecurity ? 'Updating…' : settingsForm.twoFactorEnabled ? 'Disable MFA' : 'Enable MFA'}
								</Button>
							</div>

							<div className="rounded-xl border border-white/10 bg-white/5 p-4">
								<p className="text-sm font-medium text-white">Access tokens</p>
								<p className="text-xs text-white/60">API tokens are managed from the integrations module.</p>
								<div className="mt-3 flex flex-wrap gap-3">
									<Link href="/dashboard/integrations" aria-disabled className="pointer-events-none opacity-40">
										<Button variant="outline" className="border-white/20 text-white/50">
											Coming soon
										</Button>
									</Link>
								</div>
							</div>
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6, delay: 0.2 }}
						className="rounded-2xl border border-cyan-500/30 bg-[var(--text-primary)]/70 backdrop-blur-md p-6 shadow-lg shadow-cyan-500/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
					>
						<div>
							<h3 className="text-xl font-semibold text-white">Need to onboard a new admin?</h3>
							<p className="text-sm text-white/60 mt-2">
								Create a Jacxi admin account with predefined roles and share access best practices.
							</p>
						</div>
						<div className="flex flex-wrap gap-3">
							<Button className="bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)] text-white" onClick={() => router.push('/dashboard/users/new?role=admin')}>
								Invite admin
							</Button>
							<Button variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10" onClick={() => router.push('/dashboard/documents')}>
								View access policies
							</Button>
						</div>
					</motion.div>
				</div>
			</Section>

			<motion.div
				initial={{ opacity: 0, y: 24 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.6, delay: 0.25 }}
				className="mx-auto max-w-7xl pb-20"
			>
				<div className="rounded-2xl border border-cyan-500/20 bg-[var(--text-primary)]/70 backdrop-blur-lg p-6 shadow-xl shadow-cyan-500/15">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex items-center gap-4">
							<div className="w-12 h-12 rounded-xl border border-cyan-500/40 bg-cyan-500/10 flex items-center justify-center">
								{backupState.running ? <RefreshCw className="w-6 h-6 animate-spin text-cyan-200" /> : <Database className="w-6 h-6 text-cyan-200" />}
							</div>
							<div>
								<h2 className="text-2xl font-semibold text-white">Database backup & restore</h2>
								<p className="text-sm text-white/60">
									Create secure JSON snapshots of Jacxi data or restore from a previous backup.
								</p>
							</div>
						</div>
						<div className="text-sm text-white/60">
							<p>Last backup:</p>
							<p className="text-white font-medium">
								{backupState.info?.lastBackupAt ? formatRelativeTime(backupState.info.lastBackupAt) : 'No backups yet'}
							</p>
							{backupState.info?.backupPath && (
								<p className="mt-1 text-xs text-white/40 break-all">
									Stored at <code className="text-white/60">{backupState.info.backupPath}</code>
								</p>
							)}
						</div>
					</div>

					<div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
						<div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
							<h3 className="text-lg font-semibold text-white">Create backup</h3>
							<p className="text-sm text-white/60">
								Generate a JSON snapshot of users, shipments, quotes, and marketing content. Keep copies in secure storage.
							</p>
							<Button
								onClick={handleCreateBackup}
								disabled={backupState.running || backupState.loading}
								className="bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)] text-white"
							>
								{backupState.running ? 'Working…' : 'Create backup'}
							</Button>
						</div>

						<div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
							<h3 className="text-lg font-semibold text-white">Restore from file</h3>
							<p className="text-sm text-white/60">
								Select a previously exported backup JSON file. Current shipment data will be replaced.
							</p>
							<div className="flex flex-col gap-3">
								<label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
									<UploadCloud className="w-4 h-4" />
									<span>{backupFile ? backupFile.name : 'Choose backup file (.json)'}</span>
									<input type="file" accept="application/json" onChange={handleBackupFileChange} className="hidden" />
								</label>
								<Button
									onClick={handleRestoreBackup}
									disabled={backupState.running || !backupFile}
									variant="outline"
									className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
								>
									Restore from file
								</Button>
							</div>
							<p className="text-xs text-amber-300/80">
								Restore will overwrite shipments, events, quotes, and content. Always verify backups before applying.
							</p>
						</div>
					</div>
				</div>
			</motion.div>
		</>
	);
}