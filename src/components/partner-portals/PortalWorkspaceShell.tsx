'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Button } from '@/components/design-system';
import { getPortalBrandIdentity } from '@/lib/partner-portal-branding';

type PortalSummary = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  memberships?: Array<{ role: string }>;
  _count?: {
    customers?: number;
    shipmentAssignments?: number;
  };
};

type PortalWorkspaceShellProps = {
  children: React.ReactNode;
};

const workspaceNav = [
  { label: 'Overview', icon: <SpaceDashboardOutlinedIcon fontSize="small" />, suffix: '' },
  { label: 'Shipments', icon: <Inventory2OutlinedIcon fontSize="small" />, suffix: '/shipments' },
  { label: 'Customers', icon: <PeopleAltOutlinedIcon fontSize="small" />, suffix: '/customers' },
  { label: 'Finance', icon: <AccountBalanceWalletOutlinedIcon fontSize="small" />, suffix: '/finance' },
  { label: 'Members', icon: <GroupOutlinedIcon fontSize="small" />, suffix: '/members' },
  { label: 'Activity', icon: <HistoryOutlinedIcon fontSize="small" />, suffix: '/activity' },
  { label: 'Settings', icon: <TuneOutlinedIcon fontSize="small" />, suffix: '/settings' },
];

function isWorkspaceRouteActive(pathname: string, href: string) {
  if (href.endsWith('/activity')) {
    return pathname === href;
  }

  if (href.endsWith('/settings')) {
    return pathname === href;
  }

  if (href.endsWith('/members')) {
    return pathname === href;
  }

  if (href.endsWith('/customers')) {
    return pathname === href;
  }

  if (href.endsWith('/finance')) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (href.endsWith('/shipments')) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return pathname === href;
}

