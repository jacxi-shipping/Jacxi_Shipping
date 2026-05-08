'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
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

type UserOption = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

export default function PartnerPortalsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [portals, setPortals] = useState<PortalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<UserOption | null>(null);
  const [form, setForm] = useState({ name: '', code: '', notes: '' });

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

  useEffect(() => {
    if (!canAccess) return;

    const controller = new AbortController();
    const fetchUsers = async () => {
      try {
        const query = new URLSearchParams({ page: '1', pageSize: '20' });
        if (userSearch.trim()) query.set('query', userSearch.trim());
        const response = await fetch(`/api/users?${query.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (response.ok) {
          setUsers(data.users || []);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error(error);
        }
      }
    };

    void fetchUsers();
    return () => controller.abort();
  }, [canAccess, userSearch]);

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

  const handleCreatePortal = async () => {
    if (!form.name.trim()) {
      toast.error('Portal name is required');
      return;
    }

    if (!selectedOwner) {
      toast.error('Portal owner is required');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/partner-portals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ownerUserId: selectedOwner.id,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal');
      }

      toast.success('Partner portal created');
      setForm({ name: '', code: '', notes: '' });
      setSelectedOwner(null);
      await fetchPortals();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create portal');
    } finally {
      setCreating(false);
    }
  };

  if (status === 'loading' || !session || !canAccess) {
    return null;
  }

  return (
    <DashboardSurface>
      <Box sx={{ px: 2, pt: 2 }}>
        <Breadcrumbs />
      </Box>

      <DashboardPanel title="Partner Portals" description="Create partner workspaces and hand off selected shipments into them">
        <Box sx={{ display: 'grid', gap: 2, mb: 4, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
          <TextField label="Portal Name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <TextField label="Portal Code" value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
          <TextField label="Notes" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} multiline minRows={2} />
          <Autocomplete
            options={users}
            value={selectedOwner}
            onChange={(_, value) => setSelectedOwner(value)}
            onInputChange={(_, value) => setUserSearch(value)}
            getOptionLabel={(option) => option.name ? `${option.name} (${option.email})` : option.email}
            renderInput={(params) => <TextField {...params} label="Portal Owner" placeholder="Search users by name or email" />}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
          <Button variant="primary" onClick={() => void handleCreatePortal()} disabled={creating}>
            {creating ? 'Creating...' : 'Create Portal'}
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ color: 'var(--text-secondary)' }}>Loading partner portals...</Box>
        ) : portals.length === 0 ? (
          <EmptyState icon={<AccountTreeOutlinedIcon />} title="No partner portals" description="Create the first portal above to start assigning shipments into partner workspaces." />
        ) : (
          <DataTable data={portals} columns={columns} keyField="id" />
        )}
      </DashboardPanel>
    </DashboardSurface>
  );
}