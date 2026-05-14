'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { Box } from '@mui/material';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, EmptyState, toast } from '@/components/design-system';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { hasPermission } from '@/lib/rbac';
import { useSession } from 'next-auth/react';

type PortalSummary = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  memberships?: Array<{ role: string }>;
  _count?: {
    memberships?: number;
    customers?: number;
    shipmentAssignments?: number;
  };
};

export default function PartnerPortalsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [portals, setPortals] = useState<PortalSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const canAccess = hasPermission(session?.user?.role, 'customers:manage') || hasPermission(session?.user?.role, 'users:manage');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !canAccess) {
      router.replace('/dashboard');
    }
  }, [canAccess, router, session, status]);

  const fetchPortals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/partner-portals', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load partner portals');
      }

      setPortals(data.portals || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load partner portals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && canAccess) {
      void fetchPortals();
    }
  }, [status, canAccess]);

  const columns = useMemo<Column<PortalSummary>[]>(() => [
    { key: 'name', header: 'Portal', sortable: true },
    {
      key: 'code',
      header: 'Code',
      render: (_, row) => row.code || '—',
    },
    {
      key: 'memberships',
      header: 'Members',
      render: (_, row) => row._count?.memberships || 0,
    },
    {
      key: 'customers',
      header: 'Customers',
      render: (_, row) => row._count?.customers || 0,
    },
    {
      key: 'shipments',
      header: 'Assigned Shipments',
      render: (_, row) => row._count?.shipmentAssignments || 0,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <Link href={`/dashboard/partner-portals/${row.id}`} style={{ textDecoration: 'none' }}>
          <Button variant="outline" size="sm">Manage</Button>
        </Link>
      ),
    },
  ], []);

  if (status === 'loading' || !session || !canAccess) {
    return null;
  }

  return (
    <DashboardSurface>
      <Box sx={{ px: 2, pt: 2 }}>
        <Breadcrumbs />
      </Box>

      <DashboardPanel
        title="Partner Portals"
        description="Manage partner workspaces and hand off selected shipments into them"
        actions={
          <Link href="/dashboard/partner-portals/new" style={{ textDecoration: 'none' }}>
            <Button variant="primary" icon={<AddIcon />}>New Portal</Button>
          </Link>
        }
      >
        {loading ? (
          <Box sx={{ color: 'var(--text-secondary)' }}>Loading partner portals...</Box>
        ) : portals.length === 0 ? (
          <EmptyState
            icon={<AccountTreeOutlinedIcon />}
            title="No partner portals"
            description="Create the first portal to start assigning shipments into partner workspaces."
            action={
              <Link href="/dashboard/partner-portals/new" style={{ textDecoration: 'none' }}>
                <Button variant="primary" icon={<AddIcon />}>New Portal</Button>
              </Link>
            }
          />
        ) : (
          <DataTable data={portals} columns={columns} keyField="id" />
        )}
      </DashboardPanel>
    </DashboardSurface>
  );
}
