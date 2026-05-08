'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { Box, TextField } from '@mui/material';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, toast } from '@/components/design-system';
import { DataTable, type Column } from '@/components/ui/DataTable';

type PortalCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address?: string | null;
  city: string | null;
  country: string | null;
  notes?: string | null;
  createdAt: string;
  _count?: {
    shipmentAssignments: number;
  };
};

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
};

export default function PortalCustomersPage() {
  const params = useParams();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [customers, setCustomers] = useState<PortalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', country: '', notes: '' });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/partner-portals/${portalId}/customers`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load customers');
      }

      setPortal(data.portal);
      setCustomers(data.customers || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load portal customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCustomers();
  }, [portalId]);

  const columns = useMemo<Column<PortalCustomer>[]>(() => [
    { key: 'name', header: 'Customer', sortable: true },
    {
      key: 'email',
      header: 'Email',
      render: (_, row) => row.email || '—',
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (_, row) => row.phone || '—',
    },
    {
      key: 'location',
      header: 'Location',
      render: (_, row) => [row.city, row.country].filter(Boolean).join(', ') || '—',
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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingCustomerId(row.id);
              setForm({
                name: row.name,
                email: row.email || '',
                phone: row.phone || '',
                city: row.city || '',
                country: row.country || '',
                notes: row.notes || '',
              });
            }}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleDeleteCustomer(row.id)}
            disabled={deletingCustomerId === row.id}
          >
            {deletingCustomerId === row.id ? 'Deleting...' : 'Delete'}
          </Button>
        </Box>
      ),
    },
  ], [deletingCustomerId]);

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', city: '', country: '', notes: '' });
    setEditingCustomerId(null);
  };

  const handleSaveCustomer = async () => {
    if (!form.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch(editingCustomerId ? `/api/partner-portals/${portalId}/customers/${editingCustomerId}` : `/api/partner-portals/${portalId}/customers`, {
        method: editingCustomerId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save customer');
      }

      toast.success(editingCustomerId ? 'Customer updated' : 'Customer created');
      resetForm();
      await fetchCustomers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save customer');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Delete this portal customer? Shipments linked to it will become unassigned.')) {
      return;
    }

    try {
      setDeletingCustomerId(customerId);
      const response = await fetch(`/api/partner-portals/${portalId}/customers/${customerId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete customer');
      }

      toast.success('Customer deleted');
      if (editingCustomerId === customerId) {
        resetForm();
      }
      await fetchCustomers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete customer');
    } finally {
      setDeletingCustomerId(null);
    }
  };

  return (
    <DashboardSurface>
      <DashboardPanel
        title={portal ? `${portal.name} Customers` : 'My Customers'}
        description="Create and manage customers inside your portal workspace"
      >
        <Box sx={{ display: 'grid', gap: 1.5, mb: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
          <TextField label="Customer Name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <TextField label="Email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
          <TextField label="Phone" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
          <TextField label="City" value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
          <TextField label="Country" value={form.country} onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))} />
          <TextField label="Notes" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {editingCustomerId ? (
              <Button variant="outline" onClick={resetForm} disabled={creating}>
                Cancel
              </Button>
            ) : null}
            <Button variant="primary" onClick={() => void handleSaveCustomer()} disabled={creating}>
              {creating ? 'Saving...' : editingCustomerId ? 'Save Changes' : 'Create Customer'}
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ color: 'var(--text-secondary)' }}>Loading customers...</Box>
        ) : customers.length === 0 ? (
          <EmptyState icon={<PersonOutlineIcon />} title="No customers yet" description="Create your first portal customer above, then assign shipments to them from the Assigned Shipments page." />
        ) : (
          <DataTable data={customers} columns={columns} keyField="id" />
        )}
      </DashboardPanel>
    </DashboardSurface>
  );
}