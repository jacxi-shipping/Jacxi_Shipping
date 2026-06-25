'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Box,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Tooltip,
} from '@mui/material';
import { ArrowLeft, ArrowLeftRight, Building2, Download, GitCompareArrows, Search, Trophy } from 'lucide-react';
import PermissionRoute from '@/components/auth/PermissionRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, StatsCard, toast } from '@/components/design-system';
import {
  DEFAULT_SHIPPING_RATE_CONFIG,
  US_STATES,
  type VehicleRateMultiplier,
} from '@/lib/shipping-rate-calculator';
import CompanyPriceComparisonPresets from '@/components/finance/CompanyPriceComparisonPresets';
import CompanyPriceComparisonSideBySide from '@/components/finance/CompanyPriceComparisonSideBySide';
import {
  adjustComparisonRows,
  buildCompanyScorecards,
  buildComparisonInsights,
  buildLaneComparisonRows,
  buildStateComparisonRows,
  exportComparisonCsv,
  getRateDelta,
  sortComparisonRows,
  type CompanyPriceSnapshot,
  type ComparisonSortKey,
} from '@/lib/company-price-comparison';
import {
  createDefaultComparisonPresetConfig,
  sanitizePresetConfigForCompanies,
  type ComparisonDisplayMode,
  type ComparisonPresetConfig,
  type ComparisonViewMode,
  type SideBySideRateType,
} from '@/lib/company-price-comparison-presets';
import {
  buildSideBySideRows,
  exportSideBySideCsv,
} from '@/lib/company-price-comparison-side-by-side';

type CompanyPriceRecord = CompanyPriceSnapshot & {
  isActive: boolean;
  fallbackRate: number;
  currency: string;
  vehicleTypes: VehicleRateMultiplier[];
  updatedAt?: string | null;
  activePriceList?: {
    id: string;
    name: string;
    destinationLabel: string;
    sourceFileName: string;
    importedAuctionRateCount: number;
    importedStateRateCount: number;
    createdAt: string;
  } | null;
};

type DisplayMode = ComparisonDisplayMode;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

const formatSignedCurrency = (amount: number) => {
  const prefix = amount > 0 ? '+' : amount < 0 ? '−' : '';
  return `${prefix}${formatCurrency(Math.abs(amount))}`;
};

function RateCell({
  value,
  minRate,
  maxRate,
  hasMultipleRates,
  referenceRate,
  displayMode,
}: {
  value: number | null;
  minRate: number | null;
  maxRate: number | null;
  hasMultipleRates: boolean;
  referenceRate?: number | null;
  displayMode: DisplayMode;
}) {
  if (value === null) {
    return <Box sx={{ color: 'var(--text-secondary)' }}>—</Box>;
  }

  const delta = referenceRate !== undefined ? getRateDelta(value, referenceRate ?? null) : null;
  const isLowest = hasMultipleRates && minRate !== null && value === minRate && minRate !== maxRate;
  const isHighest = hasMultipleRates && maxRate !== null && value === maxRate && minRate !== maxRate;

  if (displayMode === 'delta' && referenceRate !== undefined) {
    if (delta === null) {
      return <Box sx={{ color: 'var(--text-secondary)' }}>—</Box>;
    }

    if (delta === 0) {
      return <Box sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Same</Box>;
    }

    return (
      <Box
        sx={{
          fontWeight: 700,
          color: delta < 0 ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)',
        }}
      >
        {formatSignedCurrency(delta)}
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          fontWeight: isLowest || isHighest ? 700 : 500,
          color: isLowest
            ? 'rgb(22, 163, 74)'
            : isHighest
            ? 'rgb(220, 38, 38)'
            : 'var(--text-primary)',
        }}
      >
        {formatCurrency(value)}
      </Box>
      {delta !== null && delta !== 0 && referenceRate !== undefined && referenceRate !== null && (
        <Box
          sx={{
            mt: 0.25,
            fontSize: '0.7rem',
            color: delta < 0 ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)',
          }}
        >
          {formatSignedCurrency(delta)}
        </Box>
      )}
    </Box>
  );
}

