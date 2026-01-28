"use client";

import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface EmptyStateProps {
	icon: ReactNode;
	title: string;
	description?: string;
	action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
	return (
		<Box
			sx={{
				minHeight: 240,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 1.5,
				textAlign: 'center',
				py: 4,
			}}
		>
			<Box
				sx={{
					color: 'var(--text-secondary)',
					opacity: 0.4,
					'& svg': {
						fontSize: { xs: 42, sm: 48, md: 56 },
					},
				}}
			>
				{icon}
			</Box>
			<Typography
				sx={{
					fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1rem' },
					fontWeight: 500,
					color: 'var(--text-primary)',
				}}
			>
				{title}
			</Typography>
			{description && (
				<Typography
					sx={{
						fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.9rem' },
						color: 'var(--text-secondary)',
						maxWidth: 400,
					}}
				>
					{description}
				</Typography>
			)}
			{action && <Box sx={{ mt: 1 }}>{action}</Box>}
		</Box>
	);
}
