'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { User, UserPlus, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Button, Box, CircularProgress, Typography, IconButton, Slide, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SmartSearch, { SearchFilters } from '@/components/dashboard/SmartSearch';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';

interface UserData {
	id: string;
	name: string | null;
	email: string;
	role: string;
	createdAt?: string;
}

export default function UsersPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [users, setUsers] = useState<UserData[]>([]);
	const [loading, setLoading] = useState(true);
	const [totalUsers, setTotalUsers] = useState<number>(0);
	const [adminsCount, setAdminsCount] = useState<number>(0);
	const [regularUsersCount, setRegularUsersCount] = useState<number>(0);
	const [currentPage, setCurrentPage] = useState<number>(1);

	// Confirmation modal state
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
	const [searchFilters, setSearchFilters] = useState<SearchFilters>({
		query: '',
		type: 'users',
	});
	const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
	const [showEmailsFor, setShowEmailsFor] = useState<Set<string>>(new Set());
	const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
	const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null);

	useEffect(() => {
		if (status === 'loading') return;

		const role = session?.user?.role;
		if (!session || role !== 'admin') {
			router.replace('/dashboard');
			return;
		}
	}, [session, status, router]);

	const PAGE_SIZE = 9;

	const fetchUsers = useCallback(async (page: number = 1, query: string = searchFilters.query) => {
		try {
			setLoading(true);
			const url = `/api/users?page=${page}&pageSize=${PAGE_SIZE}${query ? `&query=${encodeURIComponent(query)}` : ''}`;
			const response = await fetch(url);
			if (response.ok) {
				const data = await response.json();

				// Merge any optimistically created user stored in sessionStorage
				let serverUsers = data.users || [];
				let createdJson: string | null = null;
				let createdUser: UserData | null = null;
				try {
					createdJson = sessionStorage.getItem('jacxi.createdUser');
					if (createdJson) {
						createdUser = JSON.parse(createdJson) as UserData;
						// If not already present in server results, prepend it
						if (createdUser && !serverUsers.some((u: UserData) => u.id === createdUser!.id)) {
							serverUsers = [createdUser, ...serverUsers];
							// adjust counts
							if (createdUser.role === 'admin') {
								data.admins = (data.admins ?? 0) + 1;
							} else {
								data.regularUsers = (data.regularUsers ?? 0) + 1;
							}
							data.total = (data.total ?? 0) + 1;
							// clear the saved created user so we don't reuse it again
							sessionStorage.removeItem('jacxi.createdUser');
						}
					}
				} catch {
					// ignore parse/storage errors
				}

				setUsers(serverUsers);
				setTotalUsers(data.total ?? 0);
				setAdminsCount(data.admins ?? 0);
				setRegularUsersCount(data.regularUsers ?? 0);
				setCurrentPage(data.page ?? page);
			} else {
				console.error('Failed to fetch users (response not ok)', response.status);
				setSnackbar({ open: true, message: 'Failed to fetch users', severity: 'error' });
			}
		} catch (error) {
			console.error('Error fetching users:', error);
			setSnackbar({ open: true, message: 'Error fetching users', severity: 'error' });
		} finally {
			setLoading(false);
		}
	}, [searchFilters.query]);

	// Listen for created users from BroadcastChannel and insert them optimistically
	useEffect(() => {
		if (typeof BroadcastChannel === 'undefined') return;
		const bc = new BroadcastChannel('jacxi-users');
		const handler = (ev: MessageEvent) => {
			try {
				const msg = ev.data as { action: string; user?: UserData };
				if (msg?.action === 'created' && msg.user) {
					setUsers((prev) => {
						if (prev.some((u) => u.id === msg.user!.id)) return prev;
						return [msg.user!, ...prev];
					});
					setTotalUsers((t) => t + 1);
					if (msg.user.role === 'admin') setAdminsCount((a) => a + 1);
					else setRegularUsersCount((r) => r + 1);
					setHighlightedUserId(msg.user.id);
					setTimeout(() => setHighlightedUserId(null), 4000);
				}
			} catch {
				// ignore
			}
		};
		bc.addEventListener('message', handler as EventListener);
		return () => {
			bc.removeEventListener('message', handler as EventListener);
			bc.close();
		};
	}, []);

	useEffect(() => {
		if (status === 'loading') return;
		const role = session?.user?.role;
		if (!session || role !== 'admin') return;
		fetchUsers(currentPage);
	}, [session, status, router, currentPage, fetchUsers]);

	const handleSearch = (filters: SearchFilters) => {
		setSearchFilters(filters);
		setCurrentPage(1);
		fetchUsers(1, filters.query);
	};

	// paginatedUsers is just users; server already paginates and filters

	// stats come from server-side counts
	const statsTotal = totalUsers;
	const statsAdmins = adminsCount;
	const statsRegularUsers = regularUsersCount;

  const formatRole = (role: string) => {
	return role.charAt(0).toUpperCase() + role.slice(1);
  };

	const toggleEmailVisibility = (userId: string) => {
		setShowEmailsFor((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(userId)) {
				newSet.delete(userId);
			} else {
				newSet.add(userId);
			}
			return newSet;
		});
	};

	const copyToClipboard = async (text: string, userId: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedEmail(userId);
			setTimeout(() => setCopiedEmail(null), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};

	const maskEmail = (email: string) => {
		const [username, domain] = email.split('@');
		if (username.length <= 3) {
			return `${username[0]}***@${domain}`;
		}
		return `${username.substring(0, 3)}***@${domain}`;
	};


		// Pagination helpers
		const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
		const paginatedUsers = users; // server already paginates

		const handleDeleteClick = (id: string) => {
			setDeletingUserId(id);
			setConfirmOpen(true);
		};

		const handleConfirmDelete = async () => {
			if (!deletingUserId) return;
			try {
				setLoading(true);
				const resp = await fetch(`/api/users/${deletingUserId}`, { method: 'DELETE' });
				if (resp.ok) {
					setSnackbar({ open: true, message: 'User deleted successfully', severity: 'success' });
					setConfirmOpen(false);
					setDeletingUserId(null);
					// refresh current page (ensure we don't end up on an empty page)
					const nextPage = currentPage > 1 && users.length === 1 ? currentPage - 1 : currentPage;
					setCurrentPage(nextPage);
					await fetchUsers(nextPage, searchFilters.query);
				} else {
					setSnackbar({ open: true, message: 'Failed to delete user', severity: 'error' });
				}
			} catch (err) {
				console.error('Error deleting user:', err);
				setSnackbar({ open: true, message: 'Error deleting user', severity: 'error' });
			} finally {
				setLoading(false);
			}
		};

		const handleCancelDelete = () => {
			setConfirmOpen(false);
			setDeletingUserId(null);
		};

		function UserCard({ user, index, highlighted = false }: { user: UserData; index: number; highlighted?: boolean }) {
			const [visible, setVisible] = useState(false);
			useEffect(() => {
				const t = setTimeout(() => setVisible(true), index * 60);
				return () => clearTimeout(t);
			}, [index]);

			return (
				<Slide in={visible} direction="up" timeout={600}>
					<Box
						sx={{
							p: { xs: 1.5, md: 2 },
							borderRadius: 2,
							background: 'var(--panel)',
							boxShadow: highlighted ? '0 36px 48px rgba(56,189,248,0.12)' : '0 18px 32px rgba(var(--text-primary-rgb), 0.08)',
							border: highlighted ? '1px solid rgba(56,189,248,0.14)' : 'none',
							transition: 'transform 200ms ease, box-shadow 200ms ease, border 200ms ease',
							'&:hover': {
								transform: 'translateY(-6px)',
								boxShadow: highlighted ? '0 46px 58px rgba(56,189,248,0.16)' : '0 28px 48px rgba(var(--text-primary-rgb), 0.12)'
							}
						}}
					>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
							<Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'rgba(6,182,212,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
								<User style={{ width: 20, height: 20, color: 'var(--accent-gold)' }} />
							</Box>
							<Box sx={{ flex: 1, minWidth: 0 }}>
								<Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }} noWrap>
								</Typography>
								<Typography variant="caption" color="text.secondary" noWrap>
									{formatRole(user.role)}
								</Typography>
							</Box>
							<Box>
								<IconButton size="small" onClick={() => toggleEmailVisibility(user.id)} title="Toggle email visibility">
									{showEmailsFor.has(user.id) ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
								</IconButton>
							</Box>
						</Box>

						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
							<Typography variant="caption" color="text.secondary" sx={{ minWidth: 90 }}>
								Email
							</Typography>
							<Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
								<Typography sx={{ fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' }} noWrap>
									{showEmailsFor.has(user.id) ? user.email : maskEmail(user.email)}
								</Typography>
								{showEmailsFor.has(user.id) && (
									<IconButton size="small" onClick={() => copyToClipboard(user.email, user.id)} title="Copy email">
										{copiedEmail === user.id ? <Check style={{ color: 'green', width: 16, height: 16 }} /> : <Copy style={{ color: 'var(--accent-gold)', width: 16, height: 16 }} />}
									</IconButton>
								)}
							</Box>
						</Box>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
							<Typography variant="caption" color="text.secondary" sx={{ minWidth: 90 }}>
								Password
							</Typography>
							<Typography variant="body2" color="text.secondary">
								••••••••••
							</Typography>
						</Box>

						{user.createdAt && (
							<Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
								<Typography variant="caption" color="text.secondary">
									Joined {new Date(user.createdAt).toLocaleDateString()}
								</Typography>
							</Box>
						)}

						<Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
							<Link href={`/dashboard/users/${user.id}`} style={{ textDecoration: 'none' }}>
								<Button variant="outlined" size="small" startIcon={<VisibilityIcon />} sx={{ textTransform: 'none', fontSize: '0.7rem' }}>
									View
								</Button>
							</Link>
							<Link href={`/dashboard/users/${user.id}/edit`} style={{ textDecoration: 'none' }}>
								<Button variant="text" size="small" startIcon={<EditIcon />} sx={{ textTransform: 'none', fontSize: '0.7rem' }}>
									Edit
								</Button>
							</Link>
								<Button variant="text" size="small" startIcon={<DeleteIcon />} onClick={() => handleDeleteClick(user.id)} sx={{ color: 'var(--error)' }}>
									Delete
								</Button>
						</Box>
					</Box>
				</Slide>
			);
		}

	if (status === 'loading' || loading) {
		return (
			<div className="light-surface min-h-screen bg-[var(--background)] flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--border)] border-t-[var(--accent-gold)]"></div>
			</div>
		);
	}

	const role = session?.user?.role;
	if (!session || role !== 'admin') {
		return null;
	}

	return (
		<DashboardSurface>
			{/* Search Panel */}
			<DashboardPanel
				title="Team directory"
				description="All users in one view"
				noBodyPadding
				actions={
					<Link href="/dashboard/users/new" style={{ textDecoration: 'none' }}>
						<Button variant="contained" size="small" sx={{ textTransform: 'none', fontWeight: 600 }}>
							<UserPlus style={{ width: 16, height: 16, marginRight: 8 }} />
							Create User
						</Button>
					</Link>
				}
			>
				<Box sx={{ px: 1.5, py: 1.5 }}>
					<SmartSearch
						onSearch={handleSearch}
						placeholder="Search users by name or email..."
						showTypeFilter={false}
						showStatusFilter={false}
						showDateFilter
						showPriceFilter={false}
						showUserFilter={false}
						defaultType="users"
					/>
				</Box>
			</DashboardPanel>

			{/* Results Panel */}
			<DashboardPanel title={`All Users (${totalUsers})`} fullHeight>
				{/* Stats */}
				<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, mb: 2 }}>
					<Box sx={{ p: 2, bgcolor: 'var(--text-primary)/0.04', borderRadius: 1, border: '1px solid rgba(6,182,212,0.12)' }}>
						<Typography variant="caption" color="text.secondary">
							Total Users
						</Typography>
						<Typography variant="h5" sx={{ fontWeight: 700 }}>
							{statsTotal}
						</Typography>
					</Box>

					<Box sx={{ p: 2, bgcolor: 'var(--text-primary)/0.04', borderRadius: 1, border: '1px solid rgba(124,58,237,0.08)' }}>
						<Typography variant="caption" color="text.secondary">
							Admins
						</Typography>
						<Typography variant="h5" sx={{ fontWeight: 700 }}>
							{statsAdmins}
						</Typography>
					</Box>

					<Box sx={{ p: 2, bgcolor: 'var(--text-primary)/0.04', borderRadius: 1, border: '1px solid rgba(16,185,129,0.08)' }}>
						<Typography variant="caption" color="text.secondary">
							Regular Users
						</Typography>
						<Typography variant="h5" sx={{ fontWeight: 700 }}>
							{statsRegularUsers}
						</Typography>
					</Box>

					<Box sx={{ p: 2, bgcolor: 'var(--text-primary)/0.04', borderRadius: 1, border: '1px solid rgba(6,182,212,0.12)' }}>
						<Typography variant="caption" color="text.secondary">
							Filtered Results
						</Typography>
						<Typography variant="h5" sx={{ fontWeight: 700 }}>
							{totalUsers}
						</Typography>
					</Box>
				</Box>

				{/* Content */}
				{loading ? (
					<Box sx={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
						<CircularProgress size={30} sx={{ color: 'var(--accent-gold)' }} />
					</Box>
				) : paginatedUsers.length === 0 ? (
					<Box sx={{ minHeight: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
						<User style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.25)' }} />
						<Typography sx={{ color: 'var(--text-secondary)' }}>No users found</Typography>
						<Link href="/dashboard/users/new" style={{ textDecoration: 'none' }}>
							<Button variant="contained" size="small" sx={{ mt: 1, textTransform: 'none' }}>
								<UserPlus style={{ width: 16, height: 16, marginRight: 8 }} /> Create User
							</Button>
						</Link>
					</Box>
				) : (
					<>
						<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
							{paginatedUsers.map((user, index) => (
								<UserCard key={user.id} user={user} index={index} highlighted={highlightedUserId === user.id} />
							))}
						</Box>

						{/* Pagination Controls */}
						<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
							<Button variant="outlined" size="small" onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); fetchUsers(currentPage - 1, searchFilters.query); }} disabled={currentPage === 1} sx={{ textTransform: 'none' }}>
								Previous
							</Button>
							<Typography sx={{ color: 'var(--text-secondary)' }}>Page {currentPage} of {totalPages}</Typography>
							<Button variant="outlined" size="small" onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); fetchUsers(currentPage + 1, searchFilters.query); }} disabled={currentPage === totalPages} sx={{ textTransform: 'none' }}>
								Next
							</Button>
						</Box>
					</>
				)}
			</DashboardPanel>

			{/* Delete confirmation dialog */}
			<Dialog open={confirmOpen} onClose={handleCancelDelete} aria-labelledby="confirm-delete-title">
				<DialogTitle id="confirm-delete-title">Confirm delete</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Are you sure you want to delete this user? This action cannot be undone.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCancelDelete} variant="text">Cancel</Button>
					<Button onClick={handleConfirmDelete} variant="contained" color="error">Delete</Button>
				</DialogActions>
			</Dialog>

			{/* Snackbar for feedback */}
			<Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
				<Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</DashboardSurface>
	);
}