export default function CompanyPriceComparisonPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyPriceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SHIPPING' | 'DISPATCH' | 'TRANSIT'>('SHIPPING');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ComparisonViewMode>('state');
  const [sideBySideLeftId, setSideBySideLeftId] = useState('');
  const [sideBySideRightId, setSideBySideRightId] = useState('');
  const [sideBySideRateType, setSideBySideRateType] = useState<SideBySideRateType>('state');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [onlyWithPriceLists, setOnlyWithPriceLists] = useState(true);
  const [completeCoverageOnly, setCompleteCoverageOnly] = useState(false);
  const [minSpread, setMinSpread] = useState('');
  const [sortBy, setSortBy] = useState<ComparisonSortKey>('spread-desc');
  const [vehicleTypeId, setVehicleTypeId] = useState(DEFAULT_SHIPPING_RATE_CONFIG.vehicleTypes[0].id);
  const [referenceCompanyId, setReferenceCompanyId] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('absolute');

  const vehicleTypes = DEFAULT_SHIPPING_RATE_CONFIG.vehicleTypes;
  const vehicleMultiplier = vehicleTypes.find((type) => type.id === vehicleTypeId)?.multiplier || 1;

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ active: 'true' });
      if (typeFilter !== 'ALL') params.append('companyType', typeFilter);

      const response = await fetch(`/api/finance/companies/price-comparison?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch company price lists');
      }

      const nextCompanies = (data.companies || []) as CompanyPriceRecord[];
      setCompanies(nextCompanies);
      setSelectedCompanyIds((current) => {
        const validIds = new Set(nextCompanies.map((company) => company.id));
        const preserved = current.filter((id) => validIds.has(id));
        if (preserved.length > 0) return preserved;

        const withLists = nextCompanies.filter((company) => company.hasPriceList).map((company) => company.id);
        return withLists.length > 0 ? withLists : nextCompanies.map((company) => company.id);
      });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load company price lists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCompanies();
  }, [typeFilter]);

  const destinationOptions = useMemo(() => (
    [...new Set(companies.map((company) => company.destinationLabel).filter(Boolean))].sort()
  ), [companies]);

  const visibleCompanies = useMemo(() => {
    const selected = new Set(selectedCompanyIds);
    return companies
      .filter((company) => selected.has(company.id))
      .filter((company) => !onlyWithPriceLists || company.hasPriceList)
      .filter((company) => !destinationFilter || company.destinationLabel === destinationFilter);
  }, [companies, destinationFilter, onlyWithPriceLists, selectedCompanyIds]);

  useEffect(() => {
    if (referenceCompanyId && !visibleCompanies.some((company) => company.id === referenceCompanyId)) {
      setReferenceCompanyId('');
      setDisplayMode('absolute');
    }
  }, [referenceCompanyId, visibleCompanies]);

  useEffect(() => {
    if (viewMode !== 'side-by-side' || sideBySideCandidates.length < 2) return;

    const nextLeft = sideBySideLeftId && sideBySideCandidates.some((company) => company.id === sideBySideLeftId)
      ? sideBySideLeftId
      : sideBySideCandidates[0].id;
    const nextRight = sideBySideRightId
      && sideBySideCandidates.some((company) => company.id === sideBySideRightId)
      && sideBySideRightId !== nextLeft
      ? sideBySideRightId
      : sideBySideCandidates.find((company) => company.id !== nextLeft)?.id || '';

    if (nextLeft !== sideBySideLeftId) setSideBySideLeftId(nextLeft);
    if (nextRight !== sideBySideRightId) setSideBySideRightId(nextRight);
  }, [sideBySideCandidates, sideBySideLeftId, sideBySideRightId, viewMode]);

  const comparisonRows = useMemo(() => {
    if (viewMode === 'side-by-side') return [];

    const options = {
      search,
      differencesOnly,
      stateCode: stateFilter,
      completeCoverageOnly,
      minSpread: Number(minSpread) > 0 ? Number(minSpread) : undefined,
    };

    const baseRows = viewMode === 'state'
      ? buildStateComparisonRows(visibleCompanies, options)
      : buildLaneComparisonRows(visibleCompanies, options);

    return sortComparisonRows(adjustComparisonRows(baseRows, vehicleMultiplier), sortBy);
  }, [
    completeCoverageOnly,
    differencesOnly,
    minSpread,
    search,
    sortBy,
    stateFilter,
    vehicleMultiplier,
    viewMode,
    visibleCompanies,
  ]);

  const sideBySideCandidates = useMemo(() => (
    companies.filter((company) => !onlyWithPriceLists || company.hasPriceList)
  ), [companies, onlyWithPriceLists]);

  const currentPresetConfig = useMemo<ComparisonPresetConfig>(() => ({
    typeFilter,
    selectedCompanyIds,
    viewMode,
    sideBySideLeftId,
    sideBySideRightId,
    sideBySideRateType,
    search,
    stateFilter,
    destinationFilter,
    differencesOnly,
    onlyWithPriceLists,
    completeCoverageOnly,
    minSpread,
    sortBy,
    vehicleTypeId,
    referenceCompanyId,
    displayMode,
  }), [
    completeCoverageOnly,
    destinationFilter,
    differencesOnly,
    displayMode,
    minSpread,
    onlyWithPriceLists,
    referenceCompanyId,
    search,
    selectedCompanyIds,
    sideBySideLeftId,
    sideBySideRightId,
    sideBySideRateType,
    sortBy,
    stateFilter,
    typeFilter,
    vehicleTypeId,
    viewMode,
  ]);

  const applyPresetConfig = (config: ComparisonPresetConfig) => {
    const sanitized = sanitizePresetConfigForCompanies(config, companies.map((company) => company.id));
    const defaults = createDefaultComparisonPresetConfig();

    setTypeFilter(sanitized.typeFilter || defaults.typeFilter);
    setSelectedCompanyIds(sanitized.selectedCompanyIds);
    setViewMode(sanitized.viewMode || defaults.viewMode);
    setSideBySideLeftId(sanitized.sideBySideLeftId);
    setSideBySideRightId(sanitized.sideBySideRightId);
    setSideBySideRateType(sanitized.sideBySideRateType);
    setSearch(sanitized.search);
    setStateFilter(sanitized.stateFilter);
    setDestinationFilter(sanitized.destinationFilter);
    setDifferencesOnly(sanitized.differencesOnly);
    setOnlyWithPriceLists(sanitized.onlyWithPriceLists);
    setCompleteCoverageOnly(sanitized.completeCoverageOnly);
    setMinSpread(sanitized.minSpread);
    setSortBy(sanitized.sortBy);
    setVehicleTypeId(sanitized.vehicleTypeId);
    setReferenceCompanyId(sanitized.referenceCompanyId);
    setDisplayMode(sanitized.displayMode);
  };

  const scorecards = useMemo(
    () => buildCompanyScorecards(visibleCompanies, comparisonRows),
    [comparisonRows, visibleCompanies],
  );

  const insights = useMemo(
    () => buildComparisonInsights(visibleCompanies, comparisonRows),
    [comparisonRows, visibleCompanies],
  );

  const stats = useMemo(() => {
    const withLists = companies.filter((company) => company.hasPriceList).length;
    const spreads = comparisonRows.map((row) => row.spread ?? 0).filter((spread) => spread > 0);

    return {
      totalCompanies: companies.length,
      withPriceLists: withLists,
      comparedCompanies: visibleCompanies.length,
      comparedRows: comparisonRows.length,
      differentRows: insights.totalDifferentRows,
      averageSpread: spreads.length
        ? Math.round(spreads.reduce((sum, spread) => sum + spread, 0) / spreads.length)
        : 0,
      maxSpread: insights.maxSpread,
    };
  }, [companies, comparisonRows.length, insights.maxSpread, insights.totalDifferentRows, visibleCompanies.length]);

  const leaderCompany = insights.leader
    ? visibleCompanies.find((company) => company.id === insights.leader?.companyId)
    : null;

  const toggleCompany = (companyId: string) => {
    setSelectedCompanyIds((current) => (
      current.includes(companyId)
        ? current.filter((id) => id !== companyId)
        : [...current, companyId]
    ));
  };

  const selectAllCompanies = () => {
    const ids = companies
      .filter((company) => !onlyWithPriceLists || company.hasPriceList)
      .filter((company) => !destinationFilter || company.destinationLabel === destinationFilter)
      .map((company) => company.id);
    setSelectedCompanyIds(ids);
  };

  const clearCompanySelection = () => {
    setSelectedCompanyIds([]);
  };

  const handleExportCsv = () => {
    const vehicleLabel = vehicleTypes.find((type) => type.id === vehicleTypeId)?.label;

    if (viewMode === 'side-by-side') {
      const leftCompany = sideBySideCandidates.find((company) => company.id === sideBySideLeftId);
      const rightCompany = sideBySideCandidates.find((company) => company.id === sideBySideRightId);

      if (!leftCompany || !rightCompany || leftCompany.id === rightCompany.id) {
        toast.error('Select two different companies before exporting');
        return;
      }

      const rows = buildSideBySideRows(leftCompany, rightCompany, sideBySideRateType, {
        search,
        differencesOnly,
        stateCode: stateFilter,
        completeCoverageOnly,
        minSpread: Number(minSpread) > 0 ? Number(minSpread) : undefined,
        sortBy,
        vehicleMultiplier,
      });

      if (!rows.length) {
        toast.error('Nothing to export for the current comparison');
        return;
      }

      const csv = exportSideBySideCsv(leftCompany, rightCompany, rows, sideBySideRateType, { vehicleLabel });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `company-price-side-by-side-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Side-by-side comparison exported');
      return;
    }

    if (visibleCompanies.length < 2 || comparisonRows.length === 0) {
      toast.error('Nothing to export for the current comparison');
      return;
    }

    const csv = exportComparisonCsv(visibleCompanies, comparisonRows, viewMode, {
      referenceCompanyId: referenceCompanyId || undefined,
      vehicleLabel,
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `company-price-comparison-${viewMode}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Comparison exported');
  };

  const handleSwapSideBySideCompanies = () => {
    setSideBySideLeftId(sideBySideRightId);
    setSideBySideRightId(sideBySideLeftId);
  };

  return (
    <PermissionRoute permission="finance:view">
      <DashboardSurface>
        <Box sx={{ px: 2, pt: 2 }}>
          <Breadcrumbs />
        </Box>

        <DashboardPanel
          title="Company Price Comparison"
          description="Compare imported shipping rate sheets, spot the cheapest carrier, and export results"
          actions={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {viewMode === 'side-by-side' && (
                <Button variant="outline" icon={<ArrowLeftRight className="w-4 h-4" />} onClick={handleSwapSideBySideCompanies}>
                  Swap Companies
                </Button>
              )}
              <Button variant="outline" icon={<Download className="w-4 h-4" />} onClick={handleExportCsv}>
                Export CSV
              </Button>
              <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.push('/dashboard/finance')}>
                Finance
              </Button>
              <Button variant="outline" icon={<Building2 className="w-4 h-4" />} onClick={() => router.push('/dashboard/finance/companies')}>
                Company Ledgers
              </Button>
            </Box>
          }
        >
          <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-5 mb-4">
            <StatsCard icon={<GitCompareArrows className="w-5 h-5" />} title="Compared" value={stats.comparedCompanies} variant="default" />
            <StatsCard icon={<Building2 className="w-5 h-5" />} title="Rows Shown" value={stats.comparedRows} variant="info" />
            <StatsCard icon={<GitCompareArrows className="w-5 h-5" />} title="Different Rows" value={stats.differentRows} variant="warning" />
            <StatsCard icon={<GitCompareArrows className="w-5 h-5" />} title="Avg Spread" value={stats.averageSpread ? formatCurrency(stats.averageSpread) : '—'} variant="success" />
            <StatsCard icon={<Trophy className="w-5 h-5" />} title="Best Value Leader" value={leaderCompany?.name || '—'} variant="default" />
          </DashboardGrid>

          <CompanyPriceComparisonPresets
            currentConfig={currentPresetConfig}
            onApply={applyPresetConfig}
          />

          {viewMode !== 'side-by-side' && visibleCompanies.length >= 2 && comparisonRows.length > 0 && (
            <Box sx={{ display: 'grid', gap: 1.5, mb: 2, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.4fr) minmax(0, 1fr)' } }}>
              <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--panel)' }}>
                <Box sx={{ fontWeight: 700, mb: 1 }}>Company Scorecard</Box>
                <Box sx={{ display: 'grid', gap: 1 }}>
                  {scorecards.map((scorecard) => {
                    const company = visibleCompanies.find((item) => item.id === scorecard.companyId);
                    if (!company) return null;

                    return (
                      <Box
                        key={scorecard.companyId}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1fr) auto auto auto',
                          gap: 1.5,
                          alignItems: 'center',
                          p: 1,
                          borderRadius: 1.5,
                          border: scorecard.companyId === insights.leader?.companyId
                            ? '1px solid rgba(34, 197, 94, 0.35)'
                            : '1px solid transparent',
                          background: scorecard.companyId === insights.leader?.companyId
                            ? 'rgba(34, 197, 94, 0.08)'
                            : 'transparent',
                        }}
                      >
                        <Box>
                          <Box sx={{ fontWeight: 700 }}>{company.name}</Box>
                          <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{company.destinationLabel}</Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Box sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Wins</Box>
                          <Box sx={{ fontWeight: 700 }}>{scorecard.wins}</Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Box sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Coverage</Box>
                          <Box sx={{ fontWeight: 700 }}>{scorecard.coveragePercent}%</Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Box sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Avg Rate</Box>
                          <Box sx={{ fontWeight: 700 }}>{scorecard.averageRate ? formatCurrency(scorecard.averageRate) : '—'}</Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--panel)' }}>
                <Box sx={{ fontWeight: 700, mb: 1 }}>Biggest Price Gaps</Box>
                {insights.topSpreads.length > 0 ? insights.topSpreads.map((row) => (
                  <Box key={row.key} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.75, borderBottom: '1px solid var(--border)' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ fontWeight: 600, fontSize: '0.84rem' }}>{row.label}</Box>
                      <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {row.coverageCount}/{visibleCompanies.length} companies priced
                      </Box>
                    </Box>
                    <Box sx={{ fontWeight: 700, color: 'rgb(220, 38, 38)', whiteSpace: 'nowrap' }}>
                      {row.spread ? formatCurrency(row.spread) : '—'}
                    </Box>
                  </Box>
                )) : (
                  <Box sx={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>No price differences in the current view.</Box>
                )}
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'grid', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
              <TextField
                select
                size="small"
                label="Company Type"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as 'ALL' | 'SHIPPING' | 'DISPATCH' | 'TRANSIT')}
              >
                <MenuItem value="ALL">All Types</MenuItem>
                <MenuItem value="SHIPPING">Shipping</MenuItem>
                <MenuItem value="DISPATCH">Dispatch</MenuItem>
                <MenuItem value="TRANSIT">Transit</MenuItem>
              </TextField>
              <TextField
                size="small"
                label="Search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={viewMode === 'state' ? 'Search state code or name' : 'Search branch, city, or loading point'}
                InputProps={{
                  startAdornment: <Search className="w-4 h-4 mr-2 text-[var(--text-secondary)]" />,
                }}
              />
              <TextField
                select
                size="small"
                label="State Filter"
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value)}
              >
                <MenuItem value="">All States</MenuItem>
                {US_STATES.map((state) => (
                  <MenuItem key={state.code} value={state.code}>
                    {state.code} — {state.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Destination"
                value={destinationFilter}
                onChange={(event) => setDestinationFilter(event.target.value)}
              >
                <MenuItem value="">All Destinations</MenuItem>
                {destinationOptions.map((destination) => (
                  <MenuItem key={destination} value={destination}>
                    {destination}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
              <TextField
                select
                size="small"
                label="Vehicle Type"
                value={vehicleTypeId}
                onChange={(event) => setVehicleTypeId(event.target.value)}
              >
                {vehicleTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.label} ({type.multiplier}x)
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Reference Company"
                value={referenceCompanyId}
                onChange={(event) => setReferenceCompanyId(event.target.value)}
              >
                <MenuItem value="">No reference</MenuItem>
                {visibleCompanies.map((company) => (
                  <MenuItem key={company.id} value={company.id}>
                    {company.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Display"
                value={displayMode}
                onChange={(event) => setDisplayMode(event.target.value as DisplayMode)}
                disabled={!referenceCompanyId}
              >
                <MenuItem value="absolute">Absolute prices</MenuItem>
                <MenuItem value="delta">Delta vs reference</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label="Sort By"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as ComparisonSortKey)}
              >
                <MenuItem value="spread-desc">Largest spread first</MenuItem>
                <MenuItem value="spread-asc">Smallest spread first</MenuItem>
                <MenuItem value="label-asc">Name A → Z</MenuItem>
                <MenuItem value="label-desc">Name Z → A</MenuItem>
                <MenuItem value="coverage-desc">Best coverage first</MenuItem>
                <MenuItem value="coverage-asc">Lowest coverage first</MenuItem>
              </TextField>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '180px 1fr' }, gap: 1.5, alignItems: 'center' }}>
              <TextField
                size="small"
                type="number"
                label="Min Spread ($)"
                value={minSpread}
                onChange={(event) => setMinSpread(event.target.value)}
                inputProps={{ min: 0, step: 50 }}
              />
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <FormControlLabel
                  control={<Checkbox checked={differencesOnly} onChange={(event) => setDifferencesOnly(event.target.checked)} />}
                  label="Only rows with price differences"
                />
                <FormControlLabel
                  control={<Checkbox checked={onlyWithPriceLists} onChange={(event) => setOnlyWithPriceLists(event.target.checked)} />}
                  label="Only companies with uploaded price lists"
                />
                <FormControlLabel
                  control={<Checkbox checked={completeCoverageOnly} onChange={(event) => setCompleteCoverageOnly(event.target.checked)} />}
                  label="Only rows priced by every selected company"
                />
                <Button variant="outline" size="sm" onClick={selectAllCompanies}>Select All</Button>
                <Button variant="outline" size="sm" onClick={clearCompanySelection}>Clear Selection</Button>
              </Box>
            </Box>

            <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--panel)' }}>
              <Box sx={{ fontWeight: 700, mb: 1 }}>Companies to Compare</Box>
              {loading ? (
                <Box sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading companies...</Box>
              ) : companies.length === 0 ? (
                <Box sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No companies found for this filter.</Box>
              ) : (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {companies.map((company) => {
                    const selected = selectedCompanyIds.includes(company.id);
                    const disabled = onlyWithPriceLists && !company.hasPriceList;

                    return (
                      <Tooltip
                        key={company.id}
                        title={company.hasPriceList
                          ? `${company.destinationLabel}${company.activePriceList?.name ? ` • ${company.activePriceList.name}` : ''}${company.activePriceList?.createdAt ? ` • ${new Date(company.activePriceList.createdAt).toLocaleDateString()}` : ''}`
                          : 'No uploaded price list yet'}
                      >
                        <Box
                          component="button"
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleCompany(company.id)}
                          sx={{
                            border: selected ? '1px solid rgba(var(--accent-gold-rgb), 0.55)' : '1px solid var(--border)',
                            background: selected ? 'rgba(var(--accent-gold-rgb), 0.12)' : 'var(--background)',
                            color: disabled ? 'var(--text-secondary)' : 'var(--text-primary)',
                            borderRadius: 9999,
                            px: 1.25,
                            py: 0.6,
                            fontSize: '0.8rem',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.55 : 1,
                          }}
                        >
                          {company.name}
                          {!company.hasPriceList ? ' (no list)' : ''}
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              )}
            </Box>
          </Box>

          <Tabs value={viewMode} onChange={(_, value: ComparisonViewMode) => setViewMode(value)} sx={{ mb: 1 }}>
            <Tab value="state" label="Matrix: State Rates" />
            <Tab value="lane" label="Matrix: Branch / City" />
            <Tab value="side-by-side" label="Side by Side" />
          </Tabs>

          <Box sx={{ mb: 1.5, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {viewMode === 'side-by-side' ? (
              <>
                Side-by-side duel view across {sideBySideCandidates.length} available compan{sideBySideCandidates.length === 1 ? 'y' : 'ies'}.
              </>
            ) : (
              <>
                Showing {comparisonRows.length} {viewMode === 'state' ? 'state' : 'lane'} row{comparisonRows.length === 1 ? '' : 's'} across {visibleCompanies.length} selected compan{visibleCompanies.length === 1 ? 'y' : 'ies'}.
              </>
            )}
            {vehicleMultiplier !== 1 && (
              <Box component="span" sx={{ ml: 1 }}>
                Vehicle-adjusted at {vehicleMultiplier}x.
              </Box>
            )}
            <Box component="span" sx={{ ml: 1 }}>
              <Box component="span" sx={{ color: 'rgb(22, 163, 74)', fontWeight: 700 }}>Green</Box> = lowest,
              <Box component="span" sx={{ color: 'rgb(220, 38, 38)', fontWeight: 700, ml: 0.5 }}>Red</Box> = highest.
            </Box>
          </Box>

          {viewMode === 'side-by-side' ? (
            <CompanyPriceComparisonSideBySide
              companies={sideBySideCandidates}
              leftCompanyId={sideBySideLeftId}
              rightCompanyId={sideBySideRightId}
              rateType={sideBySideRateType}
              onLeftCompanyChange={setSideBySideLeftId}
              onRightCompanyChange={setSideBySideRightId}
              onRateTypeChange={setSideBySideRateType}
              search={search}
              stateFilter={stateFilter}
              differencesOnly={differencesOnly}
              completeCoverageOnly={completeCoverageOnly}
              minSpread={minSpread}
              sortBy={sortBy}
              vehicleMultiplier={vehicleMultiplier}
              formatCurrency={formatCurrency}
              formatSignedCurrency={formatSignedCurrency}
            />
          ) : visibleCompanies.length < 2 ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'var(--text-secondary)' }}>
              Select at least two companies to compare prices.
            </Box>
          ) : (
            <Box sx={{ border: '1px solid var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ maxHeight: 620, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '12px 14px', minWidth: 220, position: 'sticky', left: 0, background: 'var(--panel)', zIndex: 2 }}>
                        {viewMode === 'state' ? 'State' : 'Lane'}
                      </th>
                      {visibleCompanies.map((company) => (
                        <th key={company.id} style={{ textAlign: 'right', padding: '12px 14px', minWidth: 150 }}>
                          <Link href={`/dashboard/finance/companies/${company.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            <Box sx={{ fontWeight: 700 }}>{company.name}</Box>
                            <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                              {company.destinationLabel}
                            </Box>
                            {company.activePriceList?.sourceFileName && (
                              <Box sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                                {company.activePriceList.sourceFileName}
                              </Box>
                            )}
                          </Link>
                        </th>
                      ))}
                      <th style={{ textAlign: 'right', padding: '12px 14px', minWidth: 90 }}>Spread</th>
                      <th style={{ textAlign: 'center', padding: '12px 14px', minWidth: 80 }}>Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.length > 0 ? comparisonRows.map((row) => {
                      const comparableRates = Object.values(row.rates).filter((value): value is number => value !== null);
                      const hasMultipleRates = comparableRates.length > 1;
                      const referenceRate = referenceCompanyId ? row.rates[referenceCompanyId] ?? null : undefined;

                      return (
                        <tr key={row.key} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 14px', position: 'sticky', left: 0, background: 'var(--background)', zIndex: 1 }}>
                            <Box sx={{ fontWeight: 700 }}>{row.label}</Box>
                            {viewMode === 'lane' && (
                              <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{row.stateCode}</Box>
                            )}
                          </td>
                          {visibleCompanies.map((company) => (
                            <td key={`${row.key}-${company.id}`} style={{ padding: '10px 14px', textAlign: 'right' }}>
                              <RateCell
                                value={row.rates[company.id] ?? null}
                                minRate={row.minRate}
                                maxRate={row.maxRate}
                                hasMultipleRates={hasMultipleRates}
                                referenceRate={referenceRate}
                                displayMode={displayMode}
                              />
                            </td>
                          ))}
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: (row.spread ?? 0) > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {row.spread ? formatCurrency(row.spread) : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', color: row.coverageCount < visibleCompanies.length ? 'rgb(234, 179, 8)' : 'var(--text-secondary)', fontWeight: row.coverageCount < visibleCompanies.length ? 700 : 500 }}>
                            {row.coverageCount}/{visibleCompanies.length}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={visibleCompanies.length + 3} style={{ padding: '18px 14px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No matching rows to compare. Try changing filters or upload price lists on company ledger pages.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Box>
            </Box>
          )}
        </DashboardPanel>
      </DashboardSurface>
    </PermissionRoute>
  );
}