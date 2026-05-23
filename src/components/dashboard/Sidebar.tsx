"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Session } from 'next-auth';
import type { SvgIconComponent } from '@mui/icons-material';
import { Dashboard, Inventory2, Description, Search, Analytics, Group, AllInbox, Receipt, AccountBalance, Payment, TrendingUp, Business, LocalShipping, SmartToy, PhoneInTalk, Route, ExpandLess, ExpandMore } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { Drawer, Box, List, ListItemButton, ListItemIcon, ListItemText, Typography, Collapse, IconButton } from '@mui/material';
import { hasPermission, type Permission } from '@/lib/rbac';

type NavigationItem = {
	name: string;
	href: string;
	icon: SvgIconComponent;
	requiredPermission?: Permission;
	allowedRoles?: string[];
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
		name: 'Banking',
		href: '/dashboard/finance/banking',
		icon: Payment,
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
		name: 'Partner Portals',
		href: '/dashboard/partner-portals',
		icon: Group,
		requiredPermission: 'customers:manage',
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
		name: 'Dispatches',
		href: '/dashboard/dispatches',
		icon: LocalShipping,
		requiredPermission: 'dispatches:manage',
	},
	{
		name: 'Transits',
		href: '/dashboard/transits',
		icon: Route,
		requiredPermission: 'transits:manage',
	},
	{
		name: 'Invoices',
		href: '/dashboard/invoices',
		icon: Receipt,
		requiredPermission: 'invoices:view',
	},
	{
		name: 'AI Logs',
		href: '/dashboard/ai-logs',
		icon: SmartToy,
		requiredPermission: 'shipments:read_all',
	},
	{
		name: 'Call Agent',
		href: '/dashboard/settings/call-agent',
		icon: PhoneInTalk,
		requiredPermission: 'users:manage',
		allowedRoles: ['admin'],
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
	type AppUser = Session['user'] & { role?: string };
	const appUser = session?.user as AppUser | undefined;
	const userRole = appUser?.role;
	const visibleAdminItems = filterNavigationItems(adminNavigation, userRole);
	const hasActiveAdminItem = visibleAdminItems.some((item) => isNavigationItemActive(pathname, item.href));
	const [adminCollapsedPreference, setAdminCollapsedPreference] = useState(false);

	const drawerWidth = 260;
	const adminCollapsed = hasActiveAdminItem ? false : adminCollapsedPreference;

	useEffect(() => {
		setAdminCollapsedPreference(window.localStorage.getItem(ADMIN_SECTION_STORAGE_KEY) === 'true');
	}, []);

	const toggleAdminCollapsed = () => {
		setAdminCollapsedPreference((prev) => {
			const next = !prev;
			window.localStorage.setItem(ADMIN_SECTION_STORAGE_KEY, String(next));
			return next;
		});
	};

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
				adminCollapsed={adminCollapsed}
				onToggleAdminCollapsed={toggleAdminCollapsed}
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
						height: '100%',
						overflow: 'hidden',
					},
				}}
			>
				<SidebarContent
					pathname={pathname}
					session={session}
					adminCollapsed={adminCollapsed}
					onToggleAdminCollapsed={toggleAdminCollapsed}
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

const ADMIN_SECTION_STORAGE_KEY = 'sidebar_admin_collapsed';

function isNavigationItemActive(pathname: string, href: string) {
	if (href === '/dashboard') {
		return pathname === '/dashboard';
	}

	return pathname.startsWith(href);
}

function filterNavigationItems(items: NavigationItem[], role?: string) {
	return items.filter(
		(item) =>
			(!item.requiredPermission || hasPermission(role, item.requiredPermission)) &&
			(!item.allowedRoles || (role ? item.allowedRoles.includes(role) : false))
	);
}

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
				{filterNavigationItems(items, role).map((item) => (
					<NavItem key={item.name} item={item} isActive={isActive} onNavClick={onNavClick} />
				))}
			</List>
		</Box>
	);
}

function CollapsibleAdminSection({
	items,
	role,
	isActive,
	onNavClick,
	collapsed,
	onToggleCollapsed,
}: NavSectionProps & {
	collapsed: boolean;
	onToggleCollapsed: () => void;
}) {
	const visibleItems = filterNavigationItems(items, role);

	return (
		<Box sx={{ mb: 0.5 }}>
			<Box
				sx={{
					px: 2,
					py: 0.5,
					mt: 1,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					cursor: 'pointer',
				}}
				onClick={onToggleCollapsed}
			>
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
					Admin
				</Typography>
				<IconButton
					size="small"
					onClick={(event) => {
						event.stopPropagation();
						onToggleCollapsed();
					}}
					sx={{
						p: 0.25,
						color: 'var(--text-secondary)',
					}}
					aria-label={collapsed ? 'Expand admin navigation' : 'Collapse admin navigation'}
				>
					{collapsed ? <ExpandMore sx={{ fontSize: 14 }} /> : <ExpandLess sx={{ fontSize: 14 }} />}
				</IconButton>
			</Box>
			<Collapse in={!collapsed}>
				<List sx={{ py: 0 }}>
					{visibleItems.map((item) => (
						<NavItem key={item.name} item={item} isActive={isActive} onNavClick={onNavClick} />
					))}
				</List>
			</Collapse>
		</Box>
	);
}

function SidebarContent({
	pathname,
	session,
	adminCollapsed,
	onToggleAdminCollapsed,
	onNavClick,
}: {
	pathname: string;
	session: Session | null;
	adminCollapsed: boolean;
	onToggleAdminCollapsed: () => void;
	onNavClick?: () => void;
}) {
	type AppUser = Session['user'] & { role?: string };
	const appUser = session?.user as AppUser | undefined;
	const userRole = appUser?.role;

	const isActive = (href: string) => {
		return isNavigationItemActive(pathname, href);
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
			{/* Navigation - scrollable */}
			<Box
				sx={{
					flex: 1,
					px: 0.5,
					py: 1.5,
					overflow: 'auto',
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
			<CollapsibleAdminSection items={adminNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} collapsed={adminCollapsed} onToggleCollapsed={onToggleAdminCollapsed} />

				{/* Other */}
				<NavSection items={otherNavigation} role={userRole} isActive={isActive} onNavClick={onNavClick} />

			</Box>
		</Box>
	);
}
