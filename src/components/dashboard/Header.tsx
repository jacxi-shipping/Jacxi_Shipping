"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
	AppBar,
	Toolbar,
	Box,
	Typography,
	IconButton,
	Avatar,
	Menu,
	MenuItem,
	Divider,
	Tooltip,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
	Settings,
	Logout,
	Person,
	Menu as MenuIcon,
  Add as AddIcon,
  Keyboard as KeyboardIcon,
} from '@mui/icons-material';
import { Ship, Package, FileText } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/design-system';
import { NotificationCenter } from '@/components/ui/NotificationCenter';

interface HeaderProps {
	onMenuClick?: () => void;
	pageTitle?: string;
}

const quickActions = [
  {
    icon: <Ship style={{ width: 20, height: 20 }} />,
    label: 'New Shipment',
    href: '/dashboard/shipments/new',
    color: '#3B82F6',
  },
  {
    icon: <Package style={{ width: 20, height: 20 }} />,
    label: 'New Container',
    href: '/dashboard/containers/new',
    color: '#10B981',
  },
  {
    icon: <FileText style={{ width: 20, height: 20 }} />,
    label: 'New Invoice',
    href: '/dashboard/invoices/new',
    color: '#F59E0B',
  },
];

export default function Header({ onMenuClick, pageTitle }: HeaderProps) {
	const { data: session } = useSession();
  const router = useRouter();
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [quickActionEl, setQuickActionEl] = useState<null | HTMLElement>(null);

	const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	};

	const handleMenuClose = () => {
		setAnchorEl(null);
	};
  
  const handleQuickActionOpen = (event: React.MouseEvent<HTMLElement>) => {
    setQuickActionEl(event.currentTarget);
  };

  const handleQuickActionClose = () => {
    setQuickActionEl(null);
  };

  const handleQuickActionClick = (href: string) => {
    handleQuickActionClose();
    router.push(href);
  };

	const handleSignOut = async () => {
		handleMenuClose();
		await signOut({ callbackUrl: '/' });
	};

  const toggleKeyboardShortcuts = () => {
    window.dispatchEvent(new CustomEvent('toggle-shortcut-help'));
  };

	return (
		<AppBar
			position="sticky"
			elevation={0}
			color="inherit"
			sx={{
				bgcolor: 'var(--panel)',
				borderBottom: '1px solid var(--border)',
				boxShadow: '0 8px 16px rgba(var(--text-primary-rgb),0.06)',
			}}
		>
			<Toolbar
				sx={{
					minHeight: 64,
					px: { xs: 2, sm: 3 },
					py: { xs: 1, sm: 1.5 },
					color: 'var(--text-primary)',
				}}
			>
				{/* Mobile Menu Button */}
				<IconButton
					edge="start"
					color="inherit"
					onClick={onMenuClick}
					sx={{
						mr: 2,
						display: { xs: 'flex', lg: 'none' },
						color: 'var(--text-primary)',
						p: 1,
					}}
				>
					<MenuIcon sx={{ fontSize: 24 }} />
				</IconButton>

				{/* Logo/Title */}
				<Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
					<Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
					<Box
						sx={{
							width: 32,
							height: 32,
							borderRadius: 1,
							backgroundColor: 'var(--accent-gold)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontWeight: 800,
							fontSize: '1rem',
							color: 'var(--background)',
						}}
					>
						J
					</Box>
					<Typography
						sx={{
							display: { xs: 'none', sm: 'block' },
							fontWeight: 700,
							fontSize: '1.125rem',
							color: 'var(--text-primary)',
						}}
					>
						JACXI
					</Typography>
					</Link>

					{/* Page Title (if provided) */}
					{pageTitle && (
						<>
							<Divider
								orientation="vertical"
								flexItem
								sx={{
									mx: 1.5,
									borderColor: 'var(--border)',
									display: { xs: 'none', md: 'block' },
								}}
							/>
							<Typography
								sx={{
									display: { xs: 'none', md: 'block' },
									fontSize: '0.875rem',
									color: 'var(--text-secondary)',
									fontWeight: 500,
								}}
							>
								{pageTitle}
							</Typography>
						</>
					)}
				</Box>

				{/* Right Actions */}
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* Quick Actions (FAB) */}
          <Tooltip title="Quick Actions">
            <IconButton
              onClick={handleQuickActionOpen}
              sx={{
                color: 'var(--accent-gold)',
                p: 1,
                mr: 0.5,
                '&:hover': {
                  bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
                },
              }}
            >
              <AddIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>

          {/* Keyboard Shortcuts */}
          <Tooltip title="Keyboard Shortcuts (?)">
            <IconButton
              onClick={toggleKeyboardShortcuts}
              sx={{
                color: 'var(--text-secondary)',
                p: 1,
                display: { xs: 'none', md: 'inline-flex' },
                '&:hover': {
                  bgcolor: 'rgba(var(--border-rgb), 0.4)',
                  color: 'var(--text-primary)',
                },
              }}
            >
              <KeyboardIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

					{/* Theme Toggle */}
					<ThemeToggle />
					
					{/* Notifications */}
					<NotificationCenter />

					{/* Settings */}
					<Tooltip title="Settings">
						<Link href="/dashboard/settings" style={{ textDecoration: 'none' }}>
							<IconButton
								sx={{
									color: 'var(--text-secondary)',
									p: 1,
									'&:hover': {
										bgcolor: 'rgba(var(--border-rgb), 0.4)',
										color: 'var(--text-primary)',
									},
								}}
							>
								<Settings sx={{ fontSize: 20 }} />
							</IconButton>
						</Link>
					</Tooltip>

					{/* Profile Menu */}
					<Tooltip title="Account">
						<IconButton
							onClick={handleProfileMenuOpen}
							sx={{
								ml: 1,
								p: 0.75,
							}}
						>
						<Avatar
							sx={{
								width: 32,
								height: 32,
								bgcolor: 'var(--accent-gold)',
								fontSize: '0.875rem',
								fontWeight: 600,
								color: 'var(--background)',
							}}
						>
								{session?.user?.name?.charAt(0).toUpperCase() || 'U'}
							</Avatar>
						</IconButton>
					</Tooltip>
				</Box>

				{/* Profile Dropdown Menu */}
				<Menu
					anchorEl={anchorEl}
					open={Boolean(anchorEl)}
					onClose={handleMenuClose}
					PaperProps={{
						sx: {
							mt: 1.5,
							minWidth: 200,
							bgcolor: 'var(--panel)',
							backdropFilter: 'blur(10px)',
							border: '1px solid var(--border)',
							borderRadius: 2,
							boxShadow: '0 8px 32px rgba(var(--text-primary-rgb),0.12)',
						},
					}}
					transformOrigin={{ horizontal: 'right', vertical: 'top' }}
					anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
				>
					{/* User Info */}
					<Box sx={{ px: 2, py: 1.5 }}>
						<Typography
							sx={{
								fontSize: '0.875rem',
								fontWeight: 600,
								color: 'var(--text-primary)',
								mb: 0.25,
							}}
						>
							{session?.user?.name || 'User'}
						</Typography>
						<Typography
							sx={{
								fontSize: '0.75rem',
								color: 'var(--text-secondary)',
							}}
						>
							{session?.user?.email}
						</Typography>
						<Typography
							sx={{
								fontSize: '0.6875rem',
								color: 'var(--accent-gold)',
								mt: 0.5,
								textTransform: 'uppercase',
								fontWeight: 600,
							}}
						>
							{session?.user?.role || 'user'}
						</Typography>
					</Box>

					<Divider sx={{ borderColor: 'var(--border)' }} />

					{/* Menu Items */}
					<Link href="/dashboard/profile" style={{ textDecoration: 'none' }}>
						<MenuItem
							onClick={handleMenuClose}
							sx={{
								color: 'var(--text-primary)',
								fontSize: '0.875rem',
								py: 1.25,
								'&:hover': {
									bgcolor: 'rgba(var(--border-rgb), 0.4)',
								},
							}}
						>
							<Person sx={{ mr: 1.5, fontSize: 20 }} />
							Profile
						</MenuItem>
					</Link>

					<Link href="/dashboard/settings" style={{ textDecoration: 'none' }}>
						<MenuItem
							onClick={handleMenuClose}
							sx={{
								color: 'var(--text-primary)',
								fontSize: '0.875rem',
								py: 1.25,
								'&:hover': {
									bgcolor: 'rgba(var(--border-rgb), 0.4)',
								},
							}}
						>
							<Settings sx={{ mr: 1.5, fontSize: 20 }} />
							Settings
						</MenuItem>
					</Link>

					<Divider sx={{ borderColor: 'var(--border)' }} />

					<MenuItem
						onClick={handleSignOut}
						sx={{
							color: 'var(--error)',
							fontSize: '0.875rem',
							py: 1.25,
							'&:hover': {
								bgcolor: 'rgba(var(--error-rgb), 0.1)',
								color: 'var(--error)',
							},
						}}
					>
						<Logout sx={{ mr: 1.5, fontSize: 20 }} />
						Sign Out
					</MenuItem>
				</Menu>
        
        {/* Quick Actions Menu */}
        <Menu
          anchorEl={quickActionEl}
          open={Boolean(quickActionEl)}
          onClose={handleQuickActionClose}
          PaperProps={{
            sx: {
              mt: 1.5,
              minWidth: 200,
              bgcolor: 'var(--panel)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--border)',
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(var(--text-primary-rgb),0.12)',
            }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5, pb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} textTransform="uppercase" fontSize="0.7rem">
              Create New
            </Typography>
          </Box>
          {quickActions.map((action) => (
            <MenuItem
              key={action.label}
              onClick={() => handleQuickActionClick(action.href)}
              sx={{
                py: 1.5,
                color: 'var(--text-primary)',
                '&:hover': {
                  bgcolor: 'rgba(var(--border-rgb), 0.4)',
                }
              }}
            >
              <ListItemIcon sx={{ color: action.color, minWidth: 36 }}>
                {action.icon}
              </ListItemIcon>
              <ListItemText 
                primary={action.label} 
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            </MenuItem>
          ))}
        </Menu>
			</Toolbar>
		</AppBar>
	);
}
