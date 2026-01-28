'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FileText, ShieldCheck, Download, Upload, Search as SearchIcon, Folder } from 'lucide-react';
import { Box, Typography } from '@mui/material';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, StatsCard, ActionButton, EmptyState, LoadingState, FormField } from '@/components/design-system';

type DocumentCategory = {
	id: string;
	title: string;
	description: string;
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	iconColor: string;
	iconBg: string;
	documents: Array<{
		id: string;
		name: string;
		type: 'template' | 'upload';
		size?: string;
		updatedAt: string;
		status?: 'required' | 'optional' | 'archived';
	}>;
};

export default function DocumentsPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [search, setSearch] = useState('');
	const [loading, setLoading] = useState(false);

	const categories = useMemo<DocumentCategory[]>(
		() => [
			{
				id: 'templates',
				title: 'Company Templates',
				description: 'Download ready-to-use templates for invoices, statements, and compliance.',
				icon: FileText,
				iconColor: 'rgb(34, 211, 238)',
				iconBg: 'rgba(34, 211, 238, 0.15)',
				documents: [
					{
						id: 'template-invoice',
						name: 'Invoice Template (PDF)',
						type: 'template',
						size: '2.4 MB',
						updatedAt: '2025-11-01',
						status: 'required',
					},
					{
						id: 'template-bol',
						name: 'Bill of Lading (Editable)',
						type: 'template',
						size: '1.1 MB',
						updatedAt: '2025-10-24',
						status: 'required',
					},
					{
						id: 'template-compliance',
						name: 'Customs Compliance Checklist',
						type: 'template',
						size: '650 KB',
						updatedAt: '2025-10-18',
						status: 'optional',
					},
				],
			},
			{
				id: 'uploads',
				title: 'Uploaded Documents',
				description: 'Track documents uploaded for containers, shipments, and customer records.',
				icon: Upload,
				iconColor: 'rgb(59, 130, 246)',
				iconBg: 'rgba(59, 130, 246, 0.15)',
				documents: [
					{
						id: 'upload-manifest',
						name: 'Manifest - Container CNT-839AZ',
						type: 'upload',
						size: '4.8 MB',
						updatedAt: '2025-11-06',
						status: 'required',
					},
					{
						id: 'upload-customs',
						name: 'Customs Clearance Proof',
						type: 'upload',
						size: '3.2 MB',
						updatedAt: '2025-11-05',
						status: 'required',
					},
					{
						id: 'upload-insurance',
						name: 'Insurance Certificate',
						type: 'upload',
						size: '1.6 MB',
						updatedAt: '2025-11-02',
						status: 'optional',
					},
				],
			},
			{
				id: 'compliance',
				title: 'Compliance & Security',
				description: 'Policies, certifications, and legal references for operations.',
				icon: ShieldCheck,
				iconColor: 'rgb(168, 85, 247)',
				iconBg: 'rgba(168, 85, 247, 0.15)',
				documents: [
					{
						id: 'policy-gdpr',
						name: 'GDPR Compliance Pack',
						type: 'template',
						size: '5.4 MB',
						updatedAt: '2025-10-10',
						status: 'optional',
					},
					{
						id: 'policy-iso',
						name: 'ISO 9001 Certification',
						type: 'template',
						size: '3.6 MB',
						updatedAt: '2025-09-28',
						status: 'optional',
					},
					{
						id: 'policy-sop',
						name: 'Security SOP (Internal)',
						type: 'template',
						size: '2.1 MB',
						updatedAt: '2025-09-12',
						status: 'required',
					},
				],
			},
		],
		[]
	);

	const filteredCategories = useMemo(() => {
		const value = search.trim().toLowerCase();
		if (!value) return categories;

		return categories
			.map((category) => ({
				...category,
				documents: category.documents.filter((doc) => doc.name.toLowerCase().includes(value)),
			}))
			.filter((category) => category.documents.length > 0);
	}, [categories, search]);

	const stats = useMemo(
		() => {
			const allDocs = categories.flatMap(c => c.documents);
			return {
				total: allDocs.length,
				required: allDocs.filter(d => d.status === 'required').length,
				categories: categories.length,
				storage: '3.1 GB',
			};
		},
		[categories]
	);

	useEffect(() => {
		if (status === 'loading') return;
		const role = session?.user?.role;
		if (!session || role !== 'admin') {
			router.replace('/dashboard');
		}
	}, [session, status, router]);

	const role = session?.user?.role;
	if (status === 'loading' || !session || role !== 'admin') {
		return <LoadingState fullScreen message="Loading documents..." />;
	}

	return (
		<DashboardSurface>
			<PageHeader
				title="Documents"
				description="Manage templates, uploads, and compliance documents"
				actions={
					<>
						<ActionButton variant="outline" icon={<Download className="w-4 h-4" />} size="small">
							Download All
						</ActionButton>
						<ActionButton variant="primary" icon={<Upload className="w-4 h-4" />} size="small">
							Upload Document
						</ActionButton>
					</>
				}
			/>

			{/* Stats */}
			<DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
				<StatsCard
					icon={<FileText style={{ fontSize: 18 }} />}
					title="Total Documents"
					value={stats.total}
					subtitle="All documents"
				/>
				<StatsCard
					icon={<Folder style={{ fontSize: 18 }} />}
					title="Categories"
					value={stats.categories}
					subtitle="Document types"
					iconColor="rgb(59, 130, 246)"
					iconBg="rgba(59, 130, 246, 0.15)"
					delay={0.1}
				/>
				<StatsCard
					icon={<ShieldCheck style={{ fontSize: 18 }} />}
					title="Required"
					value={stats.required}
					subtitle="Must be updated"
					iconColor="rgb(239, 68, 68)"
					iconBg="rgba(239, 68, 68, 0.15)"
					delay={0.2}
				/>
				<StatsCard
					icon={<Upload style={{ fontSize: 18 }} />}
					title="Storage"
					value={stats.storage}
					subtitle="Total size"
					iconColor="rgb(168, 85, 247)"
					iconBg="rgba(168, 85, 247, 0.15)"
					delay={0.3}
				/>
			</DashboardGrid>

			{/* Search */}
			<DashboardPanel title="Search Documents" description="Find documents by name">
				<FormField
					label=""
					placeholder="Search documents..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					leftIcon={<SearchIcon style={{ fontSize: 20, color: 'var(--text-secondary)' }} />}
				/>
			</DashboardPanel>

			{/* Categories */}
			{filteredCategories.length === 0 ? (
				<DashboardPanel fullHeight>
					<EmptyState
						icon={<FileText />}
						title="No documents found"
						description={`No documents match "${search}". Try a different search term.`}
					/>
				</DashboardPanel>
			) : (
				filteredCategories.map((category) => {
					const Icon = category.icon;
					return (
						<DashboardPanel
							key={category.id}
							title={category.title}
							description={category.description}
							actions={
								<Box
									sx={{
										width: 40,
										height: 40,
										borderRadius: 2,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										bgcolor: category.iconBg,
										color: category.iconColor,
									}}
								>
									<Icon style={{ fontSize: 20 }} />
								</Box>
							}
						>
							<DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
								{category.documents.map((document) => (
									<Box
										key={document.id}
										sx={{
											borderRadius: 2,
											border: '1px solid var(--border)',
											background: 'var(--panel)',
											boxShadow: '0 8px 20px rgba(var(--text-primary-rgb), 0.06)',
											p: 2,
											cursor: 'pointer',
											transition: 'all 0.2s ease',
											'&:hover': {
												transform: 'translateY(-2px)',
												boxShadow: '0 16px 32px rgba(var(--text-primary-rgb), 0.1)',
												borderColor: category.iconColor,
											},
										}}
									>
										<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
											<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
												{document.name}
											</Typography>
											{document.status && (
												<Box
													sx={{
														px: 1,
														py: 0.5,
														borderRadius: 1,
														fontSize: '0.65rem',
														fontWeight: 600,
														textTransform: 'uppercase',
														...(document.status === 'required'
															? { bgcolor: 'rgba(239, 68, 68, 0.15)', color: 'rgb(239, 68, 68)', border: '1px solid rgba(239, 68, 68, 0.3)' }
															: { bgcolor: 'rgba(34, 211, 238, 0.15)', color: 'rgb(34, 211, 238)', border: '1px solid rgba(34, 211, 238, 0.3)' }),
													}}
												>
													{document.status}
												</Box>
											)}
										</Box>

										<Box sx={{ display: 'flex', gap: 2, mb: 2, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
											<Box
												sx={{
													px: 1.5,
													py: 0.5,
													borderRadius: 1,
													bgcolor: 'var(--background)',
													textTransform: 'capitalize',
												}}
											>
												{document.type}
											</Box>
											{document.size && <span>{document.size}</span>}
											<span>Updated {new Date(document.updatedAt).toLocaleDateString()}</span>
										</Box>

										<Box sx={{ display: 'flex', gap: 1 }}>
											<ActionButton variant="outline" size="small" sx={{ flex: 1 }}>
												<Download className="w-3 h-3 mr-1" />
												Download
											</ActionButton>
											<ActionButton variant="ghost" size="small">
												View
											</ActionButton>
										</Box>
									</Box>
								))}
							</DashboardGrid>
						</DashboardPanel>
					);
				})
			)}
		</DashboardSurface>
	);
}
