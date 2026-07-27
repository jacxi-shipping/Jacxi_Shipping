'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Box, Typography } from '@mui/material';
import { Package, Ship, MapPin, TrendingUp, Calendar, FileText, DollarSign, Receipt } from 'lucide-react';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, StatsCard, ActionButton, EmptyState, LoadingState, FormField } from '@/components/design-system';

interface Container {
  id: string;
  containerNumber: string;
  trackingNumber: string | null;
  vesselName: string | null;
  shippingLine: string | null;
  destinationPort: string | null;
  estimatedArrival: string | null;
  status: string;
  progress: number;
  currentCount: number;
  maxCapacity: number;
  createdAt: string;
  _count: {
    shipments: number;
    expenses: number;
    invoices: number;
    documents: number;
  };
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  CREATED: { bg: 'rgba(156, 163, 175, 0.15)', text: 'rgb(156, 163, 175)', border: 'rgba(156, 163, 175, 0.3)' },
  WAITING_FOR_LOADING: { bg: 'rgba(251, 191, 36, 0.15)', text: 'rgb(251, 191, 36)', border: 'rgba(251, 191, 36, 0.3)' },
  LOADED: { bg: 'rgba(59, 130, 246, 0.15)', text: 'rgb(59, 130, 246)', border: 'rgba(59, 130, 246, 0.3)' },
  IN_TRANSIT: { bg: 'rgba(99, 102, 241, 0.15)', text: 'rgb(99, 102, 241)', border: 'rgba(99, 102, 241, 0.3)' },
  ARRIVED_PORT: { bg: 'rgba(34, 197, 94, 0.15)', text: 'rgb(34, 197, 94)', border: 'rgba(34, 197, 94, 0.3)' },
  CUSTOMS_CLEARANCE: { bg: 'rgba(249, 115, 22, 0.15)', text: 'rgb(249, 115, 22)', border: 'rgba(249, 115, 22, 0.3)' },
  RELEASED: { bg: 'rgba(20, 184, 166, 0.15)', text: 'rgb(20, 184, 166)', border: 'rgba(20, 184, 166, 0.3)' },
  CLOSED: { bg: 'rgba(107, 114, 128, 0.15)', text: 'rgb(107, 114, 128)', border: 'rgba(107, 114, 128, 0.3)' },
};

const statusLabels: Record<string, string> = {
  CREATED: 'Created',
  WAITING_FOR_LOADING: 'Waiting',
  LOADED: 'Loaded',
  IN_TRANSIT: 'In Transit',
  ARRIVED_PORT: 'Arrived',
  CUSTOMS_CLEARANCE: 'Customs',
  RELEASED: 'Released',
  CLOSED: 'Closed',
};

