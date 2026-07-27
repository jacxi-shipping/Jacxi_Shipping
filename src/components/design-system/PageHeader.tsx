"use client";

import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';
import Breadcrumbs from './Breadcrumbs';

interface PageHeaderProps {
	title: string;
	description?: string;
	actions?: ReactNode;
	showBreadcrumbs?: boolean;
	meta?: Array<{
		label: string;
		value: string | number;
		helper?: string;
	}>;
}

export default function PageHeader({ title, description, actions, showBreadcrumbs = false, meta }: PageHeaderProps) {
	return (
		<Box sx={{ mb: 3 }}>
			{showBreadcrumbs && (
				<Box sx={{ mb: 1.5 }}>
					<Breadcrumbs />
				</Box>
			)}
			<Box
				sx={{
					display: 'flex',
					flexDirection: { xs: 'column', md: 'row' },
					justifyContent: 'space-between',
					alignItems: { xs: 'flex-start', md: 'center' },
					gap: 2,
					border: '1px solid var(--border)',
					borderTop: '2px solid rgba(var(--accent-gold-rgb), 0.3)',
					borderRadius: 2,
					backgroundColor: 'var(--panel)',
					boxShadow: '0 14px 34px rgba(var(--text-primary-rgb), 0.08)',
					padding: { xs: '14px 16px', md: '16px 18px' },
				}}
			>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
					<Typography
						component="h1"
						sx={{
							fontSize: { xs: '1.15rem', sm: '1.25rem', md: '1.4rem' },
							fontWeight: 600,
							color: 'var(--text-primary)',
							lineHeight: 1.2,
							overflowWrap: 'anywhere',
						}}
					>
						{title}
					</Typography>
					{description && (
						<Typography
							sx={{
								fontSize: { xs: '0.82rem', sm: '0.88rem' },
								color: 'var(--text-secondary)',
								maxWidth: 680,
							}}
						>
							{description}
						</Typography>
					)}
				</Box>
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
					{meta && meta.length > 0 && (
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
							{meta.map((item) => (
								<Box
									key={item.label}
									sx={{
										minWidth: 110,
										border: '1px solid var(--border)',
										borderRadius: 1.25,
										padding: '8px 12px',
										backgroundColor: 'var(--background)',
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
									{item.helper && (
										<Typography sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
											{item.helper}
										</Typography>
									)}
								</Box>
							))}
						</Box>
					)}
					{actions && <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>{actions}</Box>}
				</Box>
			</Box>
		</Box>
	);
}