export default function PortalWorkspaceShell({ children }: PortalWorkspaceShellProps) {
  const pathname = usePathname();
  const portalMatch = pathname.match(/^\/portal\/([^/]+)/);
  const portalId = portalMatch?.[1] ?? null;
  const [portal, setPortal] = useState<PortalSummary | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchPortal = async () => {
      if (!portalId) {
        setPortal(null);
        return;
      }

      try {
        setLoadingPortal(true);
        const response = await fetch('/api/partner-portals', { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load portal workspace');
        }

        if (!cancelled) {
          const match = (data.portals || []).find((item: PortalSummary) => item.id === portalId) || null;
          setPortal(match);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setPortal(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingPortal(false);
        }
      }
    };

    void fetchPortal();

    return () => {
      cancelled = true;
    };
  }, [portalId]);

  const navItems = useMemo(() => {
    if (!portalId) {
      return [];
    }

    return workspaceNav.map((item) => ({
      ...item,
      href: `/portal/${portalId}${item.suffix}`,
    }));
  }, [portalId]);

  const brand = useMemo(() => getPortalBrandIdentity(portal), [portal]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'var(--background)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        borderTop: `4px solid ${brand.accentColor}`,
      }}
    >
      <Box
        sx={{
          px: { xs: 2, md: 3, xl: 4 },
          py: { xs: 2, md: 2.5 },
          borderBottom: '1px solid var(--border)',
          background: `linear-gradient(135deg, rgba(${brand.accentRgb}, 0.22), rgba(${brand.accentRgb}, 0.10) 46%, rgba(255,255,255,0.9) 100%)`,
          backdropFilter: 'blur(18px)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', lg: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            flexDirection: { xs: 'column', lg: 'row' },
          }}
        >
          <Box sx={{ display: 'grid', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              {portalId ? 'Partner Workspace' : 'Partner Portal'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
              {portalId ? (
                brand.logoUrl ? (
                  <Box component="img" src={brand.logoUrl} alt={`${brand.companyLabel} logo`} sx={{ width: 44, height: 44, borderRadius: 2, objectFit: 'cover', bgcolor: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.5)' }} />
                ) : (
                  <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: brand.accentColor, color: '#fff', fontWeight: 800 }}>
                    {brand.companyLabel.slice(0, 1).toUpperCase()}
                  </Box>
                )
              ) : null}
              <Box>
                <Typography sx={{ fontSize: { xs: '1.15rem', md: '1.5rem' }, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {portalId ? brand.companyLabel : 'Shared Customer Portal'}
                </Typography>
                {portalId ? (
                  <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {portal?.name || 'Portal Workspace'}
                  </Typography>
                ) : null}
              </Box>
            </Box>
            <Typography sx={{ color: 'var(--text-secondary)', maxWidth: 780 }}>
              {portalId
                ? 'A partner-facing view of the main system with shipments, customer assignments, member access, and activity in one workspace.'
                : 'Open a portal workspace to manage assigned shipments, customer handoffs, team members, and partner activity.'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Link href="/portal" style={{ textDecoration: 'none' }}>
              <Button variant={pathname === '/portal' ? 'primary' : 'outline'} size="sm">
                <ArrowBackOutlinedIcon sx={{ fontSize: 16 }} />
                My Portals
              </Button>
            </Link>
            {portalId ? (
              <Link href={`/portal/${portalId}/shipments`} style={{ textDecoration: 'none' }}>
                <Button variant="outline" size="sm">Open Shipments</Button>
              </Link>
            ) : null}
          </Box>
        </Box>

        {portalId ? (
          <Box
            sx={{
              mt: 2,
              display: { xs: 'grid', lg: 'none' },
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 1,
            }}
          >
            {navItems.map((item) => {
              const active = isWorkspaceRouteActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.5,
                      py: 1.25,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: active ? brand.accentColor : 'var(--border)',
                      bgcolor: active ? `rgba(${brand.accentRgb}, 0.10)` : 'rgba(255,255,255,0.82)',
                      color: active ? brand.accentColor : 'var(--text-primary)',
                    }}
                  >
                    {item.icon}
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.label}</Typography>
                  </Box>
                </Link>
              );
            })}
          </Box>
        ) : null}
      </Box>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {portalId ? (
          <Box
            component="aside"
            sx={{
              width: 300,
              borderRight: '1px solid var(--border)',
              px: 2,
              py: 2,
              display: { xs: 'none', lg: 'block' },
              bgcolor: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <Box
              sx={{
                border: '1px solid var(--border)',
                borderRadius: 3,
                p: 2,
                bgcolor: 'var(--panel)',
                boxShadow: '0 18px 40px rgba(var(--text-primary-rgb),0.08)',
                display: 'grid',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography sx={{ fontSize: '0.82rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Workspace
                </Typography>
                {loadingPortal ? <CircularProgress size={16} /> : null}
              </Box>
              <Box>
                <Typography sx={{ fontSize: '1.1rem', fontWeight: 800 }}>{brand.companyLabel}</Typography>
                <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {portal?.name || 'Partner-facing view of your shared operations'}
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
                <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: `rgba(${brand.accentRgb}, 0.08)` }}>
                  <Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
                    Shipments
                  </Typography>
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: 700 }}>{portal?._count?.shipmentAssignments || 0}</Typography>
                </Box>
                <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: 'rgba(var(--accent-rgb),0.10)' }}>
                  <Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
                    Customers
                  </Typography>
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: 700 }}>{portal?._count?.customers || 0}</Typography>
                </Box>
                <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: `rgba(${brand.accentRgb}, 0.08)` }}>
                  <Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
                    Finance
                  </Typography>
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: 700 }}>Read-only</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.25, borderRadius: 2, bgcolor: 'rgba(15,23,42,0.04)' }}>
                <LayersOutlinedIcon sx={{ fontSize: 18, color: 'var(--text-secondary)' }} />
                <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Access level: <strong style={{ color: 'var(--text-primary)' }}>{portal?.memberships?.[0]?.role || 'Member'}</strong>
                </Typography>
              </Box>
            </Box>

            <Box component="nav" sx={{ display: 'grid', gap: 1, mt: 2 }}>
              {navItems.map((item) => {
                const active = isWorkspaceRouteActive(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        px: 1.5,
                        py: 1.35,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: active ? brand.accentColor : 'var(--border)',
                        bgcolor: active ? `rgba(${brand.accentRgb}, 0.10)` : 'transparent',
                        color: active ? brand.accentColor : 'var(--text-primary)',
                        transition: 'all 0.18s ease',
                        '&:hover': {
                          borderColor: brand.accentColor,
                          bgcolor: `rgba(${brand.accentRgb}, 0.08)`,
                        },
                      }}
                    >
                      {item.icon}
                      <Typography sx={{ fontSize: '0.92rem', fontWeight: 600 }}>{item.label}</Typography>
                    </Box>
                  </Link>
                );
              })}
            </Box>
          </Box>
        ) : null}

        <Box component="main" sx={{ flex: 1, minWidth: 0, pb: { xs: 4, lg: 5 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}