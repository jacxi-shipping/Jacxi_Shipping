'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AccessTime, Business, Clear, FilterAlt, Inventory2, Search } from '@mui/icons-material';
import { Box, FormControl, InputAdornment, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import { DashboardPanel, DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, EmptyState, SkeletonTable, StatusBadge, toast } from '@/components/design-system';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { exportToCSVWithHeaders } from '@/lib/export';
import { hasPermission } from '@/lib/rbac';

type CompanyOption = {
  id: string;
  name: string;
  isShipping?: boolean;
  isTransit?: boolean;
};

type CompanyReleasedShipment = {
  id: string;
  vehicleType: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  vehicleColor: string | null;
  lotNumber: string | null;
  auctionName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  price: number | null;
  purchasePrice: number | null;
  paymentStatus: string;
  serviceType: string;
  internalNotes: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  container: {
    id: string;
    containerNumber: string;
    trackingNumber: string | null;
    loadingPort: string | null;
    destinationPort: string | null;
    status: string;
  } | null;
  transit: {
    id: string;
    referenceNumber: string;
    status: string;
    origin: string;
    destination: string;
    dispatchDate: string | null;
    estimatedDelivery: string | null;
    actualDelivery: string | null;
  } | null;
  shippingCompany: {
    id: string;
    name: string;
  } | null;
  releaseEvent: {
    releasedAt: string | null;
    origin: string;
    destination: string;
    description: string | null;
  } | null;
};

type CompanyReleasedRow = {
  id: string;
  vehicle: string;
  vin: string;
  customer: string;
  company: string;
  route: string;
  transitReference: string;
  releasedAtRaw: string;
  releasedAt: string;
  timeSinceRelease: string;
  status: string;
  paymentStatus: string;
  lotNumber: string;
  auctionName: string;
  serviceType: string;
};

type AppliedFilters = {
  query: string;
  companyId: string;
  status: string;
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_FILTERS: AppliedFilters = {
  query: '',
  companyId: '',
  status: '',
  dateFrom: '',
  dateTo: '',
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
}

function formatElapsedTime(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  const releasedAt = new Date(value).getTime();
  if (Number.isNaN(releasedAt)) {
    return '-';
  }

  const diffMs = Date.now() - releasedAt;
  if (diffMs <= 0) {
    return 'Just now';
  }

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const totalMinutes = Math.floor(diffMs / (1000 * 60));

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  if (totalHours > 0) {
    return `${totalHours}h`;
  }

  return `${Math.max(1, totalMinutes)}m`;
}

export default function CompanyReleasedShipmentsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [draftFilters, setDraftFilters] = useState<AppliedFilters>(DEFAULT_FILTERS);
  const [filters, setFilters] = useState<AppliedFilters>(DEFAULT_FILTERS);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [shipments, setShipments] = useState<CompanyReleasedShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState({
    total: 0,
    inTransitToDestination: 0,
    delivered: 0,
    released: 0,
  });

  const canViewPage =
    hasPermission(session?.user?.role, 'shipments:read_all') ||
    hasPermission(session?.user?.role, 'shipments:manage') ||
    hasPermission(session?.user?.role, 'transits:manage');

  const fetchCompanies = useCallback(async () => {
    try {
      setLoadingCompanies(true);
      const response = await fetch('/api/finance/companies?active=true', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load companies');
      }

      const companyOptions = Array.isArray(data.companies)
        ? (data.companies as CompanyOption[]).filter((company) => company.isShipping || company.isTransit)
        : [];

      setCompanies(companyOptions);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load companies');
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  const fetchShipments = useCallback(async () => {
    if (!canViewPage) {
      setShipments([]);
      setSummary({
        total: 0,
        inTransitToDestination: 0,
        delivered: 0,
        released: 0,
      });
      setTotalItems(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '20',
      });

      if (filters.query) params.set('query', filters.query);
      if (filters.companyId) params.set('companyId', filters.companyId);
      if (filters.status) params.set('status', filters.status);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      const response = await fetch(`/api/company-released-shipments?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load company released shipments');
      }

      setShipments(Array.isArray(data.shipments) ? data.shipments : []);
      setSummary(
        data.summary || {
          total: 0,
          inTransitToDestination: 0,
          delivered: 0,
          released: 0,
        },
      );
      setTotalItems(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching company released shipments:', error);
      toast.error('Failed to load company released shipments', {
        description: 'Please refresh the page or adjust your filters.',
      });
      setShipments([]);
      setSummary({
        total: 0,
        inTransitToDestination: 0,
        delivered: 0,
        released: 0,
      });
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [canViewPage, currentPage, filters]);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && canViewPage) {
      void fetchCompanies();
    } else if (sessionStatus === 'authenticated') {
      setLoadingCompanies(false);
    }
  }, [canViewPage, fetchCompanies, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      void fetchShipments();
    }
  }, [fetchShipments, sessionStatus]);

  const rows = useMemo<CompanyReleasedRow[]>(
    () =>
      shipments.map((shipment) => {
        const vehicle = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
          .filter(Boolean)
          .join(' ')
          .trim() || shipment.vehicleType;
        const releasedAt = shipment.releaseEvent?.releasedAt ?? shipment.transit?.dispatchDate ?? null;

        return {
          id: shipment.id,
          vehicle,
          vin: shipment.vehicleVIN || '-',
          customer: shipment.user?.name || shipment.user?.email || '-',
          company: shipment.shippingCompany?.name || '-',
          route: `${shipment.releaseEvent?.origin || shipment.transit?.origin || '-'} → ${shipment.releaseEvent?.destination || shipment.transit?.destination || '-'}`,
          transitReference: shipment.transit?.referenceNumber || '-',
          releasedAtRaw: releasedAt || '',
          releasedAt: formatDateTime(releasedAt),
          timeSinceRelease: formatElapsedTime(releasedAt),
          status: shipment.status,
          paymentStatus: shipment.paymentStatus || '-',
          lotNumber: shipment.lotNumber || '-',
          auctionName: shipment.auctionName || '-',
          serviceType: shipment.serviceType.replaceAll('_', ' '),
        };
      }),
    [shipments],
  );

  const columns = useMemo<Column<CompanyReleasedRow>[]>(
    () => [
      { key: 'vehicle', header: 'Vehicle', sortable: true },
      { key: 'vin', header: 'VIN', sortable: true },
      { key: 'customer', header: 'Customer', sortable: true },
      { key: 'company', header: 'Company', sortable: true },
      { key: 'route', header: 'Route', sortable: true },
      { key: 'transitReference', header: 'Transit Ref', sortable: true },
      { key: 'lotNumber', header: 'Lot #', sortable: true },
      { key: 'auctionName', header: 'Auction', sortable: true },
      { key: 'serviceType', header: 'Service', sortable: true },
      {
        key: 'releasedAtRaw',
        header: 'Released At',
        sortable: true,
        render: (_value, row) => row.releasedAt,
      },
      {
        key: 'timeSinceRelease',
        header: 'Elapsed',
        sortable: false,
      },
      {
        key: 'status',
        header: 'Shipment Status',
        sortable: true,
        render: (value) => <StatusBadge status={String(value)} size="sm" />,
      },
      {
        key: 'paymentStatus',
        header: 'Payment',
        sortable: true,
        render: (value) => <StatusBadge status={String(value)} size="sm" />,
      },
    ],
    [],
  );

  const handleApplyFilters = useCallback(() => {
    setCurrentPage(1);
    setFilters(draftFilters);
  }, [draftFilters]);

  const handleClearFilters = useCallback(() => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
  }, []);

  const handleExport = useCallback(() => {
    try {
      exportToCSVWithHeaders(
        rows,
        [
          { key: 'vehicle', label: 'Vehicle' },
          { key: 'vin', label: 'VIN' },
          { key: 'customer', label: 'Customer' },
          { key: 'company', label: 'Company' },
          { key: 'route', label: 'Route' },
          { key: 'transitReference', label: 'Transit Ref' },
          { key: 'lotNumber', label: 'Lot Number' },
          { key: 'auctionName', label: 'Auction' },
          { key: 'serviceType', label: 'Service Type' },
          { key: 'releasedAt', label: 'Released At' },
          { key: 'timeSinceRelease', label: 'Elapsed' },
          { key: 'status', label: 'Shipment Status' },
          { key: 'paymentStatus', label: 'Payment Status' },
        ],
        'company-released-shipments',
      );
      toast.success('Export ready');
    } catch (error) {
      console.error('Error exporting company released shipments:', error);
      toast.error('Failed to export results');
    }
  }, [rows]);

  if (sessionStatus === 'loading') {
    return (
      <DashboardSurface>
        <SkeletonTable rows={6} columns={6} />
      </DashboardSurface>
    );
  }

  if (!canViewPage) {
    return (
      <DashboardSurface>
        <Box sx={{ mb: 1.5 }}>
          <Breadcrumbs />
        </Box>
        <DashboardPanel title="Company released shipments" description="Access is limited to shipment and transit managers.">
          <EmptyState
            icon={<Business />}
            title="Access denied"
            description="You do not have permission to view all company released shipments."
          />
        </DashboardPanel>
      </DashboardSurface>
    );
  }

  return (
    <DashboardSurface className="overflow-hidden">
      <Box sx={{ mb: 1.5 }}>
        <Breadcrumbs />
      </Box>

      <DashboardPanel
        title="Company released shipments"
        description="Track shipments released to downstream companies with release time, current status, and workflow details."
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<Inventory2 fontSize="small" />}
            iconPosition="start"
            onClick={handleExport}
            disabled={rows.length === 0}
          >
            Export results
          </Button>
        }
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
            <TextField
              value={draftFilters.query}
              onChange={(event) => setDraftFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="Search by VIN, customer, company, route, or transit ref"
              label="Search"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: 'var(--accent-gold)' }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth>
              <InputLabel id="company-release-company-filter-label">Company</InputLabel>
              <Select
                labelId="company-release-company-filter-label"
                label="Company"
                value={draftFilters.companyId}
                onChange={(event) => setDraftFilters((current) => ({ ...current, companyId: String(event.target.value) }))}
                disabled={loadingCompanies}
              >
                <MenuItem value="">All companies</MenuItem>
                {companies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="company-release-status-filter-label">Shipment status</InputLabel>
              <Select
                labelId="company-release-status-filter-label"
                label="Shipment status"
                value={draftFilters.status}
                onChange={(event) => setDraftFilters((current) => ({ ...current, status: String(event.target.value) }))}
              >
                <MenuItem value="">All shipment statuses</MenuItem>
                <MenuItem value="IN_TRANSIT_TO_DESTINATION">In transit to destination</MenuItem>
                <MenuItem value="DELIVERED">Delivered</MenuItem>
                <MenuItem value="RELEASED">Released</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <TextField
                label="Released from"
                type="date"
                value={draftFilters.dateFrom}
                onChange={(event) => setDraftFilters((current) => ({ ...current, dateFrom: event.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Released to"
                type="date"
                value={draftFilters.dateTo}
                onChange={(event) => setDraftFilters((current) => ({ ...current, dateTo: event.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(2, 1fr)' },
              gap: 1.5,
            }}
          >
            {[
              { label: 'Matching shipments', value: summary.total, icon: Inventory2 },
              { label: 'In destination transit', value: summary.inTransitToDestination, icon: AccessTime },
              { label: 'Delivered', value: summary.delivered, icon: Business },
              { label: 'Current page', value: shipments.length, icon: FilterAlt },
            ].map(({ label, value, icon: Icon }) => (
              <Box
                key={label}
                sx={{
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  p: 1.75,
                  bgcolor: 'rgba(var(--panel-rgb), 0.65)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <Icon sx={{ fontSize: 18, color: 'var(--accent-gold)' }} />
                  <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</Typography>
                </Box>
                <Typography sx={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mt: 2 }}>
          <Button variant="primary" size="sm" icon={<Search fontSize="small" />} iconPosition="start" onClick={handleApplyFilters}>
            Search
          </Button>
          <Button variant="outline" size="sm" icon={<Clear fontSize="small" />} iconPosition="start" onClick={handleClearFilters}>
            Clear filters
          </Button>
        </Box>
      </DashboardPanel>

      <DashboardPanel
        title="Released shipment list"
        description={`${totalItems} shipment${totalItems === 1 ? '' : 's'} found`}
        fullHeight
        bodyClassName="overflow-hidden"
      >
        {loading ? (
          <SkeletonTable rows={6} columns={7} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Inventory2 />}
            title="No company released shipments found"
            description="Try broadening the search or clearing some filters."
          />
        ) : (
          <>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <DataTable
                data={rows}
                columns={columns}
                keyField="id"
                onRowClick={(row) => router.push(`/dashboard/shipments/${row.id}`)}
                currentPage={currentPage}
                totalPages={totalPages}
              />
            </Box>

            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.25 }}>
              {shipments.map((shipment) => {
                const vehicle = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
                  .filter(Boolean)
                  .join(' ')
                  .trim() || shipment.vehicleType;
                const releasedAt = shipment.releaseEvent?.releasedAt ?? shipment.transit?.dispatchDate ?? null;

                return (
                  <Box
                    key={shipment.id}
                    onClick={() => router.push(`/dashboard/shipments/${shipment.id}`)}
                    sx={{
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                      borderRadius: 3,
                      p: 1.5,
                      bgcolor: 'rgba(var(--panel-rgb), 0.72)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                      <Typography sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>{vehicle}</Typography>
                      <StatusBadge status={shipment.status} size="sm" />
                    </Box>
                    <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      VIN: {shipment.vehicleVIN || '-'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Customer: {shipment.user?.name || shipment.user?.email || '-'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Company: {shipment.shippingCompany?.name || '-'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Transit: {shipment.transit?.referenceNumber || '-'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Route: {shipment.releaseEvent?.origin || shipment.transit?.origin || '-'} → {shipment.releaseEvent?.destination || shipment.transit?.destination || '-'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Released: {formatDateTime(releasedAt)} ({formatElapsedTime(releasedAt)})
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Typography sx={{ alignSelf: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Page {currentPage} of {totalPages}
                </Typography>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </Box>
            )}
          </>
        )}
      </DashboardPanel>
    </DashboardSurface>
  );
}
