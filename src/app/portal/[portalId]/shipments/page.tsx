'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { Box, MenuItem, TextField } from '@mui/material';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, toast } from '@/components/design-system';
import { DataTable, type Column } from '@/components/ui/DataTable';

type PortalCustomer = {
  id: string;
  name: string;
};

type ShipmentAssignment = {
  id: string;
  notes: string | null;
  partnerCustomer: { id: string; name: string; email: string | null; phone: string | null } | null;
  shipment: {
    id: string;
    vehicleType: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    vehicleVIN: string | null;
    status: string;
    serviceType: string;
    createdAt: string;
  };
};

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
};

export default function PortalShipmentsPage() {
  const params = useParams();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [assignments, setAssignments] = useState<ShipmentAssignment[]>([]);
  const [customers, setCustomers] = useState<PortalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomers, setSelectedCustomers] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shipmentsResponse, customersResponse] = await Promise.all([
        fetch(`/api/partner-portals/${portalId}/shipments`, { cache: 'no-store' }),
        fetch(`/api/partner-portals/${portalId}/customers`, { cache: 'no-store' }),
      ]);

      const shipmentsData = await shipmentsResponse.json();
      const customersData = await customersResponse.json();

      if (!shipmentsResponse.ok) {
        throw new Error(shipmentsData.error || 'Failed to load assigned shipments');
      }

      if (!customersResponse.ok) {
        throw new Error(customersData.error || 'Failed to load customers');
      }

      setPortal(shipmentsData.portal);
      setAssignments(shipmentsData.assignments || []);
      setCustomers(customersData.customers || []);
      setSelectedCustomers(
        Object.fromEntries(
          (shipmentsData.assignments || []).map((assignment: ShipmentAssignment) => [assignment.shipment.id, assignment.partnerCustomer?.id || ''])
        )
      );
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load portal shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [portalId]);

  const handleLinkCustomer = async (shipmentId: string) => {
    try {
      setSavingId(shipmentId);
      const response = await fetch(`/api/partner-portals/${portalId}/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerCustomerId: selectedCustomers[shipmentId] || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update assignment');
      }

      toast.success('Shipment customer link updated');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update shipment assignment');
    } finally {
      setSavingId(null);
    }
  };

  const columns = useMemo<Column<ShipmentAssignment>[]>(() => [
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (_, row) => [row.shipment.vehicleYear, row.shipment.vehicleMake, row.shipment.vehicleModel].filter(Boolean).join(' ') || row.shipment.vehicleType,
    },
    {
      key: 'vin',
      header: 'VIN',
      render: (_, row) => row.shipment.vehicleVIN || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => row.shipment.status,
    },
    {
      key: 'customer',
      header: 'My Customer',
      render: (_, row) => row.partnerCustomer?.name || 'Unassigned',
    },
    {
      key: 'assign',
      header: 'Link To Customer',
      render: (_, row) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 280 }}>
          <TextField
            select
            size="small"
            fullWidth
            value={selectedCustomers[row.shipment.id] || ''}
            onChange={(event) => setSelectedCustomers((prev) => ({ ...prev, [row.shipment.id]: event.target.value }))}
          >
            <MenuItem value="">Unassigned</MenuItem>
            {customers.map((customer) => (
              <MenuItem key={customer.id} value={customer.id}>{customer.name}</MenuItem>
            ))}
          </TextField>
          <Button variant="outline" size="sm" onClick={() => void handleLinkCustomer(row.shipment.id)} disabled={savingId === row.shipment.id}>
            {savingId === row.shipment.id ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      ),
    },
    {
      key: 'view',
      header: 'Details',
      render: (_, row) => (
        <Link href={`/portal/${portalId}/shipments/${row.shipment.id}`} style={{ textDecoration: 'none' }}>
          <Button variant="outline" size="sm">View</Button>
        </Link>
      ),
    },
  ], [customers, portalId, savingId, selectedCustomers]);

  return (
    <DashboardSurface>
      <DashboardPanel
        title={portal ? `${portal.name} Assigned Shipments` : 'Assigned Shipments'}
        description="These shipments come from the main system. You can only link them to your own portal customers."
      >
        {loading ? (
          <Box sx={{ color: 'var(--text-secondary)' }}>Loading assigned shipments...</Box>
        ) : assignments.length === 0 ? (
          <EmptyState icon={<Inventory2OutlinedIcon />} title="No assigned shipments" description="Your portal does not have any shipments assigned yet. Ask the internal team to assign shipments to this portal first." />
        ) : (
          <DataTable data={assignments} columns={columns} keyField="id" />
        )}
      </DashboardPanel>
    </DashboardSurface>
  );
}