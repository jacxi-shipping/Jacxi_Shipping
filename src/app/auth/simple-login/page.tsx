"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Visibility, VisibilityOff, VpnKey, ArrowForward } from '@mui/icons-material';
import { 
	Button, 
	TextField, 
	InputAdornment, 
	IconButton, 
	Alert, 
	CircularProgress, 
	Box, 
	Typography,
	Paper
} from '@mui/material';

export default function SimpleLoginPage() {
	const router = useRouter();
	const [loginCode, setLoginCode] = useState('');
	const [showCode, setShowCode] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// Convert to uppercase and limit to 8 characters
		const value = e.target.value.toUpperCase().slice(0, 8);
		setLoginCode(value);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		if (loginCode.length !== 8) {
			setError('Login code must be 8 characters');
			setIsLoading(false);
			return;
		}

		try {
			const result = await signIn('credentials', {
				loginCode: loginCode.trim(),
				redirect: false,
			});

			if (result?.error || !result?.ok) {
				setError('Invalid login code. Please check your code and try again.');
			} else {
				router.replace('/dashboard');
				router.refresh();
			}
		} catch {
			setError('An error occurred. Please try again.');
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
				py: { xs: 6, sm: 10 },
				px: { xs: 2, sm: 3, lg: 4 },
			}}
		>
			{/* Main Content */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				style={{ maxWidth: 500, width: '100%', position: 'relative', zIndex: 10 }}
			>
				{/* Glass Card */}
				<Paper
					elevation={0}
					sx={{
						position: 'relative',
						borderRadius: 4,
						background: 'var(--panel)',
						border: '1px solid rgba(var(--panel-rgb), 0.9)',
						boxShadow: '0 25px 60px rgba(var(--text-primary-rgb), 0.12)',
						p: { xs: 4, sm: 6 },
						overflow: 'hidden',
					}}
				>
					<Box sx={{ position: 'relative', zIndex: 1 }}>
						{/* Header */}
						<Box sx={{ textAlign: 'center', mb: 4 }}>
							<Box 
								sx={{ 
									display: 'inline-flex',
									alignItems: 'center',
									justifyContent: 'center',
									width: 80,
									height: 80,
									borderRadius: '50%',
									bgcolor: 'rgba(var(--accent-gold-rgb), 0.15)',
									mb: 3,
								}}
							>
								<VpnKey 
									sx={{ 
										fontSize: 40, 
										color: 'var(--accent-gold)' 
									}} 
								/>
							</Box>
							<Typography
								variant="h3"
								sx={{
									fontSize: { xs: '2rem', sm: '2.5rem' },
									fontWeight: 700,
									color: 'var(--text-primary)',
									mb: 2,
								}}
							>
								Customer Login
							</Typography>
							<Typography
								variant="body1"
								sx={{
									color: 'var(--text-secondary)',
									fontSize: '1.125rem',
									lineHeight: 1.6,
									mb: 1,
								}}
							>
								Enter your 8-character login code
							</Typography>
							<Typography
								variant="body2"
								sx={{
									color: 'var(--text-secondary)',
									fontSize: '0.875rem',
								}}
							>
								(This code was provided to you by our team)
							</Typography>
						</Box>

						{/* Error Message */}
						{error && (
							<Alert 
								severity="error"
								sx={{
									mb: 3,
									bgcolor: 'rgba(var(--error-rgb), 0.15)',
									border: '1px solid rgba(var(--error-rgb), 0.4)',
									color: 'var(--error)',
									fontSize: '1rem',
									'& .MuiAlert-icon': {
										color: 'var(--error)',
										fontSize: 24,
									},
								}}
							>
								{error}
							</Alert>
						)}

						{/* Form */}
						<Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
							{/* Login Code Field */}
							<Box>
								<Typography
									component="label"
									htmlFor="loginCode"
									sx={{
										display: 'block',
										fontSize: '1rem',
										fontWeight: 600,
										color: 'var(--text-primary)',
										mb: 1.5,
									}}
								>
									Login Code
								</Typography>
								<TextField
									id="loginCode"
									type={showCode ? 'text' : 'password'}
									fullWidth
									value={loginCode}
									onChange={handleCodeChange}
									required
									placeholder="Enter 8-character code"
									autoComplete="off"
									autoFocus
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<VpnKey sx={{ fontSize: 24, color: 'var(--accent-gold)' }} />
											</InputAdornment>
										),
										endAdornment: (
											<InputAdornment position="end">
												<IconButton
													onClick={() => setShowCode(!showCode)}
													edge="end"
													sx={{
														color: 'var(--accent-gold)',
														'&:hover': {
															color: 'var(--accent-gold)',
														},
													}}
												>
													{showCode ? (
														<VisibilityOff sx={{ fontSize: 24 }} />
													) : (
														<Visibility sx={{ fontSize: 24 }} />
													)}
												</IconButton>
											</InputAdornment>
										),
										sx: {
											fontSize: '1.5rem',
											fontWeight: 500,
											letterSpacing: '0.2em',
											textAlign: 'center',
										}
									}}
									sx={{
										'& .MuiOutlinedInput-root': {
											bgcolor: 'var(--background)',
											borderRadius: 3,
											color: 'var(--text-primary)',
											fontSize: '1.5rem',
											py: 1,
											'& fieldset': {
												borderColor: 'rgba(var(--panel-rgb), 0.9)',
												borderWidth: 2,
											},
											'&:hover fieldset': {
												borderColor: 'var(--accent-gold)',
											},
											'&.Mui-focused fieldset': {
												borderColor: 'var(--accent-gold)',
												borderWidth: 3,
											},
											'& input': {
												color: 'var(--text-primary)',
												textAlign: 'center',
												letterSpacing: '0.3em',
												fontSize: '1.5rem',
												fontWeight: 600,
												'&::placeholder': {
													color: 'var(--text-secondary)',
													opacity: 0.7,
													letterSpacing: 'normal',
													textAlign: 'center',
													fontSize: '1rem',
												},
												'&:-webkit-autofill': {
													WebkitBoxShadow: '0 0 0 100px var(--background) inset',
													WebkitTextFillColor: 'var(--text-primary)',
												},
											},
										},
									}}
								/>
								<Typography
									variant="caption"
									sx={{
										display: 'block',
										mt: 1,
										color: 'var(--text-secondary)',
										fontSize: '0.875rem',
										textAlign: 'center',
									}}
								>
									{loginCode.length}/8 characters
								</Typography>
							</Box>

							{/* Submit Button */}
							<Button
								type="submit"
								disabled={isLoading || loginCode.length !== 8}
								variant="contained"
								size="large"
								endIcon={!isLoading && <ArrowForward />}
								sx={{
									width: '100%',
									bgcolor: 'var(--accent-gold)',
									color: 'var(--background)',
									fontWeight: 700,
									py: 2,
									fontSize: '1.125rem',
									borderRadius: 3,
									'&:hover': {
										bgcolor: 'var(--accent-gold)',
										transform: 'scale(1.02)',
									},
									'&:disabled': {
										bgcolor: 'rgba(var(--accent-gold-rgb), 0.5)',
										color: 'rgba(var(--background-rgb), 0.85)',
									},
									transition: 'all 0.2s ease',
								}}
							>
								{isLoading ? (
									<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
										<CircularProgress size={24} sx={{ color: 'var(--background)' }} />
										<Typography component="span" sx={{ fontWeight: 700 }}>Logging in...</Typography>
									</Box>
								) : (
									<Typography component="span" sx={{ fontWeight: 700 }}>Login</Typography>
								)}
							</Button>
						</Box>

						{/* Help Text */}
						<Box sx={{ textAlign: 'center', pt: 4, mt: 4, borderTop: '1px solid rgba(var(--panel-rgb), 0.5)' }}>
							<Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 2 }}>
								Need help? Contact our support team
							</Typography>
							<Typography
								component="button"
								type="button"
								onClick={() => router.push('/auth/signin')}
								sx={{
									background: 'none',
									border: 'none',
									color: 'var(--accent-gold)',
									fontWeight: 500,
									fontSize: '0.875rem',
									cursor: 'pointer',
									textDecoration: 'underline',
									transition: 'color 0.2s ease',
									'&:hover': {
										color: 'var(--accent-gold)',
									},
								}}
							>
								Admin Login (Email & Password)
							</Typography>
						</Box>
					</Box>
				</Paper>
			</motion.div>
		</Box>
	);
}
