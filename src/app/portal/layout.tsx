'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { SessionProvider } from '@/components/providers/SessionProvider';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/design-system';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const portalMatch = pathname.match(/^\/portal\/([^/]+)/);
  const portalId = portalMatch?.[1] ?? null;

  return (
    <SessionProvider>
      <ProtectedRoute>
        <Box sx={{ minHeight: '100vh', bgcolor: 'var(--background)', color: 'var(--text-primary)' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              px: { xs: 2, md: 3 },
              py: 1.5,
              borderBottom: '1px solid var(--border)',
              bgcolor: 'var(--panel)',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: '0.75rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Partner Portal
              </Typography>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 700 }}>Workspace</Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Link href="/portal" style={{ textDecoration: 'none' }}>
                <Button variant="outline" size="sm">My Portals</Button>
              </Link>
              {portalId ? (
                <>
                  <Link href={`/portal/${portalId}/shipments`} style={{ textDecoration: 'none' }}>
                    <Button variant={pathname.includes('/shipments') ? 'primary' : 'outline'} size="sm">Assigned Shipments</Button>
                  </Link>
                  <Link href={`/portal/${portalId}/customers`} style={{ textDecoration: 'none' }}>
                    <Button variant={pathname.includes('/customers') ? 'primary' : 'outline'} size="sm">My Customers</Button>
                  </Link>
                  <Link href={`/portal/${portalId}/members`} style={{ textDecoration: 'none' }}>
                    <Button variant={pathname.includes('/members') ? 'primary' : 'outline'} size="sm">Members</Button>
                  </Link>
                </>
              ) : null}
            </Box>
          </Box>

          <Box component="main" sx={{ p: { xs: 2, md: 3 } }}>
            {children}
          </Box>
        </Box>
      </ProtectedRoute>
    </SessionProvider>
  );
}