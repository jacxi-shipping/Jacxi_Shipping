'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { User, UserPlus, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Box, Typography, IconButton, Slide, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Alert } from '@mui/material';
import { Breadcrumbs, toast, EmptyState, SkeletonCard, SkeletonTable, Tooltip, StatusBadge, Button, CompactSkeleton } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SmartSearch, { SearchFilters } from '@/components/dashboard/SmartSearch';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import UserCard from '@/components/dashboard/UserCard';

interface UserData {
	id: string;
	name: string | null;
	email: string;
	role: string;
	createdAt?: string;
	_count?: {
		shipments: number;
	};
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
				toast.error('Failed to fetch users');
			}
		} catch (error) {
			console.error('Error fetching users:', error);
			toast.error('Error fetching users');
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

	const userColumns = useMemo<Column<UserData>[]>(() => [
		{
			key: 'name',
			header: 'User',
			sortable: true,
			render: (_, row) => (
				<Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
					<Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }} noWrap>
						{row.name || 'Unnamed User'}
					</Typography>
					<Typography variant="caption" color="text.secondary" noWrap>
						{formatRole(row.role)}
					</Typography>
				</Box>
			),
		},
		{
			key: 'email',
			header: 'Email',
			sortable: true,
			render: (_, row) => (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<Typography sx={{ fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: '0.8rem' }} noWrap>
						{showEmailsFor.has(row.id) ? row.email : maskEmail(row.email)}
					</Typography>
					<IconButton
						size="small"
						onClick={() => toggleEmailVisibility(row.id)}
						title="Toggle email visibility"
					>
						{showEmailsFor.has(row.id) ? (
							<EyeOff style={{ width: 16, height: 16 }} />
						) : (
							<Eye style={{ width: 16, height: 16 }} />
						)}
					</IconButton>
					{showEmailsFor.has(row.id) && (
						<IconButton
							size="small"
							onClick={() => copyToClipboard(row.email, row.id)}
							title="Copy email"
						>
							{copiedEmail === row.id ? (
								<Check style={{ color: 'green', width: 16, height: 16 }} />
							) : (
								<Copy style={{ color: 'var(--accent-gold)', width: 16, height: 16 }} />
							)}
						</IconButton>
					)}
				</Box>
			),
		},
		{
			key: 'shipments',
			header: 'Shipments',
			sortable: true,
			render: (_, row) => (
				<Typography sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
					{row._count?.shipments ?? 0}
				</Typography>
			),
		},
		{
			key: 'createdAt',
			header: 'Joined',
			sortable: true,
			render: (_, row) => (
				<Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
					{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
				</Typography>
			),
		},
		{
			key: 'actions',
			header: 'Actions',
			render: (_, row) => (
				<Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
					<Link href={`/dashboard/users/${row.id}`} style={{ textDecoration: 'none' }}>
						<Button
							variant="outline"
							size="sm"
							icon={<VisibilityIcon />}
							sx={{ textTransform: 'none', fontSize: '0.7rem' }}
						>
							View
						</Button>
					</Link>
					<Link href={`/dashboard/users/${row.id}/edit`} style={{ textDecoration: 'none' }}>
						<Button
							variant="ghost"
							size="sm"
							icon={<EditIcon />}
							sx={{ textTransform: 'none', fontSize: '0.7rem' }}
						>
							Edit
						</Button>
					</Link>
					<Button
						variant="ghost"
						size="sm"
						icon={<DeleteIcon />}
						onClick={() => handleDeleteClick(row.id)}
						sx={{ color: 'var(--error)' }}
					>
						Delete
					</Button>
				</Box>
			),
		},
	], [showEmailsFor, copiedEmail]);


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
					toast.success('User deleted successfully');
					setConfirmOpen(false);
					setDeletingUserId(null);
					// refresh current page (ensure we don't end up on an empty page)
					const nextPage = currentPage > 1 && users.length === 1 ? currentPage - 1 : currentPage;
					setCurrentPage(nextPage);
					await fetchUsers(nextPage, searchFilters.query);
				} else {
					toast.error('Failed to delete user');
				}
			} catch (err) {
				console.error('Error deleting user:', err);
				toast.error('Error deleting user');
			} finally {
				setLoading(false);
			}
		};

	const handleCancelDelete = () => {
		setConfirmOpen(false);
		setDeletingUserId(null);
	};

	if (status === 'loading') {
		return (
			<DashboardSurface>
				<Box sx={{ px: 2, pt: 2 }}>
					<Breadcrumbs />
				</Box>
				<DashboardPanel>
					<CompactSkeleton />
				</DashboardPanel>
			</DashboardSurface>
		);
	}

	const role = session?.user?.role;
	if (!session || role !== 'admin') {
		return null;
	}

	return (
		<DashboardSurface>
				{/* Breadcrumbs */}
				<Box sx={{ px: 2, pt: 2 }}>
					<Breadcrumbs />
				</Box>
			{/* Search Panel */}
			<DashboardPanel
				title="Team directory"
				description="All users in one view"
				noBodyPadding
				actions={
					<Link href="/dashboard/users/new" style={{ textDecoration: 'none' }}>
						<Button variant="primary" size="sm" sx={{ textTransform: 'none', fontWeight: 600 }}>
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
					<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
						{[...Array(6)].map((_, i) => (
							<SkeletonCard key={i} />
						))}
					</Box>
				) : paginatedUsers.length === 0 ? (
					<Box sx={{ minHeight: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
						<User style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.25)' }} />
						<Typography sx={{ color: 'var(--text-secondary)' }}>No users found</Typography>
						<Link href="/dashboard/users/new" style={{ textDecoration: 'none' }}>
							<Button variant="primary" size="sm" sx={{ mt: 1, textTransform: 'none' }}>
								<UserPlus style={{ width: 16, height: 16, marginRight: 8 }} /> Create User
							</Button>
						</Link>
					</Box>
				) : (
					<>
							<div className="hidden lg:block">
								<DataTable
									data={paginatedUsers}
									columns={userColumns}
									keyField="id"
								/>
							</div>
							<Box
								sx={{
									display: { xs: 'grid', lg: 'none' },
									gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
									gap: 2,
								}}
							>
								{paginatedUsers.map((user, index) => (
									<UserCard
										key={user.id}
										user={user}
										index={index}
										highlighted={highlightedUserId === user.id}
										showEmail={showEmailsFor.has(user.id)}
										copiedEmail={copiedEmail}
										onToggleEmail={toggleEmailVisibility}
										onCopyEmail={copyToClipboard}
										onDelete={handleDeleteClick}
									/>
								))}
							</Box>

						{/* Pagination Controls */}
						<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
							<Button variant="outline" size="sm" onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); fetchUsers(currentPage - 1, searchFilters.query); }} disabled={currentPage === 1} sx={{ textTransform: 'none' }}>
								Previous
							</Button>
							<Typography sx={{ color: 'var(--text-secondary)' }}>Page {currentPage} of {totalPages}</Typography>
							<Button variant="outline" size="sm" onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); fetchUsers(currentPage + 1, searchFilters.query); }} disabled={currentPage === totalPages} sx={{ textTransform: 'none' }}>
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
					<Button onClick={handleCancelDelete} variant="ghost">Cancel</Button>
					<Button onClick={handleConfirmDelete} variant="primary" color="error">Delete</Button>
				</DialogActions>
			</Dialog>

		</DashboardSurface>
	);
}
