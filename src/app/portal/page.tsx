'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { Box, Typography } from '@mui/material';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, toast } from '@/components/design-system';

type PortalSummary = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  memberships?: Array<{ role: string }>;
  _count?: {
    customers?: number;
    shipmentAssignments?: number;
  };
};

export default function PortalHomePage() {
  const [portals, setPortals] = useState<PortalSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortals = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/partner-portals', { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load portals');
        }

        setPortals(data.portals || []);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load your portals');
      } finally {
        setLoading(false);
      }
    };

    void fetchPortals();
  }, []);

  return (
    <DashboardSurface>
      <DashboardPanel title="My Portals" description="Select a portal workspace to manage your customers and assigned shipments">
        {loading ? (
          <Box sx={{ color: 'var(--text-secondary)' }}>Loading portals...</Box>
        ) : portals.length === 0 ? (
          <EmptyState icon={<AccountTreeOutlinedIcon />} title="No portal access" description="You are signed in, but no partner portal workspace has been assigned to your account yet." />
        ) : (
          <DashboardGrid className="grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {portals.map((portal) => (
              <Box
                key={portal.id}
                sx={{
                  border: '1px solid var(--border)',
                  bgcolor: 'var(--panel)',
                  borderRadius: 3,
                  p: 3,
                  display: 'grid',
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{portal.name}</Typography>
                  <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {portal.code || 'No code'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, color: 'var(--text-secondary)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                  <span>Customers: {portal._count?.customers || 0}</span>
                  <span>Shipments: {portal._count?.shipmentAssignments || 0}</span>
                  <span>Role: {portal.memberships?.[0]?.role || 'Member'}</span>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Link href={`/portal/${portal.id}/shipments`} style={{ textDecoration: 'none' }}>
                    <Button variant="primary" size="sm">Open Shipments</Button>
                  </Link>
                  <Link href={`/portal/${portal.id}/customers`} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" size="sm">Open Customers</Button>
                  </Link>
                </Box>
              </Box>
            ))}
          </DashboardGrid>
        )}
      </DashboardPanel>
    </DashboardSurface>
  );
}