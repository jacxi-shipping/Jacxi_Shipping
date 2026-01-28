'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArrowForward from '@mui/icons-material/ArrowForward';
import Link from 'next/link';

import {
	Box,
	Paper,
	Typography,
	TextField,
	InputAdornment,
	IconButton,
	Alert,
	CircularProgress,
	Snackbar,
	Button as MuiButton,
} from '@mui/material';

export default function CreateUserPage() {
	const router = useRouter();
	const { data: session, status } = useSession();
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		password: '',
		confirmPassword: '',
	});
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

	if (status === 'loading') {
		return (
			<Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<CircularProgress />
			</Box>
		);
	}

	const role = session?.user?.role;
	if (!session || role !== 'admin') {
		return (
			<Box sx={{ py: 12 }}>
				<Paper elevation={0} sx={{ maxWidth: 960, mx: 'auto', p: 6, textAlign: 'center', bgcolor: 'var(--text-primary)', color: 'white' }}>
					<Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>Access Restricted</Typography>
					<Typography sx={{ mb: 3 }}>Only administrators can create user accounts.</Typography>
					<Link href="/dashboard" style={{ textDecoration: 'none' }}>
						<MuiButton variant="contained" sx={{ bgcolor: 'var(--accent-gold)', color: 'var(--background)', '&:hover': { bgcolor: 'var(--accent-gold)' } }}>
							Go to Dashboard
						</MuiButton>
					</Link>
				</Paper>
			</Box>
		);
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		if (formData.password !== formData.confirmPassword) {
			setSnackbar({ open: true, message: 'Passwords do not match', severity: 'error' });
			setIsLoading(false);
			return;
		}

		if (formData.password.length < 6) {
			setSnackbar({ open: true, message: 'Password must be at least 6 characters', severity: 'error' });
			setIsLoading(false);
			return;
		}

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password }),
			});

			const data = await response.json().catch(() => ({}));

			if (response.ok) {
				if (data?.user) {
					try {
						sessionStorage.setItem('jacxi.createdUser', JSON.stringify(data.user));
					} catch {}

					if (typeof BroadcastChannel !== 'undefined') {
						try {
							const bc = new BroadcastChannel('jacxi-users');
							bc.postMessage({ action: 'created', user: data.user });
							bc.close();
						} catch {}
					}
				}

				setSnackbar({ open: true, message: 'User created successfully', severity: 'success' });
				setTimeout(() => router.push('/dashboard/users'), 800);
			} else {
				const msg = data?.message || 'Registration failed';
				setSnackbar({ open: true, message: msg, severity: 'error' });
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'An error occurred. Please try again.';
			setSnackbar({ open: true, message, severity: 'error' });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Box
			sx={{
				minHeight: '100vh',
				bgcolor: 'var(--background)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				py: { xs: 3, sm: 4 },
				px: { xs: 2, sm: 3, lg: 4 },
			}}
		>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				style={{ maxWidth: 640, width: '100%', position: 'relative', zIndex: 10, marginTop: -24 }}
			>
				<Paper
					elevation={0}
					sx={{
						position: 'relative',
						borderRadius: 4,
						background: 'var(--panel)',
						border: '1px solid rgba(var(--panel-rgb), 0.9)',
						boxShadow: '0 25px 60px rgba(var(--text-primary-rgb), 0.12)',
						p: { xs: 3, sm: 4 },
						overflow: 'hidden',
					}}
				>
					<Box sx={{ position: 'relative', zIndex: 1 }}>
						{/* Header */}
						<Box sx={{ textAlign: 'center', mb: 3 }}>
							<Typography
								variant="h3"
								sx={{
									fontSize: { xs: '1.875rem', sm: '2.25rem' },
									fontWeight: 700,
									color: 'var(--text-primary)',
									mb: 1,
								}}
							>
								Create User
							</Typography>
							<Typography
								variant="body1"
								sx={{
									color: 'var(--text-secondary)',
								}}
							>
								Create a new user account
							</Typography>
						</Box>

						{/* Form - responsive two-column */}
						<Box
							component="form"
							onSubmit={handleSubmit}
							sx={{
								display: 'grid',
								gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
								gap: 2.5,
								alignItems: 'start',
							}}
						>
							{/* Name */}
							<Box sx={{ gridColumn: { xs: '1 / -1', sm: '1 / 2' } }}>
								<Typography
									component="label"
									htmlFor="name"
									sx={{
										display: 'block',
										fontSize: '0.875rem',
										fontWeight: 500,
										color: 'var(--text-primary)',
										mb: 1,
									}}
								>
									Full Name
								</Typography>
								<TextField
									id="name"
									name="name"
									type="text"
									fullWidth
									value={formData.name}
									onChange={handleChange}
									required
									disabled={isLoading}
									placeholder="Enter full name"
									autoComplete="name"
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<PersonIcon sx={{ fontSize: 20, color: 'var(--text-secondary)' }} />
											</InputAdornment>
										),
									}}
									sx={{
										'& .MuiOutlinedInput-root': {
											bgcolor: 'var(--background)',
											borderRadius: 2,
											color: 'var(--text-primary)',
										},
									}}
								/>
							</Box>

							{/* Email */}
							<Box sx={{ gridColumn: { xs: '1 / -1', sm: '2 / 3' } }}>
								<Typography
									component="label"
									htmlFor="email"
									sx={{
										display: 'block',
										fontSize: '0.875rem',
										fontWeight: 500,
										color: 'var(--text-primary)',
										mb: 1,
									}}
								>
									Email
								</Typography>
								<TextField
									id="email"
									name="email"
									type="email"
									fullWidth
									value={formData.email}
									onChange={handleChange}
									required
									disabled={isLoading}
									placeholder="Enter email address"
									autoComplete="email"
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<EmailIcon sx={{ fontSize: 20, color: 'var(--text-secondary)' }} />
											</InputAdornment>
										),
									}}
									sx={{
										'& .MuiOutlinedInput-root': {
											bgcolor: 'var(--background)',
											borderRadius: 2,
											color: 'var(--text-primary)',
										},
									}}
								/>
							</Box>

							{/* Password */}
							<Box sx={{ gridColumn: { xs: '1 / -1', sm: '1 / 2' } }}>
								<Typography
									component="label"
									htmlFor="password"
									sx={{
										display: 'block',
										fontSize: '0.875rem',
										fontWeight: 500,
										color: 'var(--text-primary)',
										mb: 1,
									}}
								>
									Password
								</Typography>
								<TextField
									id="password"
									name="password"
									type={showPassword ? 'text' : 'password'}
									fullWidth
									value={formData.password}
									onChange={handleChange}
									required
									disabled={isLoading}
									placeholder="Enter password (min. 6 characters)"
									autoComplete="new-password"
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<LockIcon sx={{ fontSize: 20, color: 'var(--text-secondary)' }} />
											</InputAdornment>
										),
										endAdornment: (
											<InputAdornment position="end">
												<IconButton
													onClick={() => setShowPassword(!showPassword)}
													edge="end"
													sx={{
														color: 'var(--accent-gold)',
													}}
												>
													{showPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
												</IconButton>
											</InputAdornment>
										),
									}}
									sx={{
										'& .MuiOutlinedInput-root': {
											bgcolor: 'var(--background)',
											borderRadius: 2,
											color: 'var(--text-primary)',
										},
									}}
								/>
							</Box>

							{/* Confirm Password */}
							<Box sx={{ gridColumn: { xs: '1 / -1', sm: '2 / 3' } }}>
								<Typography
									component="label"
									htmlFor="confirmPassword"
									sx={{
										display: 'block',
										fontSize: '0.875rem',
										fontWeight: 500,
										color: 'var(--text-primary)',
										mb: 1,
									}}
								>
									Confirm Password
								</Typography>
								<TextField
									id="confirmPassword"
									name="confirmPassword"
									type={showConfirmPassword ? 'text' : 'password'}
									fullWidth
									value={formData.confirmPassword}
									onChange={handleChange}
									required
									disabled={isLoading}
									placeholder="Confirm password"
									autoComplete="new-password"
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<LockIcon sx={{ fontSize: 20, color: 'var(--text-secondary)' }} />
											</InputAdornment>
										),
										endAdornment: (
											<InputAdornment position="end">
												<IconButton
													onClick={() => setShowConfirmPassword(!showConfirmPassword)}
													edge="end"
													sx={{
														color: 'var(--accent-gold)',
													}}
												>
													{showConfirmPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
												</IconButton>
											</InputAdornment>
										),
									}}
									sx={{
										'& .MuiOutlinedInput-root': {
											bgcolor: 'var(--background)',
											borderRadius: 2,
											color: 'var(--text-primary)',
										},
									}}
								/>
							</Box>

							{/* Submit Button - span full width */}
							<Box sx={{ gridColumn: '1 / -1' }}>
								<MuiButton
									type="submit"
									disabled={isLoading}
									variant="contained"
									size="large"
									endIcon={!isLoading && <ArrowForward />}
									sx={{
										width: '100%',
										bgcolor: 'var(--accent-gold)',
										color: 'var(--background)',
										fontWeight: 600,
										py: 1.5,
										fontSize: '1rem',
										'&:hover': {
											bgcolor: 'var(--accent-gold)',
										},
										'&:disabled': {
											bgcolor: 'rgba(var(--accent-gold-rgb), 0.5)',
											color: 'rgba(var(--background-rgb), 0.85)',
										},
									}}
								>
									{isLoading ? (
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
											<CircularProgress size={20} sx={{ color: 'var(--background)' }} />
											<Typography component="span">Creating...</Typography>
										</Box>
									) : (
										<Typography component="span">Create Account</Typography>
									)}
								</MuiButton>
							</Box>
						</Box>

						{/* Back Link */}
						<Box sx={{ textAlign: 'center', pt: 2 }}>
							<Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
								<Typography
									component="button"
									onClick={() => router.push('/dashboard')}
									sx={{
										background: 'none',
										border: 'none',
										color: 'var(--accent-gold)',
										fontWeight: 500,
										cursor: 'pointer',
										transition: 'color 0.2s ease',
										'&:hover': {
											color: 'var(--accent-gold)',
										},
									}}
								>
									Back to Dashboard
								</Typography>
							</Typography>
						</Box>
					</Box>
				</Paper>
			</motion.div>

			{/* Snackbar */}
			<Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
				<Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	);
}
