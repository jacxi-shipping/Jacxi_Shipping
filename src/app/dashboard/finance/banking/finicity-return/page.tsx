'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box } from '@mui/material';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button } from '@/components/design-system';

type SyncState = 'syncing' | 'success' | 'error';

export default function FinicityReturnPage() {
  const [state, setState] = useState<SyncState>('syncing');
  const [message, setMessage] = useState('Finicity returned successfully. Syncing your bank accounts now...');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch('/api/finicity/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: true }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to sync connected bank accounts');
        }

        if (cancelled) {
          return;
        }

        const importedCount = (data.results || []).reduce(
          (sum: number, item: { importedCount?: number }) => sum + (item.importedCount || 0),
          0
        );

        setState('success');
        setMessage(
          importedCount > 0
            ? `${importedCount} new bank transaction${importedCount === 1 ? '' : 's'} imported. Redirecting back to Banking...`
            : 'Bank connection is ready. No new transactions were available yet. Redirecting back to Banking...'
        );

        window.setTimeout(() => {
          if (!cancelled) {
            window.location.href = '/dashboard/finance/banking';
          }
        }, 1500);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState('error');
        setMessage(error instanceof Error ? error.message : 'Failed to sync connected bank accounts');
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <Box sx={{ px: 2, pt: 2 }}>
          <Breadcrumbs />
        </Box>

        <DashboardPanel
          title="Finicity Connection"
          description="Finalizing your bank connection and syncing transactions into your ledger"
          actions={
            <Link href="/dashboard/finance/banking" style={{ textDecoration: 'none' }}>
              <Button variant="outline">Back to Banking</Button>
            </Link>
          }
        >
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid var(--border)',
              background:
                state === 'error'
                  ? 'rgba(239, 68, 68, 0.08)'
                  : state === 'success'
                    ? 'rgba(16, 185, 129, 0.06)'
                    : 'rgba(59, 130, 246, 0.06)',
              color: 'var(--text-primary)',
            }}
          >
            <Box sx={{ fontWeight: 700, mb: 1 }}>
              {state === 'syncing' ? 'Syncing bank accounts...' : state === 'success' ? 'Connection complete' : 'Connection needs attention'}
            </Box>
            <Box sx={{ color: 'var(--text-secondary)' }}>{message}</Box>
          </Box>
        </DashboardPanel>
      </DashboardSurface>
    </ProtectedRoute>
  );
}