export default function ContainersPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetchContainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, searchQuery]);

  const fetchContainers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/containers?${params}`);
      const data = await response.json();

      if (response.ok) {
        setContainers(data.containers);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching containers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchContainers();
  };

  const stats = {
    total: containers.length,
    inTransit: containers.filter(c => c.status === 'IN_TRANSIT').length,
    arrived: containers.filter(c => c.status === 'ARRIVED_PORT' || c.status === 'RELEASED').length,
    avgCapacity: containers.length > 0 
      ? Math.round((containers.reduce((sum, c) => sum + (c.currentCount / c.maxCapacity * 100), 0) / containers.length))
      : 0,
  };

  if (loading && containers.length === 0) {
    return (
      <AdminRoute>
        <LoadingState fullScreen message="Loading containers..." />
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <DashboardSurface>
        <PageHeader
          title="Containers"
          description="Manage shipping containers and tracking"
          actions={
            <Link href="/dashboard/containers/new" style={{ textDecoration: 'none' }}>
              <ActionButton variant="primary" icon={<Package className="w-4 h-4" />}>
                New Container
              </ActionButton>
            </Link>
          }
        />

        {/* Stats */}
        <DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={<Package style={{ fontSize: 18 }} />}
            title="Total Containers"
            value={stats.total}
            subtitle="All containers"
          />
          <StatsCard
            icon={<Ship style={{ fontSize: 18 }} />}
            title="In Transit"
            value={stats.inTransit}
            subtitle="Currently shipping"
            iconColor="rgb(99, 102, 241)"
            iconBg="rgba(99, 102, 241, 0.15)"
            delay={0.1}
          />
          <StatsCard
            icon={<MapPin style={{ fontSize: 18 }} />}
            title="Arrived"
            value={stats.arrived}
            subtitle="At destination"
            iconColor="rgb(34, 197, 94)"
            iconBg="rgba(34, 197, 94, 0.15)"
            delay={0.2}
          />
          <StatsCard
            icon={<TrendingUp style={{ fontSize: 18 }} />}
            title="Avg Capacity"
            value={`${stats.avgCapacity}%`}
            subtitle="Container utilization"
            iconColor="rgb(20, 184, 166)"
            iconBg="rgba(20, 184, 166, 0.15)"
            delay={0.3}
          />
        </DashboardGrid>

        {/* Filters */}
        <DashboardPanel title="Search & Filter" description="Find containers quickly">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <form onSubmit={handleSearch}>
                <FormField
                  label=""
                  placeholder="Search by container #, tracking #, vessel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Package style={{ fontSize: 20, color: 'var(--text-secondary)' }} />}
                />
              </form>
            </Box>
            <Box sx={{ minWidth: { xs: '100%', md: 200 } }}>
              <Typography
                component="label"
                sx={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  mb: 1,
                }}
              >
                Status Filter
              </Typography>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '16px',
                  border: '1px solid rgba(var(--border-rgb), 0.9)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              >
                <option value="all">All Status</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Box>
          </Box>
        </DashboardPanel>

        {/* Container Grid */}
        <DashboardPanel title={`All Containers (${containers.length})`} fullHeight>
          {loading ? (
            <LoadingState message="Loading containers..." />
          ) : containers.length === 0 ? (
            <EmptyState
              icon={<Package />}
              title="No containers found"
              description="Create your first container to get started"
              action={
                <Link href="/dashboard/containers/new" style={{ textDecoration: 'none' }}>
                  <ActionButton variant="primary">Create First Container</ActionButton>
                </Link>
              }
            />
          ) : (
            <>
              <DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {containers.map((container, index) => (
                  <Box
                    key={container.id}
                    onClick={() => router.push(`/dashboard/containers/${container.id}`)}
                    sx={{
                      borderRadius: 2,
                      border: '1px solid var(--border)',
                      background: 'var(--panel)',
                      boxShadow: '0 12px 30px rgba(var(--text-primary-rgb), 0.08)',
                      p: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 20px 40px rgba(var(--text-primary-rgb), 0.12)',
                      },
                    }}
                  >
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box>
                        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {container.containerNumber}
                        </Typography>
                        {container.trackingNumber && (
                          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                            {container.trackingNumber}
                          </Typography>
                        )}
                      </Box>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          ...statusColors[container.status],
                          border: `1px solid ${statusColors[container.status].border}`,
                          bgcolor: statusColors[container.status].bg,
                          color: statusColors[container.status].text,
                        }}
                      >
                        {statusLabels[container.status]}
                      </Box>
                    </Box>

                    {/* Progress */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Progress
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {container.progress}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: '100%',
                          height: 6,
                          borderRadius: 1,
                          bgcolor: 'var(--background)',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${container.progress}%`,
                            height: '100%',
                            bgcolor: 'var(--accent-gold)',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Details */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                      {container.vesselName && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Ship style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
                          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {container.vesselName}
                          </Typography>
                        </Box>
                      )}
                      {container.destinationPort && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MapPin style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
                          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {container.destinationPort}
                          </Typography>
                        </Box>
                      )}
                      {container.estimatedArrival && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Calendar style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
                          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            ETA: {new Date(container.estimatedArrival).toLocaleDateString()}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Stats */}
                    <Box
                      sx={{
                        pt: 2,
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Package style={{ fontSize: 14, color: 'var(--accent-gold)' }} />
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {container._count.shipments}/{container.maxCapacity}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <FileText style={{ fontSize: 12 }} />
                          <span>{container._count.documents}</span>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <DollarSign style={{ fontSize: 12 }} />
                          <span>{container._count.expenses}</span>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Receipt style={{ fontSize: 12 }} />
                          <span>{container._count.invoices}</span>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </DashboardGrid>

              {/* Pagination */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 3 }}>
                  <ActionButton
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    size="small"
                  >
                    Previous
                  </ActionButton>
                  <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Page {page} of {totalPages}
                  </Typography>
                  <ActionButton
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    size="small"
                  >
                    Next
                  </ActionButton>
                </Box>
              )}
            </>
          )}
        </DashboardPanel>
      </DashboardSurface>
    </AdminRoute>
  );
}
