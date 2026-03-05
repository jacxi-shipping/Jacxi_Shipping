"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Session } from 'next-auth';
import type { SvgIconComponent } from '@mui/icons-material';
import { Dashboard, Inventory2, Description, Search, Analytics, Group, AllInbox, Receipt, AccountBalance, Payment, TrendingUp, Business, LocalShipping } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { Drawer, Box, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { hasPermission, type Permission } from '@/lib/rbac';

type NavigationItem = {
	name: string;
	href: string;
	icon: SvgIconComponent;
	requiredPermission?: Permission;
};

const mainNavigation: NavigationItem[] = [
	{
		name: 'Dashboard',
		href: '/dashboard',
		icon: Dashboard,
	},
];

const shipmentNavigation: NavigationItem[] = [
	{
		name: 'Shipments',
		href: '/dashboard/shipments',
		icon: Inventory2,
		requiredPermission: 'shipments:view',
	},
];

const financeNavigation: NavigationItem[] = [
	{
		name: 'Finance',
		href: '/dashboard/finance',
		icon: AccountBalance,
		requiredPermission: 'finance:view',
	},
	{
		name: 'Company Ledgers',
		href: '/dashboard/finance/companies',
		icon: Business,
		requiredPermission: 'finance:manage',
	},
];

const adminNavigation: NavigationItem[] = [
	{
		name: 'Analytics',
		href: '/dashboard/analytics',
		icon: Analytics,
		requiredPermission: 'analytics:view',
	},
	{
		name: 'Customers',
		href: '/dashboard/customers',
		icon: Group,
		requiredPermission: 'customers:view',
	},
	{
		name: 'Users',
		href: '/dashboard/users',
		icon: Group,
		requiredPermission: 'users:manage',
	},
	{
		name: 'Containers',
		href: '/dashboard/containers',
		icon: AllInbox,
		requiredPermission: 'containers:view',
	},
	{
		name: 'Transits',
		href: '/dashboard/transits',
		icon: LocalShipping,
		requiredPermission: 'transits:manage',
	},
	{
		name: 'Invoices',
		href: '/dashboard/invoices',
		icon: Receipt,
		requiredPermission: 'invoices:view',
	},
];

const otherNavigation: NavigationItem[] = [
	{
		name: 'Track Shipments',
		href: '/dashboard/tracking',
		icon: Search,
		requiredPermission: 'tracking:view',
	},
	{
		name: 'Documents',
		href: '/dashboard/documents',
		icon: Description,
		requiredPermission: 'documents:view',
	},
];

interface SidebarProps {
	mobileOpen?: boolean;
	onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
	const pathname = usePathname();
	const { data: session } = useSession();

	const drawerWidth = 260;

	return (
		<>
			{/* Mobile Drawer */}
			<Drawer
				variant="temporary"
				open={mobileOpen}
				onClose={onMobileClose}
				ModalProps={{
					keepMounted: true,
				}}
				sx={{
					display: { xs: 'block', lg: 'none' },
					'& .MuiDrawer-paper': {
						width: drawerWidth,
						boxSizing: 'border-box',
						backgroundColor: 'var(--panel)',
						color: 'var(--text-primary)',
						borderRight: '1px solid var(--border)',
						boxShadow: '0 10px 30px rgba(var(--text-primary-rgb),0.12)',
						mt: '48px',
					},
				}}
			>
			<SidebarContent
				pathname={pathname}
				session={session}
				onNavClick={onMobileClose}
			/>
			</Drawer>

			{/* Desktop Drawer */}
			<Drawer
				variant="permanent"
				sx={{
					display: { xs: 'none', lg: 'block' },
					width: drawerWidth,
					flexShrink: 0,
					'& .MuiDrawer-paper': {
						width: drawerWidth,
						boxSizing: 'border-box',
						backgroundColor: 'var(--panel)',
						color: 'var(--text-primary)',
						borderRight: '1px solid var(--border)',
						boxShadow: 'inset -1px 0 0 var(--border)',
						position: 'relative',
					},
				}}
			>
				<SidebarContent
					pathname={pathname}
					session={session}
				/>
			</Drawer>
		</>
	);
}

type NavItemProps = {
	item: NavigationItem;
	isActive: (href: string) => boolean;
	onNavClick?: () => void;
};

function NavItem({ item, isActive, onNavClick }: NavItemProps) {
	const Icon = item.icon;
	const active = isActive(item.href);

	return (
		<ListItemButton
			component={Link}
			href={item.href}
			onClick={onNavClick}
			selected={active}
			sx={{
				position: 'relative',
				borderRadius: 1.5,
				mx: 1,
				my: 0.25,
				py: 0.75,
				minHeight: 0,
				transition: 'all 0.2s ease',
				color: active ? 'var(--accent-gold)' : 'var(--text-primary)',
				bgcolor: active ? 'rgba(var(--accent-gold-rgb), 0.12)' : 'transparent',
				'&:hover': {
					bgcolor: 'rgba(var(--border-rgb), 0.4)',
					color: 'var(--text-primary)',
				},
				'&::before': active
					? {
							content: '""',
							position: 'absolute',
							left: 0,
							top: 4,
							bottom: 4,
							width: 3,
							borderRadius: '0 2px 2px 0',
							backgroundColor: 'var(--accent-gold)',
					  }
					: {},
			}}
		>
			<ListItemIcon
				sx={{
					minWidth: 32,
					color: active ? 'var(--accent-gold)' : 'var(--text-primary)',
				}}
			>
				<Icon sx={{ fontSize: 18 }} />
			</ListItemIcon>
			<ListItemText
				primary={item.name}
				primaryTypographyProps={{
					fontSize: '0.9rem',
					fontWeight: 500,
					color: 'inherit',
				}}
			/>
		</ListItemButton>
	);
}

type NavSectionProps = {
	title?: string;
	items: NavigationItem[];
	role?: string;
	isActive: (href: string) => boolean;
	onNavClick?: () => void;
};

function NavSection({ title, items, role, isActive, onNavClick }: NavSectionProps) {
	return (
		<Box sx={{ mb: 0.5 }}>
			{title && (
				<Box sx={{ px: 2, py: 0.5, mt: 1 }}>
					<Typography
						variant="caption"
						sx={{
							fontSize: '0.6875rem',
							fontWeight: 600,
							color: 'var(--text-secondary)',
							textTransform: 'uppercase',
							letterSpacing: 0.5,
						}}
					>
						{title}
					</Typography>
				</Box>
			)}
			<List sx={{ py: 0 }}>
				{items
					.filter((item) => !item.requiredPermission || hasPermission(role, item.requiredPermission))
				.map((item) => (
					<NavItem key={item.name} item={item} isActive={isActive} onNavClick={onNavClick} />
				))}
			</List>
		</Box>
	);
}

function SidebarContent({
	pathname,
	session,
	onNavClick,
}: {
	pathname: string;
	session: Session | null;
	onNavClick?: () => void;
}) {
	type AppUser = Session['user'] & { role?: string };
	const appUser = session?.user as AppUser | undefined;
	const userRole = appUser?.role;

	const isActive = (href: string) => {
		if (href === '/dashboard') {
			return pathname === '/dashboard';
		}
		return pathname.startsWith(href);
	};

	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				height: '100%',
				overflow: 'hidden',
			}}
		>
			{/* Navigation - Fixed height, no scroll */}
			<Box
				sx={{
					flex: 1,
					px: 0.5,
					py: 1.5,
					overflow: 'hidden',
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				{/* Main */}
				<NavSection items={mainNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} />

			{/* Shipments */}
			<NavSection title="Shipments" items={shipmentNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} />

			{/* Finance */}
			<NavSection title="Finance" items={financeNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} />

			{/* Admin / Internal Section */}
			<NavSection title="Admin" items={adminNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} />

				{/* Other */}
				<NavSection items={otherNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} />

			</Box>
		</Box>
	);
}
