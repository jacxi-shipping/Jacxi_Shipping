"use client";

import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface PageHeaderProps {
	title: string;
	description?: string;
	actions?: ReactNode;
	meta?: Array<{
		label: string;
		value: string | number;
	}>;
}

export default function PageHeader({ title, description, actions, meta }: PageHeaderProps) {
	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: { xs: 'column', md: 'row' },
				justifyContent: 'space-between',
				alignItems: { xs: 'flex-start', md: 'center' },
				gap: 2.5,
				mb: 3,
			}}
		>
			<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
				<Typography
					component="h1"
					sx={{
						fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
						fontWeight: 600,
						color: 'var(--text-primary)',
					}}
				>
					{title}
				</Typography>
				{description && (
					<Typography
						sx={{
							fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.95rem' },
							color: 'var(--text-secondary)',
						}}
					>
						{description}
					</Typography>
				)}
			</Box>
			<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
				{meta && meta.length > 0 && (
					<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
						{meta.map((item) => (
							<Box
								key={item.label}
								sx={{
									minWidth: 110,
									border: '1px solid var(--border)',
									borderRadius: 2,
									padding: '8px 12px',
									backgroundColor: 'var(--panel)',
									boxShadow: '0 8px 20px rgba(var(--text-primary-rgb), 0.04)',
								}}
							>
								<Typography
									sx={{
										fontSize: '0.65rem',
										textTransform: 'uppercase',
										letterSpacing: '0.15em',
										color: 'var(--text-secondary)',
									}}
								>
									{item.label}
								</Typography>
								<Typography sx={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
									{item.value}
								</Typography>
							</Box>
						))}
					</Box>
				)}
				{actions && <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box>}
			</Box>
		</Box>
	);
}
