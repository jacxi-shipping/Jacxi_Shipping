'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Bot, RefreshCcw, Search as SearchIcon, ShieldCheck } from 'lucide-react';
import { Breadcrumbs, Button, EmptyState, LoadingState, StatsCard, StatusBadge, toast } from '@/components/design-system';
import { DashboardGrid, DashboardPanel, DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { hasPermission } from '@/lib/rbac';

type AiLog = {
  id: string;
  feature: string;
  entityType: string | null;
  entityId: string | null;
  actorUserId: string | null;
  provider: string;
  model: string | null;
  prompt: string;
  response: string | null;
  requestPayload: unknown;
  responsePayload: unknown;
  status: string;
  createdAt: string;
};

const truncateText = (value: string | null | undefined, length: number) => {
  if (!value) return 'N/A';
  return value.length > length ? `${value.slice(0, length)}...` : value;
};

export default function AiLogsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feature, setFeature] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [selectedLog, setSelectedLog] = useState<AiLog | null>(null);

  const canViewAiLogs = hasPermission(session?.user?.role, 'shipments:read_all');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (feature.trim()) params.set('feature', feature.trim());
      if (entityType.trim()) params.set('entityType', entityType.trim());
      if (entityId.trim()) params.set('entityId', entityId.trim());
      params.set('limit', '100');

      const response = await fetch(`/api/ai/logs?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load AI logs');
      }
      setLogs(payload.logs || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load AI logs');
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, feature]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !canViewAiLogs) {
      router.replace('/dashboard');
      return;
    }
    void fetchLogs();
  }, [canViewAiLogs, fetchLogs, router, session, status]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchLogs();
    } finally {
      setRefreshing(false);
    }
  };

  const stats = useMemo(() => {
    const digitalOceanCount = logs.filter((log) => log.provider === 'digitalocean-ai').length;
    const fallbackCount = logs.filter((log) => log.provider !== 'digitalocean-ai').length;
    const failedCount = logs.filter((log) => log.status !== 'SUCCESS').length;

    return {
      total: logs.length,
      digitalOceanCount,
      fallbackCount,
      failedCount,
    };
  }, [logs]);

  if (status === 'loading' || loading) {
    return <LoadingState fullScreen message="Loading AI logs..." />;
  }

  return (
    <DashboardSurface>
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'AI Logs' }]} />

      <DashboardPanel
        title="AI Interaction Logs"
        description="Browse prompt and response traces for dashboard briefs, shipment drafts, and extraction workflows."
        actions={
          <Button variant="secondary" size="sm" onClick={handleRefresh} icon={<RefreshCcw className="w-4 h-4" />} loading={refreshing}>
            Refresh
          </Button>
        }
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2, mb: 3 }}>
          <TextField
            size="small"
            label="Feature"
            value={feature}
            onChange={(event) => setFeature(event.target.value)}
            placeholder="shipment-customer-update-draft"
          />
          <TextField
            size="small"
            label="Entity Type"
            select
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="SHIPMENT">Shipment</MenuItem>
            <MenuItem value="CONTAINER">Container</MenuItem>
            <MenuItem value="DOCUMENT">Document</MenuItem>
          </TextField>
          <TextField
            size="small"
            label="Entity ID"
            value={entityId}
            onChange={(event) => setEntityId(event.target.value)}
            placeholder="Filter by exact entity id"
            InputProps={{
              startAdornment: <SearchIcon className="mr-2 h-4 w-4 text-[var(--text-secondary)]" />,
            }}
          />
        </Box>

        <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Total Logs" value={stats.total} icon={<Bot className="w-5 h-5" />} variant="default" />
          <StatsCard title="DigitalOcean AI" value={stats.digitalOceanCount} icon={<ShieldCheck className="w-5 h-5" />} variant="success" />
          <StatsCard title="Fallback Runs" value={stats.fallbackCount} icon={<Bot className="w-5 h-5" />} variant="warning" />
          <StatsCard title="Non-Success Status" value={stats.failedCount} icon={<ShieldCheck className="w-5 h-5" />} variant="error" />
        </DashboardGrid>
      </DashboardPanel>

      <DashboardPanel title="Recent AI Activity" description="Latest 100 persisted interactions">
        {logs.length === 0 ? (
          <EmptyState
            icon={<Bot className="w-8 h-8" />}
            title="No AI logs found"
            description="Run an AI dashboard brief, shipment draft, or extraction flow to populate this page."
          />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Feature</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Prompt</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{log.feature}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.model || 'N/A'}</Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={log.status === 'SUCCESS' ? 'success' : log.status === 'FALLBACK' ? 'warning' : 'error'}
                      />
                    </TableCell>
                    <TableCell>{log.provider}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.8rem' }}>{log.entityType || 'N/A'}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{truncateText(log.entityId, 18)}</Typography>
                    </TableCell>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{truncateText(log.prompt, 90)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DashboardPanel>

      <Dialog open={Boolean(selectedLog)} onClose={() => setSelectedLog(null)} maxWidth="md" fullWidth>
        <DialogTitle>AI Log Details</DialogTitle>
        <DialogContent dividers>
          {selectedLog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Feature</Typography>
                <Typography>{selectedLog.feature}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Prompt</Typography>
                <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', p: 2, bgcolor: 'var(--background)', borderRadius: 2, border: '1px solid var(--border)' }}>
                  {selectedLog.prompt}
                </Box>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Response</Typography>
                <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', p: 2, bgcolor: 'var(--background)', borderRadius: 2, border: '1px solid var(--border)' }}>
                  {selectedLog.response || 'N/A'}
                </Box>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Request Payload</Typography>
                <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', p: 2, bgcolor: 'var(--background)', borderRadius: 2, border: '1px solid var(--border)' }}>
                  {JSON.stringify(selectedLog.requestPayload, null, 2)}
                </Box>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Response Payload</Typography>
                <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', p: 2, bgcolor: 'var(--background)', borderRadius: 2, border: '1px solid var(--border)' }}>
                  {JSON.stringify(selectedLog.responsePayload, null, 2)}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outline" onClick={() => setSelectedLog(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardSurface>
  );
}